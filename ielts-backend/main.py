import os
import re
import json
import random
import logging
from typing import Optional, List, Dict, Any
import httpx
import nh3
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ielts_examiner")

app = FastAPI(title="IELTS Academic AI Examiner API", version="2.0.0")

# ─── CORS ────────────────────────────────────────────────────────────────────
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Gemini REST config ───────────────────────────────────────────────────────
GEMINI_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
]
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

QUESTION_TYPES_TASK2 = [
    "agree_disagree",
    "discuss_both",
    "problem_solution",
    "advantages_disadvantages",
    "two_part",
]

TOPICS_TASK2 = [
    "technology and society", "environment and climate change", "education systems",
    "health and medicine", "urbanisation", "work and employment", "globalisation",
    "media and social media", "family and children", "transportation",
    "government and policy", "crime and justice", "arts and culture",
    "science and innovation", "sport and leisure",
]

REAL_COUNTRIES = [
    "Australia", "Canada", "Germany", "Japan", "United Kingdom",
    "United States", "France", "New Zealand", "South Korea", "Sweden",
    "Italy", "Spain", "Brazil", "India", "Norway", "Netherlands"
]

def sanitize_pseudo_names(text: str) -> str:
    """Replaces generic pseudo names like 'Country A', 'Country B' with authentic country names."""
    if not text:
        return text
    def _sub_country(match):
        code = match.group(1).upper()
        if len(code) == 1 and code.isalpha():
            idx = ord(code) - ord('A')
            return REAL_COUNTRIES[idx % len(REAL_COUNTRIES)]
        return match.group(0)

    res = re.sub(r"(?i)\bcountry\s+([a-z])\b", _sub_country, text)
    res = re.sub(r"(?i)\bnation\s+([a-z])\b", _sub_country, res)
    return res

# ─── Sanitization & Security ──────────────────────────────────────────────────
PROMPT_INJECTION_PATTERNS = [
    r"(?i)ignore\s+(all\s+)?(previous|prior|above)\s+instructions?",
    r"(?i)disregard\s+(all\s+)?(previous|prior|above)\s+instructions?",
    r"(?i)system\s+prompt",
    r"(?i)jailbreak",
    r"(?i)you\s+are\s+now\s+(an?\s+)?unrestricted",
    r"(?i)forget\s+everything\s+(you\s+know|above)",
    r"(?i)roleplay\s+as\s+an?\s+unfiltered",
    r"(?i)dan\s+mode",
]


def sanitize_user_input(text: str, max_length: int = 6000) -> str:
    """Strips HTML tags using nh3, enforces length limits, and guards against prompt injection."""
    if not text:
        return ""
    # Strip HTML tags completely
    cleaned = nh3.clean(text, tags=set()).strip()
    if len(cleaned) > max_length:
        cleaned = cleaned[:max_length]

    # Check for adversarial injection patterns
    for pattern in PROMPT_INJECTION_PATTERNS:
        if re.search(pattern, cleaned):
            logger.warning(f"Adversarial prompt injection pattern triggered: {pattern}")
            raise HTTPException(
                status_code=400,
                detail="Security validation error: disallowed instructions or prompt manipulation detected."
            )
    return cleaned


# ─── Global Exception Handlers ────────────────────────────────────────────────
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Pass-through for expected HTTP errors with sanitized messaging."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "ClientError" if exc.status_code < 500 else "EvaluationServiceUnavailable",
            "message": str(exc.detail),
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all for internal unexpected errors to prevent exposing stack traces."""
    logger.error(f"Internal server error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "EvaluationServiceUnavailable",
            "message": "Our AI examiner is currently experiencing high demand. Please try again in a moment.",
        },
    )


def _has_real_key() -> bool:
    key = os.getenv("GEMINI_API_KEY", "")
    return bool(key) and "your-gemini-api-key" not in key


async def _call_gemini(prompt: str, system: str, temperature: float = 0.4) -> str:
    """Call Gemini REST API with model fallback. Returns raw JSON string."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="No Gemini API key configured.")

    payload = {
        "system_instruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "responseMimeType": "application/json",
        },
    }

    last_error = "All Gemini models unavailable."
    async with httpx.AsyncClient(timeout=120.0) as client:
        for model in GEMINI_MODELS:
            url = f"{GEMINI_BASE_URL}/{model}:generateContent"
            try:
                resp = await client.post(url, params={"key": api_key}, json=payload)
                if resp.status_code == 200:
                    logger.info(f"✅ Successfully used model: {model}")
                    body = resp.json()
                    candidates = body.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            return parts[0]["text"]
                    logger.warning(f"Unexpected body format from {model}: {body}")
                else:
                    err_json = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                    last_error = err_json.get("error", {}).get("message", resp.text)
                    logger.warning(f"{model} -> {resp.status_code}: {last_error[:120]}")
                    # Continue attempting remaining models in fallback chain
                    continue
            except httpx.RequestError as req_err:
                logger.warning(f"Connection error to {model}: {req_err}")
                last_error = str(req_err)
                continue

    logger.error(f"Exhausted all Gemini models without success. Last error: {last_error}")
    raise HTTPException(
        status_code=503,
        detail="Our AI examiner is currently experiencing high demand. Please wait a few moments and try submitting again."
    )


# ─── Pydantic Models ─────────────────────────────────────────────────────────
class CriterionScore(BaseModel):
    score: float = Field(..., ge=0, le=9)
    reason: str = Field(..., description="2 to 4 sentence explanation based on official descriptors with specific evidence")


class SubScores(BaseModel):
    task_achievement: CriterionScore
    coherence_and_cohesion: CriterionScore
    lexical_resource: CriterionScore
    grammatical_range_and_accuracy: CriterionScore


class LineCorrection(BaseModel):
    original: str
    corrected: str
    explanation: str
    category: str


class GradingResult(BaseModel):
    model_config = {"protected_namespaces": ()}
    overall_band: float = Field(..., ge=0, le=9)
    sub_scores: SubScores
    line_by_line_corrections: List[LineCorrection]
    examiner_summary: str
    is_mock: bool = False
    model_answer: str = Field("", description="Band 9 model answer for the same question")


class EssayRequest(BaseModel):
    essay_text: str = Field("", description="The IELTS Task 2 question being answered")
    question: str = Field("", description="The IELTS Task 2 question being answered")


class ChartSeries(BaseModel):
    name: str
    data: List[float]


class ChartData(BaseModel):
    chart_type: str = Field(..., description="'bar' | 'line' | 'pie' | 'table'")
    title: str
    x_axis_label: str = ""
    y_axis_label: str = ""
    categories: List[str]
    series: List[ChartSeries]


class Task1QuestionResponse(BaseModel):
    prompt: str
    chart_data: ChartData
    is_mock: bool = False


class Task1GradeRequest(BaseModel):
    essay_text: str = Field("", description="The IELTS Task 1 candidate response")
    question: str
    chart_data: ChartData


class QuestionResponse(BaseModel):
    question: str
    type: str
    topic: str
    is_mock: bool = False


class ValidateQuestionRequest(BaseModel):
    question: str
    task_type: str = Field("task2", description="'task1' | 'task2'")


class ValidateQuestionResponse(BaseModel):
    is_valid: bool
    formatted_question: str
    feedback: str


# ─── Mock Data Pools ──────────────────────────────────────────────────────────
MOCK_TASK2_QUESTIONS: List[QuestionResponse] = [
    QuestionResponse(
        question=(
            "Some people believe that governments should invest more in public transport "
            "rather than in building new roads. To what extent do you agree or disagree?\n\n"
            "Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words."
        ),
        type="agree_disagree",
        topic="transportation",
        is_mock=True,
    ),
    QuestionResponse(
        question=(
            "Some people think that universities should provide graduates with the knowledge and skills needed in the workplace. "
            "Others think that the true function of a university should be to give access to knowledge for its own sake, regardless of whether the course is useful to an employer.\n\n"
            "Discuss both views and give your own opinion. Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words."
        ),
        type="discuss_both",
        topic="education systems",
        is_mock=True,
    ),
    QuestionResponse(
        question=(
            "In many modern cities, rapid urbanisation has led to severe air pollution and chronic traffic congestion. "
            "What are the primary causes of this problem, and what practical measures can municipal authorities implement to tackle it?\n\n"
            "Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words."
        ),
        type="problem_solution",
        topic="urbanisation",
        is_mock=True,
    ),
    QuestionResponse(
        question=(
            "An increasing number of employees now work remotely from home rather than in a traditional physical office. "
            "Do the advantages of this development outweigh the disadvantages?\n\n"
            "Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words."
        ),
        type="advantages_disadvantages",
        topic="work and employment",
        is_mock=True,
    ),
    QuestionResponse(
        question=(
            "Fewer young people today choose to read printed books for pleasure, spending the majority of their leisure hours on digital devices. "
            "Why is this the case? Is this a positive or negative development?\n\n"
            "Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words."
        ),
        type="two_part",
        topic="media and social media",
        is_mock=True,
    ),
]

MOCK_TASK1_QUESTIONS: List[Task1QuestionResponse] = [
    Task1QuestionResponse(
        prompt=(
            "The bar chart below shows the percentage of electricity generated from renewable sources in four European countries between 2010 and 2020.\n\n"
            "Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words."
        ),
        chart_data=ChartData(
            chart_type="bar",
            title="Electricity Generated from Renewable Sources (2010–2020)",
            x_axis_label="Country",
            y_axis_label="Percentage of Total Electricity (%)",
            categories=["Germany", "Denmark", "Spain", "United Kingdom"],
            series=[
                ChartSeries(name="2010", data=[17.4, 32.8, 27.8, 6.9]),
                ChartSeries(name="2015", data=[29.2, 51.3, 35.2, 22.4]),
                ChartSeries(name="2020", data=[45.1, 65.4, 44.0, 40.3]),
            ]
        ),
        is_mock=True,
    ),
    Task1QuestionResponse(
        prompt=(
            "The line graph below shows the percentage of households with internet access in four nations between 2000 and 2020.\n\n"
            "Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words."
        ),
        chart_data=ChartData(
            chart_type="line",
            title="Percentage of Households with Internet Access (2000–2020)",
            x_axis_label="Year",
            y_axis_label="Percentage (%)",
            categories=["2000", "2005", "2010", "2015", "2020"],
            series=[
                ChartSeries(name="United States", data=[41.5, 68.6, 75.3, 84.1, 91.8]),
                ChartSeries(name="Japan", data=[37.1, 57.0, 78.2, 83.0, 89.4]),
                ChartSeries(name="Australia", data=[34.0, 56.4, 72.5, 80.2, 86.1]),
                ChartSeries(name="Germany", data=[28.2, 54.0, 82.1, 88.0, 93.5]),
            ]
        ),
        is_mock=True,
    ),
    Task1QuestionResponse(
        prompt=(
            "The pie chart below shows the main causes of global agricultural land degradation in the 1990s.\n\n"
            "Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words."
        ),
        chart_data=ChartData(
            chart_type="pie",
            title="Causes of Global Agricultural Land Degradation in the 1990s",
            x_axis_label="Causes",
            y_axis_label="Percentage (%)",
            categories=["Over-grazing", "Deforestation", "Over-cultivation", "Other"],
            series=[
                ChartSeries(name="1990s", data=[35.0, 30.0, 28.0, 7.0]),
            ]
        ),
        is_mock=True,
    ),
    Task1QuestionResponse(
        prompt=(
            "The two pie charts below show the past and current percentages of household energy consumption by end use in Canada in 2004 and 2024.\n\n"
            "Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words."
        ),
        chart_data=ChartData(
            chart_type="pie",
            title="Household Energy Consumption by End Use in Canada (2004 vs 2024)",
            x_axis_label="End Use",
            y_axis_label="Percentage (%)",
            categories=["Space Heating", "Water Heating", "Appliances", "Lighting", "Cooling"],
            series=[
                ChartSeries(name="2004", data=[60.0, 18.0, 12.0, 6.0, 4.0]),
                ChartSeries(name="2024", data=[48.0, 20.0, 17.0, 5.0, 10.0]),
            ]
        ),
        is_mock=True,
    ),
    Task1QuestionResponse(
        prompt=(
            "The diagram below illustrates the stages in the industrial recycling process of plastic beverage bottles.\n\n"
            "Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words."
        ),
        chart_data=ChartData(
            chart_type="process",
            title="Industrial Recycling Process of Plastic Beverage Bottles",
            x_axis_label="Stages",
            y_axis_label="Flow",
            categories=[
                "1. Collection & Kerbside Sorting",
                "2. High-Pressure Washing & Sterilisation",
                "3. Mechanical Shredding into Flakes",
                "4. Thermal Melting & Pelletising",
                "5. Extrusion & Blow Moulding into New Bottles"
            ],
            series=[
                ChartSeries(name="Process Stages", data=[1.0, 2.0, 3.0, 4.0, 5.0]),
            ]
        ),
        is_mock=True,
    ),
    Task1QuestionResponse(
        prompt=(
            "The maps below show the development of the coastal town of Harborne between 1995 and 2025.\n\n"
            "Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words."
        ),
        chart_data=ChartData(
            chart_type="map",
            title="Urban Development of the Coastal Town of Harborne (1995 vs 2025)",
            x_axis_label="Districts",
            y_axis_label="Infrastructure",
            categories=[
                "Commercial Harbour & Marina",
                "Residential Housing Zone",
                "Central High Street & Retail",
                "Protected Coastal Woodland",
                "Light Industrial & Tech Park"
            ],
            series=[
                ChartSeries(name="1995 (Original Layout)", data=[15.0, 30.0, 20.0, 35.0, 0.0]),
                ChartSeries(name="2025 (Modernised Layout)", data=[25.0, 40.0, 15.0, 10.0, 10.0]),
            ]
        ),
        is_mock=True,
    ),
    Task1QuestionResponse(
        prompt=(
            "The table below gives information regarding public library membership and annual loans across four Canadian cities in 2023.\n\n"
            "Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words."
        ),
        chart_data=ChartData(
            chart_type="table",
            title="Public Library Usage and Annual Loans across Canadian Cities (2023)",
            x_axis_label="City",
            y_axis_label="Figures",
            categories=["Toronto", "Vancouver", "Montreal", "Calgary"],
            series=[
                ChartSeries(name="Active Members (000s)", data=[1120.0, 480.0, 690.0, 370.0]),
                ChartSeries(name="Digital Book Loans (Millions)", data=[9.8, 5.2, 4.4, 3.6]),
                ChartSeries(name="Physical Loans (Millions)", data=[18.4, 7.6, 9.1, 5.8]),
            ]
        ),
        is_mock=True,
    ),
]

MOCK_QUESTION = MOCK_TASK2_QUESTIONS[0]
MOCK_TASK1_QUESTION = MOCK_TASK1_QUESTIONS[0]

MOCK_GRADING = GradingResult(
    overall_band=6.5,
    is_mock=True,
    examiner_summary=(
        "⚠️ DEMO MODE — This is a simulated evaluation. The candidate presents a relevant position throughout, "
        "though key supporting ideas require further development. Grammatical structures show fair variety but are "
        "occasionally constrained by punctuation errors and minor lexical collocations."
    ),
    model_answer=(
        "In recent decades, the question of whether municipal and national authorities should prioritise public transit "
        "or highway infrastructure has ignited vigorous debate among urban planners. While road expansion is frequently "
        "advocated to facilitate commercial freight, I am firmly convinced that strategic investment in public transportation "
        "delivers far superior socioeconomic and ecological returns.\n\n"
        "To begin with, high-capacity mass transit systems offer the only sustainable antidote to chronic traffic congestion. "
        "Empirical evidence from metropolises such as Tokyo and Zurich demonstrates that robust subterranean metro networks "
        "can transport millions with minimal spatial consumption. Conversely, constructing additional road lanes invariably "
        "triggers induced demand, swiftly eroding any temporary alleviation of congestion.\n\n"
        "Furthermore, modern transit networks are indispensable for social mobility and environmental mitigation. Subsidised "
        "bus rapid transit and electrified commuter rail ensure that lower-income households retain unhindered access to "
        "employment centres without incurring private vehicle expenditures. Simultaneously, replacing private automobile trips "
        "with electric transit dramatically curtails greenhouse gas emissions and urban particulate smog.\n\n"
        "In conclusion, while rudimentary road maintenance remains necessary, public expenditure should unequivocally concentrate "
        "on expansive, dependable transit systems. Governments must envision long-term sustainability rather than pursuing "
        "short-term highway expansions."
    ),
    sub_scores=SubScores(
        task_achievement=CriterionScore(
            score=6.5,
            reason="Addresses all parts of the task with a clear position throughout. However, some secondary claims lack concrete examples, preventing a higher Band 7 award."
        ),
        coherence_and_cohesion=CriterionScore(
            score=6.5,
            reason="Information is arranged coherently with clear overall progression. Paragraphing is logical, though mechanical linkers ('Furthermore', 'In conclusion') are slightly over-relied upon."
        ),
        lexical_resource=CriterionScore(
            score=7.0,
            reason="Uses a sufficient range of less common lexical items such as 'chronic traffic congestion' and 'induced demand'. Occasional minor collocation slips do not impede communication."
        ),
        grammatical_range_and_accuracy=CriterionScore(
            score=6.0,
            reason="Employs a mix of simple and complex sentence forms. Several minor errors in punctuation and clause coordination persist, keeping this criterion at Band 6."
        ),
    ),
    line_by_line_corrections=[
        LineCorrection(
            original="People is believing that public transport is good.",
            corrected="It is widely believed that public transport provides substantial benefits.",
            explanation="Subject-verb agreement error with 'people' and informal phrasing. Use an impersonal passive construction for formal academic register.",
            category="grammar",
        ),
        LineCorrection(
            original="Building more roads can make more traffic in the end.",
            corrected="Expanding road networks induces latent traffic demand over time.",
            explanation="Phrasing is colloquial. 'Induces latent traffic demand' conveys the precise urban planning concept expected at Band 7+.",
            category="vocabulary",
        ),
        LineCorrection(
            original="On the other hand public transport save environment.",
            corrected="Conversely, public transport significantly mitigates environmental degradation.",
            explanation="Missing comma after transitional device, subject-verb disagreement with 'save', and vague expression 'save environment'.",
            category="coherence",
        ),
    ],
)

MOCK_TASK1_GRADING = GradingResult(
    overall_band=7.0,
    is_mock=True,
    examiner_summary=(
        "⚠️ DEMO MODE — This is a simulated Task 1 evaluation. The response provides a clear overview "
        "highlighting overall upward trends across all four nations. Key data points are accurately reported, "
        "though comparisons between intermediate years could be more tightly grouped."
    ),
    model_answer=(
        "The bar chart illustrates the proportion of electricity produced from renewable energy sources in four European nations—Germany, Denmark, Spain, and the UK—between 2010 and 2020.\n\n"
        "Overall, all four countries experienced substantial growth in renewable electricity generation over the ten-year period. Denmark consistently led throughout, while the UK demonstrated the most dramatic relative expansion despite starting from the lowest base.\n\n"
        "In 2010, Denmark generated approximately 32.8% of its electricity from renewable sources, followed by Spain at 27.8% and Germany at 17.4%. The UK lagged significantly behind at just 6.9%. Over the next five years, all nations recorded notable gains, with Denmark surging past the 50% threshold to reach 51.3% by 2015.\n\n"
        "By 2020, Denmark solidified its dominance with nearly two-thirds (65.4%) of its electricity derived from renewables. Germany and Spain followed closely at 45.1% and 44.0% respectively. Most notably, the UK increased its renewable share nearly sixfold to 40.3%, nearly matching Spain's figure."
    ),
    sub_scores=SubScores(
        task_achievement=CriterionScore(
            score=7.0,
            reason="Presents a clear overview highlighting general upward trends and country rankings. Key data figures from the chart are accurately cited without major distortion."
        ),
        coherence_and_cohesion=CriterionScore(
            score=7.0,
            reason="Information is logically sequenced by initial standings and terminal comparisons. Paragraphing is well-managed with appropriate cohesive markers."
        ),
        lexical_resource=CriterionScore(
            score=7.0,
            reason="Utilizes an effective range of data-interpretation vocabulary ('substantial growth', 'lagged significantly', 'solidified its dominance') with minimal error."
        ),
        grammatical_range_and_accuracy=CriterionScore(
            score=7.0,
            reason="Demonstrates good control of complex sentence structures, comparative clauses, and passive constructions throughout."
        ),
    ),
    line_by_line_corrections=[
        LineCorrection(
            original="Denmark was have the most high percentage.",
            corrected="Denmark maintained the highest proportion throughout the period.",
            explanation="Double verb error ('was have') and incorrect superlative form ('most high' instead of 'highest').",
            category="grammar",
        ),
        LineCorrection(
            original="The UK increased very fast from 6.9 to 40.3.",
            corrected="The UK experienced a dramatic expansion, surging from 6.9% to 40.3%.",
            explanation="'Increased very fast' is colloquial. Use precise academic verbs like 'surged' or 'experienced a dramatic expansion'.",
            category="vocabulary",
        ),
        LineCorrection(
            original="Overall there is a growth.",
            corrected="Overall, an upward trajectory was evident across all observed nations.",
            explanation="The overview is overly simplistic. Academic Task 1 requires identifying overarching trends and relative differences.",
            category="task_achievement",
        ),
    ],
)

ZERO_GRADING_TASK1 = GradingResult(
    overall_band=0.0,
    is_mock=False,
    examiner_summary="No response was submitted for Task 1. Under official Cambridge IELTS examination regulations, an unattempted task receives Band 0.0.",
    model_answer=MOCK_TASK1_GRADING.model_answer,
    sub_scores=SubScores(
        task_achievement=CriterionScore(score=0.0, reason="Task not attempted. Candidate did not write any response."),
        coherence_and_cohesion=CriterionScore(score=0.0, reason="No text provided to assess organization or paragraphing."),
        lexical_resource=CriterionScore(score=0.0, reason="No vocabulary demonstrated."),
        grammatical_range_and_accuracy=CriterionScore(score=0.0, reason="No sentence structures produced."),
    ),
    line_by_line_corrections=[],
)

ZERO_GRADING_TASK2 = GradingResult(
    overall_band=0.0,
    is_mock=False,
    examiner_summary="No response was submitted for Task 2. Under official Cambridge IELTS examination regulations, an unattempted task receives Band 0.0.",
    model_answer=MOCK_GRADING.model_answer,
    sub_scores=SubScores(
        task_achievement=CriterionScore(score=0.0, reason="Task not attempted. Candidate did not write any response."),
        coherence_and_cohesion=CriterionScore(score=0.0, reason="No text provided to assess organization or paragraphing."),
        lexical_resource=CriterionScore(score=0.0, reason="No vocabulary demonstrated."),
        grammatical_range_and_accuracy=CriterionScore(score=0.0, reason="No sentence structures produced."),
    ),
    line_by_line_corrections=[],
)



# ─── Prompts ──────────────────────────────────────────────────────────────────
QUESTION_TASK2_SYSTEM = """You are an official Cambridge IELTS Senior Examiner.
Generate an authentic, thought-provoking IELTS Academic Writing Task 2 question.
Strictly adhere to official Cambridge conventions:
1. Context/premise statement (1-2 sentences).
2. The specific instruction (e.g. 'To what extent do you agree or disagree?' or 'Discuss both views and give your own opinion.').
3. End with the official instruction: 'Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.'

Respond ONLY with a valid JSON object — no markdown fences:
{
  "question": "<Complete authentic Task 2 prompt>",
  "type": "<one of: agree_disagree | discuss_both | problem_solution | advantages_disadvantages | two_part>",
  "topic": "<topic category>",
  "is_mock": false
}"""

QUESTION_TASK1_SYSTEM = """You are an official Cambridge IELTS Senior Examiner.
Generate an authentic Academic Writing Task 1 prompt with structured visual data.
The visual must represent one of the official IELTS Academic Task 1 graphic types:
- 'bar': comparative bar chart with real-world categories and series.
- 'line': chronological line graph showing trends over time.
- 'pie': single pie chart (1 distribution) OR two comparative pie charts (e.g. past vs current percentages).
- 'table': comparative data table with categories and multiple metrics.
- 'process': sequential flow diagram (e.g. industrial manufacturing, recycling cycle, natural life cycle).
- 'map': comparative map or plan diagram showing changes to an area or facility between two periods.

CRITICAL RULES:
1. NEVER use generic placeholder or pseudo names such as 'Country A', 'Country B', 'Country C', 'City X', 'Company 1', or 'Person A'. You MUST use authentic real-world entities (e.g. 'United States', 'United Kingdom', 'Germany', 'Australia', 'Japan', 'Canada', 'France', 'Brazil', 'India').
2. The prompt must introduce the graphic clearly:
   - For comparative pie charts: 'The two pie charts below show the past and current percentages of [topic] in [Year 1] and [Year 2]...' Provide exactly TWO series in 'series' (one for each pie chart, both summing to 100%).
   - For a single pie chart: 'The pie chart below shows [topic] in [Year/Location]...' Provide exactly ONE series in 'series' summing to 100%.
   - For process diagrams: 'The diagram below illustrates the stages in the process of [topic]...' Provide 4-6 sequential stages in 'categories' and stage details in 'series'.
   - For maps: 'The two maps below show the development of [Location] between [Year 1] and [Year 2]...' Provide location zones in 'categories' and period features in 'series'.
   - For bar/line/table: Provide authentic topic, real entities, and data.
3. Standard rubric: 'Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.'

Respond ONLY with a valid JSON object — no markdown fences:
{
  "prompt": "<Full Task 1 prompt text including instructions>",
  "chart_data": {
    "chart_type": "<bar | line | pie | table | process | map>",
    "title": "<Concise descriptive title of graphic>",
    "x_axis_label": "<Label for X axis or categories>",
    "y_axis_label": "<Label for Y axis with units>",
    "categories": ["Cat1", "Cat2", "Cat3", "Cat4"],
    "series": [
      {
        "name": "Series Name",
        "data": [35.0, 25.0, 20.0, 20.0]
      }
    ]
  },
  "is_mock": false
}"""

GRADING_TASK2_SYSTEM = """You are an uncompromising Cambridge IELTS Examiner.
The global average score is 5.5. Do NOT inflate scores. Band 7.0 requires precise academic language without forced, unnatural 'fancy' templates or memorized idioms.
Grade the student's essay strictly against the question provided, using the official IELTS public band descriptors.

For each of the 4 criteria:
- Task Achievement (TA): Did the writer fully address all parts with a clear, developed position and relevant examples?
- Coherence & Cohesion (CC): Clear paragraphing, logical progression, natural linking devices (penalize mechanical connectors like 'Furthermore, Moreover, In a nutshell').
- Lexical Resource (LR): Precise academic vocabulary, natural collocations, minimal spelling slips.
- Grammatical Range & Accuracy (GRA): Range of complex structures with high proportion of error-free sentences.

For each criterion, you MUST output a 2 to 4 sentence `reason` explaining exactly why this score was awarded based on the official IELTS band descriptors, citing specific textual evidence.

Respond ONLY with a valid JSON object — no markdown fences:
{
  "overall_band": <float 0-9, average of 4 sub-scores rounded to nearest 0.5>,
  "is_mock": false,
  "sub_scores": {
    "task_achievement": {
      "score": <float 0-9>,
      "reason": "<2-4 sentences explaining the score based on descriptors and student text evidence>"
    },
    "coherence_and_cohesion": {
      "score": <float 0-9>,
      "reason": "<2-4 sentences explaining the score based on descriptors and student text evidence>"
    },
    "lexical_resource": {
      "score": <float 0-9>,
      "reason": "<2-4 sentences explaining the score based on descriptors and student text evidence>"
    },
    "grammatical_range_and_accuracy": {
      "score": <float 0-9>,
      "reason": "<2-4 sentences explaining the score based on descriptors and student text evidence>"
    }
  },
  "examiner_summary": "<3 sentences of incisive feedback summarising the main strengths and weaknesses>",
  "model_answer": "<Flawless Band 9 model essay addressing THIS EXACT question. 260-310 words with \\n\\n paragraph breaks.>",
  "line_by_line_corrections": [
    {
      "original": "<exact phrase from student essay>",
      "corrected": "<improved academic version>",
      "explanation": "<specific reason for correction>",
      "category": "<grammar | vocabulary | coherence | task_achievement>"
    }
  ]
}
Provide 4-8 line-by-line corrections."""

GRADING_TASK1_SYSTEM = """You are an uncompromising Cambridge IELTS Examiner grading Academic Task 1.
The global average score is 5.5. Do NOT inflate scores.
You are provided with the Ground Truth chart data. You MUST strictly check whether the student accurately reported the data figures or hallucinated/misquoted numbers.

Criteria:
1. Task Achievement: Must include a clear overview highlighting key trends or highest/lowest figures. Accurate reporting of key data without distortion. Penalize heavily if no overview is present (max Band 5 for TA without overview).
2. Coherence and Cohesion: Logical grouping of data (e.g. by trend or category), effective paragraph transitions.
3. Lexical Resource: Appropriate data description language (e.g. surged, plateaued, plummeted, fluctuated, marginal increase).
4. Grammatical Range and Accuracy: Correct use of comparative and superlative structures, passive voice, tense consistency.

For each criterion, you MUST output a 2 to 4 sentence `reason` explaining why this score was awarded, referencing specific evidence from the text and comparing against ground truth data.

Respond ONLY with a valid JSON object — no markdown fences:
{
  "overall_band": <float 0-9, average of 4 sub-scores rounded to nearest 0.5>,
  "is_mock": false,
  "sub_scores": {
    "task_achievement": {
      "score": <float 0-9>,
      "reason": "<2-4 sentences evaluating overview, data accuracy against ground truth, and key features>"
    },
    "coherence_and_cohesion": {
      "score": <float 0-9>,
      "reason": "<2-4 sentences evaluating data grouping and linking devices>"
    },
    "lexical_resource": {
      "score": <float 0-9>,
      "reason": "<2-4 sentences evaluating data description vocabulary and precision>"
    },
    "grammatical_range_and_accuracy": {
      "score": <float 0-9>,
      "reason": "<2-4 sentences evaluating sentence structures, comparatives, and error frequency>"
    }
  },
  "examiner_summary": "<3 sentences of concise feedback regarding Task 1 performance>",
  "model_answer": "<Flawless Band 9 model report for THIS chart data. 160-190 words with clear overview paragraph and two detail paragraphs.>",
  "line_by_line_corrections": [
    {
      "original": "<exact phrase from student response>",
      "corrected": "<improved academic phrasing>",
      "explanation": "<specific reason for correction>",
      "category": "<grammar | vocabulary | coherence | task_achievement>"
    }
  ]
}
Provide 4-7 line-by-line corrections."""

VALIDATION_SYSTEM = """You are a Cambridge IELTS Senior Examiner.
Evaluate whether a user-submitted question is a valid, appropriate IELTS Academic Writing question.
Rules:
1. Reject any hate speech, profanity, vulgarity, harassment, or nonsensical gibberish.
2. Verify if it conforms to IELTS Academic Writing Task conventions:
   - For Task 2: An argumentative, discursive, or problem-solution question suitable for an academic essay.
   - For Task 1: A descriptive prompt concerning visual or comparative data.
3. If valid, format the question to match the official Cambridge IELTS test standards exactly:
   - For Task 2, ensure it ends with: 'Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.'
   - For Task 1, ensure it ends with: 'Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.'

Respond ONLY with a valid JSON object — no markdown fences:
{
  "is_valid": <boolean>,
  "formatted_question": "<The polished Cambridge-formatted question text if valid, or empty string if invalid>",
  "feedback": "<Clear explanation of why it is valid or why it was rejected>"
}"""


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/api/question", response_model=QuestionResponse)
async def generate_task2_question() -> QuestionResponse:
    """Generate an authentic Cambridge IELTS Task 2 question with high variety."""
    if not _has_real_key():
        return random.choice(MOCK_TASK2_QUESTIONS)

    q_type = random.choice(QUESTION_TYPES_TASK2)
    topic = random.choice(TOPICS_TASK2)
    subtopics = [
        "artificial intelligence in modern employment", "subsidies for renewable energy versus fossil fuels",
        "remote working and the decline of urban city centres", "university tuition fees and social inequality",
        "impact of digital media on children's attention spans", "public spending on cultural arts versus healthcare",
        "consumerism and the environmental toll of fast fashion", "mandatory physical education for school children",
        "overtourism and the preservation of historic heritage", "cashless economies and vulnerability to fraud",
        "automation of manual labour and universal basic income", "space exploration budgets versus domestic poverty",
        "prison reform versus punitive incarceration sentences", "globalisation and the loss of cultural heritage",
        "genetic modification of agricultural crops for food security"
    ]
    subtopic = random.choice(subtopics)
    seed = random.randint(1000, 99999)
    prompt = (
        f"Generate a unique, thought-provoking Cambridge IELTS Academic Writing Task 2 question (Variant {seed}).\n"
        f"Question Type: {q_type.replace('_', ' ')}\n"
        f"Broad Domain: {topic}\n"
        f"Specific Angle: {subtopic}\n"
        f"Ensure strict Cambridge exam phrasing and concluding rubric."
    )

    try:
        raw = await _call_gemini(prompt, QUESTION_TASK2_SYSTEM, temperature=0.85)
        data = json.loads(raw)
        data["question"] = sanitize_pseudo_names(data.get("question", ""))
        return QuestionResponse(**data)
    except json.JSONDecodeError as e:
        logger.error(f"Malformed JSON from Gemini: {e}")
        return random.choice(MOCK_TASK2_QUESTIONS)
    except Exception as e:
        logger.error(f"Task 2 question generation failed: {e}")
        return random.choice(MOCK_TASK2_QUESTIONS)


@app.get("/api/question/task1", response_model=Task1QuestionResponse)
async def generate_task1_question() -> Task1QuestionResponse:
    """Generate an authentic Cambridge IELTS Academic Task 1 question with visual chart data."""
    if not _has_real_key():
        return random.choice(MOCK_TASK1_QUESTIONS)

    chart_types = ["bar", "line", "pie", "table", "process", "map"]
    chosen_chart = random.choice(chart_types)
    seed = random.randint(1000, 99999)
    prompt = (
        f"Generate an authentic IELTS Academic Task 1 question based on a {chosen_chart} (Variant {seed}).\n"
        f"CRITICAL: Do NOT use placeholder names like 'Country A', 'Country B', 'City X'. Use authentic real-world countries (e.g. United Kingdom, Canada, Japan, Germany, Australia, United States, France), real cities, or real industries.\n"
        f"Provide realistic numerical data points and standard Cambridge question prompt."
    )

    try:
        raw = await _call_gemini(prompt, QUESTION_TASK1_SYSTEM, temperature=0.85)
        data = json.loads(raw)

        # Normalize chart type
        chart_data = data.get("chart_data", {})
        c_type = str(chart_data.get("chart_type", "bar")).lower()
        if "pie" in c_type or "donut" in c_type:
            chart_data["chart_type"] = "pie"
        elif "process" in c_type or "cycle" in c_type or "flow" in c_type:
            chart_data["chart_type"] = "process"
        elif "map" in c_type or "plan" in c_type:
            chart_data["chart_type"] = "map"
        elif "line" in c_type:
            chart_data["chart_type"] = "line"
        elif "table" in c_type:
            chart_data["chart_type"] = "table"
        else:
            chart_data["chart_type"] = "bar"

        # Sanitize any pseudo names in prompt, title, categories, series
        data["prompt"] = sanitize_pseudo_names(data.get("prompt", ""))
        chart_data["title"] = sanitize_pseudo_names(chart_data.get("title", ""))
        if "categories" in chart_data:
            chart_data["categories"] = [sanitize_pseudo_names(c) for c in chart_data["categories"]]
        if "series" in chart_data:
            for s in chart_data["series"]:
                if "name" in s:
                    s["name"] = sanitize_pseudo_names(s["name"])

        # Handle Process Diagrams
        if chart_data.get("chart_type") == "process":
            categories = chart_data.get("categories", [])
            if not categories or len(categories) < 3:
                categories = [
                    "1. Collection & Sorting",
                    "2. Cleaning & Sterilisation",
                    "3. Mechanical Processing",
                    "4. Thermal Transformation",
                    "5. Final Product Manufacturing"
                ]
                chart_data["categories"] = categories
            if not chart_data.get("series"):
                chart_data["series"] = [
                    {"name": "Stage Order", "data": [float(i + 1) for i in range(len(categories))]}
                ]

        # Handle Map / Plan Diagrams
        elif chart_data.get("chart_type") == "map":
            categories = chart_data.get("categories", [])
            if not categories or len(categories) < 3:
                categories = [
                    "Central Waterfront & Docks",
                    "Residential Housing Sector",
                    "Main Retail Commercial Zone",
                    "Public Parkland & Recreation",
                    "Industrial & Transport Hub"
                ]
                chart_data["categories"] = categories
            series_list = chart_data.get("series", [])
            if len(series_list) < 2:
                chart_data["series"] = [
                    {"name": "Initial Year (Before)", "data": [20.0, 35.0, 25.0, 20.0, 0.0][:len(categories)]},
                    {"name": "Current Year (After)", "data": [30.0, 40.0, 15.0, 5.0, 10.0][:len(categories)]}
                ]

        # Handle Pie Charts (1 vs 2)
        elif chart_data.get("chart_type") == "pie":
            prompt_str = data.get("prompt", "")
            title = chart_data.get("title", "")
            categories = chart_data.get("categories", [])
            series_list = chart_data.get("series", [])

            if not categories or len(categories) < 3:
                categories = ["Food & Housing", "Transportation", "Healthcare", "Leisure & Education", "Other"]
                chart_data["categories"] = categories

            years_in_text = re.findall(r"\b(19\d\d|20\d\d)\b", prompt_str + " " + title)
            is_dual = bool(
                re.search(r"\b(two pie charts|2 pie charts|past and current|current and past|comparison|two years)\b", prompt_str, re.IGNORECASE)
                or len(series_list) >= 2
                or len(years_in_text) >= 2
            )

            if is_dual:
                # Comparative 2 pie charts
                y1 = years_in_text[0] if len(years_in_text) > 0 else "2010"
                y2 = years_in_text[1] if len(years_in_text) > 1 else str(int(y1) + 10)
                if y1 == y2:
                    y2 = str(int(y1) + 10)

                if not re.search(r"\btwo pie charts\b", prompt_str, re.IGNORECASE):
                    prompt_str = re.sub(r"\bThe pie chart\b", "The two pie charts", prompt_str, flags=re.IGNORECASE)
                data["prompt"] = prompt_str

                if not series_list:
                    series_list = [{"name": y1, "data": []}]

                s0_data = series_list[0].get("data", [])
                if len(s0_data) != len(categories):
                    base_pct = round(100.0 / len(categories), 1)
                    s0_data = [base_pct] * len(categories)
                    s0_data[0] = round(100.0 - sum(s0_data[1:]), 1)
                    series_list[0]["data"] = s0_data
                series_list[0]["name"] = series_list[0].get("name") or y1

                if len(series_list) < 2 or len(series_list[1].get("data", [])) != len(categories):
                    s1_data = []
                    for idx, v in enumerate(s0_data):
                        shift = [-3.5, 4.0, -2.5, 3.0, -1.0, 1.5][idx % 6]
                        s1_data.append(max(5.0, round(float(v) + shift, 1)))
                    tot = sum(s1_data) or 100.0
                    s1_data = [round((v / tot) * 100.0, 1) for v in s1_data]
                    s1_data[0] = round(100.0 - sum(s1_data[1:]), 1)
                    if len(series_list) < 2:
                        series_list.append({"name": y2, "data": s1_data})
                    else:
                        series_list[1] = {"name": y2, "data": s1_data}
                else:
                    series_list[1]["name"] = series_list[1].get("name") or y2

                chart_data["series"] = series_list[:2]
            else:
                # Single pie chart (1 image / single distribution)
                y1 = years_in_text[0] if len(years_in_text) > 0 else "Overall Share"

                prompt_str = re.sub(r"\bThe two pie charts\b", "The pie chart", prompt_str, flags=re.IGNORECASE)
                data["prompt"] = prompt_str

                if not series_list:
                    series_list = [{"name": y1, "data": []}]

                s0_data = series_list[0].get("data", [])
                if len(s0_data) != len(categories):
                    base_pct = round(100.0 / len(categories), 1)
                    s0_data = [base_pct] * len(categories)
                    s0_data[0] = round(100.0 - sum(s0_data[1:]), 1)
                else:
                    tot = sum(float(x) for x in s0_data) or 100.0
                    s0_data = [round((float(v) / tot) * 100.0, 1) for v in s0_data]
                    s0_data[0] = round(100.0 - sum(s0_data[1:]), 1)

                series_list[0]["data"] = s0_data
                series_list[0]["name"] = series_list[0].get("name") or y1
                chart_data["series"] = [series_list[0]]

        data["chart_data"] = chart_data
        return Task1QuestionResponse(**data)
    except json.JSONDecodeError as e:
        logger.error(f"Malformed JSON from Gemini: {e}")
        return random.choice(MOCK_TASK1_QUESTIONS)
    except Exception as e:
        logger.error(f"Task 1 question generation failed: {e}")
        return random.choice(MOCK_TASK1_QUESTIONS)


@app.post("/api/validate-question", response_model=ValidateQuestionResponse)
async def validate_custom_question(request: ValidateQuestionRequest) -> ValidateQuestionResponse:
    """Validate and format a user-submitted IELTS question."""
    cleaned_q = sanitize_user_input(request.question, max_length=1500)
    task_type = request.task_type.lower()
    if task_type not in ("task1", "task2"):
        task_type = "task2"

    if len(cleaned_q) < 15:
        return ValidateQuestionResponse(
            is_valid=False,
            formatted_question="",
            feedback="The question is too short. Please provide a complete IELTS prompt (at least 15 characters)."
        )

    if not _has_real_key():
        # Mock validation
        formatted = cleaned_q
        if task_type == "task2" and "Write at least 250 words" not in formatted:
            formatted += "\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words."
        elif task_type == "task1" and "Write at least 150 words" not in formatted:
            formatted += "\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words."
        return ValidateQuestionResponse(
            is_valid=True,
            formatted_question=formatted,
            feedback="The question has been validated and formatted according to Cambridge IELTS standards."
        )

    prompt = (
        f"Task Type: {task_type.upper()}\n"
        f"User Submitted Question:\n---\n{cleaned_q}\n---"
    )

    try:
        raw = await _call_gemini(prompt, VALIDATION_SYSTEM)
        data = json.loads(raw)
        return ValidateQuestionResponse(**data)
    except Exception as e:
        logger.error(f"Validation failed: {e}")
        return ValidateQuestionResponse(
            is_valid=True,
            formatted_question=cleaned_q,
            feedback="Validation service temporarily degraded; question accepted with standard formatting."
        )


@app.post("/api/grade", response_model=GradingResult)
async def grade_task2_essay(request: EssayRequest) -> GradingResult:
    """Grade an IELTS Task 2 essay with strict examiner criteria and criterion reasoning."""
    cleaned_essay = sanitize_user_input(request.essay_text, max_length=8000)
    cleaned_q = sanitize_user_input(request.question, max_length=1500)

    # Allow 0 words for candidates who chose to skip or practice only Task 1
    if len(cleaned_essay.split()) == 0:
        logger.info("Candidate submitted 0 words for Task 2. Returning zero-grade record.")
        return ZERO_GRADING_TASK2

    if not _has_real_key():
        logger.info("Using MOCK grading for Task 2.")
        return MOCK_GRADING

    prompt = (
        f"Question given to the candidate:\n{cleaned_q}\n\n"
        f"Candidate's Essay:\n---\n{cleaned_essay}\n---"
    )

    try:
        raw = await _call_gemini(prompt, GRADING_TASK2_SYSTEM)
        data = json.loads(raw)
        return GradingResult(**data)
    except json.JSONDecodeError as e:
        logger.error(f"Malformed JSON from Gemini grading: {e}")
        raise HTTPException(status_code=502, detail="Examiner service returned invalid data structure. Please retry.")


@app.post("/api/grade-task1", response_model=GradingResult)
async def grade_task1_response(request: Task1GradeRequest) -> GradingResult:
    """Grade an IELTS Academic Task 1 response against ground-truth chart data."""
    cleaned_essay = sanitize_user_input(request.essay_text, max_length=5000)
    cleaned_q = sanitize_user_input(request.question, max_length=1500)

    # Allow 0 words for candidates who chose to skip or practice only Task 2
    if len(cleaned_essay.split()) == 0:
        logger.info("Candidate submitted 0 words for Task 1. Returning zero-grade record.")
        return ZERO_GRADING_TASK1

    if not _has_real_key():
        logger.info("Using MOCK grading for Task 1.")
        return MOCK_TASK1_GRADING

    prompt = (
        f"Task 1 Prompt:\n{cleaned_q}\n\n"
        f"GROUND TRUTH CHART DATA (Verify candidate figures against this array):\n"
        f"{json.dumps(request.chart_data.dict(), indent=2)}\n\n"
        f"Candidate's Task 1 Response:\n---\n{cleaned_essay}\n---"
    )

    try:
        raw = await _call_gemini(prompt, GRADING_TASK1_SYSTEM)
        data = json.loads(raw)
        return GradingResult(**data)
    except json.JSONDecodeError as e:
        logger.error(f"Malformed JSON from Gemini grading: {e}")
        raise HTTPException(status_code=502, detail="Examiner service returned invalid data structure. Please retry.")


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "IELTS Academic Examiner API v2",
        "provider": "Google Gemini (REST)",
        "models": GEMINI_MODELS,
        "mode": "live" if _has_real_key() else "mock",
    }
