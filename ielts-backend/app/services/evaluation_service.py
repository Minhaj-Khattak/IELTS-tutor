import json
import logging
import random
from typing import Any

from fastapi import HTTPException

from app.config import QUESTION_TYPES_TASK2, TOPICS_TASK2
from app.models.mock_data import (
    MOCK_GRADING,
    MOCK_TASK1_GRADING,
    MOCK_TASK1_QUESTIONS,
    MOCK_TASK2_QUESTIONS,
    ZERO_GRADING_TASK1,
    ZERO_GRADING_TASK2,
    random_task1_question,
    random_task2_question,
)
from app.models.schemas import EssayRequest, GradingResult, QuestionResponse, Task1GradeRequest, Task1QuestionResponse, ValidateQuestionRequest, ValidateQuestionResponse
from app.services.gemini_client import call_gemini, has_real_key
from app.services.quality_tracking import log_evaluation
from app.services.rubric_validation import validate_grading_payload
from app.services.security import sanitize_pseudo_names, sanitize_user_input

logger = logging.getLogger("ielts_examiner")

QUESTION_TASK2_SYSTEM = """You are an official Cambridge IELTS Senior Examiner.
Generate an authentic, thought-provoking IELTS Academic Writing Task 2 question.
Strictly adhere to official Cambridge conventions...
Respond ONLY with a valid JSON object.
{"question":"...","type":"...","topic":"...","is_mock":false}"""

QUESTION_TASK1_SYSTEM = """You are an official Cambridge IELTS Senior Examiner.
Generate an authentic Academic Writing Task 1 prompt with structured visual data.
Respond ONLY with a valid JSON object.
{"prompt":"...","chart_data":{"chart_type":...},"is_mock":false}"""

GRADING_TASK2_SYSTEM = """You are an uncompromising Cambridge IELTS Examiner.
Grade the student's essay strictly against the question provided.
Respond ONLY with a valid JSON object.
{"overall_band": 6.5, "is_mock": false, "sub_scores": {...}, "examiner_summary": "...", "model_answer": "...", "line_by_line_corrections": [...]}"""

GRADING_TASK1_SYSTEM = """You are an uncompromising Cambridge IELTS Examiner grading Academic Task 1.
Respond ONLY with a valid JSON object.
{"overall_band": 6.5, "is_mock": false, "sub_scores": {...}, "examiner_summary": "...", "model_answer": "...", "line_by_line_corrections": [...]}"""

VALIDATION_SYSTEM = """You are a Cambridge IELTS Senior Examiner.
Evaluate whether a user-submitted question is a valid, appropriate IELTS Academic Writing question.
Respond ONLY with a valid JSON object.
{"is_valid":true,"formatted_question":"...","feedback":"..."}"""


def generate_task2_question() -> QuestionResponse:
    if not has_real_key():
        return random_task2_question()

    q_type = random.choice(QUESTION_TYPES_TASK2)
    topic = random.choice(TOPICS_TASK2)
    subtopic = random.choice([
        "artificial intelligence in modern employment",
        "subsidies for renewable energy versus fossil fuels",
        "remote working and the decline of urban city centres",
        "university tuition fees and social inequality",
    ])
    seed = random.randint(1000, 99999)
    prompt = (
        f"Generate a unique, thought-provoking Cambridge IELTS Academic Writing Task 2 question (Variant {seed}).\n"
        f"Question Type: {q_type.replace('_', ' ')}\n"
        f"Broad Domain: {topic}\n"
        f"Specific Angle: {subtopic}\n"
        f"Ensure strict Cambridge exam phrasing and concluding rubric."
    )
    try:
        raw = __import__("asyncio").run(call_gemini(prompt, QUESTION_TASK2_SYSTEM, temperature=0.85))
        data = json.loads(raw)
        data["question"] = sanitize_pseudo_names(data.get("question", ""))
        return QuestionResponse(**data)
    except Exception:
        logger.exception("Task 2 question generation failed")
        return random_task2_question()


async def async_generate_task2_question() -> QuestionResponse:
    if not has_real_key():
        return random_task2_question()

    q_type = random.choice(QUESTION_TYPES_TASK2)
    topic = random.choice(TOPICS_TASK2)
    subtopic = random.choice([
        "artificial intelligence in modern employment",
        "subsidies for renewable energy versus fossil fuels",
        "remote working and the decline of urban city centres",
        "university tuition fees and social inequality",
    ])
    seed = random.randint(1000, 99999)
    prompt = (
        f"Generate a unique, thought-provoking Cambridge IELTS Academic Writing Task 2 question (Variant {seed}).\n"
        f"Question Type: {q_type.replace('_', ' ')}\n"
        f"Broad Domain: {topic}\n"
        f"Specific Angle: {subtopic}\n"
        f"Ensure strict Cambridge exam phrasing and concluding rubric."
    )
    try:
        raw = await call_gemini(prompt, QUESTION_TASK2_SYSTEM, temperature=0.85)
        data = json.loads(raw)
        data["question"] = sanitize_pseudo_names(data.get("question", ""))
        return QuestionResponse(**data)
    except Exception:
        logger.exception("Task 2 question generation failed")
        return random_task2_question()


def generate_task1_question() -> Task1QuestionResponse:
    if not has_real_key():
        return random_task1_question()

    chosen_chart = random.choice(["bar", "line", "pie", "table", "process", "map"])
    specific_domain = random.choice([
        "water consumption by agricultural, industrial, and domestic sectors across 4 nations",
        "rail freight versus road haulage transport volumes in Australia and Canada",
        "university graduate employment rates across STEM, Humanities, and Medicine in the UK",
    ])
    seed = random.randint(1000, 99999)
    prompt = (
        f"Generate an authentic IELTS Academic Task 1 question based on a {chosen_chart} (Variant {seed}).\n"
        f"Specific Domain Focus: {specific_domain}\n"
        f"Use authentic entity names and realistic numerical data."
    )
    try:
        raw = __import__("asyncio").run(call_gemini(prompt, QUESTION_TASK1_SYSTEM, temperature=0.85))
        data = json.loads(raw)
        data["prompt"] = sanitize_pseudo_names(data.get("prompt", ""))
        if "chart_data" in data and "chart_type" in data["chart_data"]:
            data["chart_data"]["chart_type"] = data["chart_data"]["chart_type"].lower()
        return Task1QuestionResponse(**data)
    except Exception:
        logger.exception("Task 1 question generation failed")
        return random_task1_question()


async def async_generate_task1_question() -> Task1QuestionResponse:
    if not has_real_key():
        return random_task1_question()

    chosen_chart = random.choice(["bar", "line", "pie", "table", "process", "map"])
    specific_domain = random.choice([
        "water consumption by agricultural, industrial, and domestic sectors across 4 nations",
        "rail freight versus road haulage transport volumes in Australia and Canada",
        "university graduate employment rates across STEM, Humanities, and Medicine in the UK",
    ])
    seed = random.randint(1000, 99999)
    prompt = (
        f"Generate an authentic IELTS Academic Task 1 question based on a {chosen_chart} (Variant {seed}).\n"
        f"Specific Domain Focus: {specific_domain}\n"
        f"Use authentic entity names and realistic numerical data."
    )
    try:
        raw = await call_gemini(prompt, QUESTION_TASK1_SYSTEM, temperature=0.85)
        data = json.loads(raw)
        data["prompt"] = sanitize_pseudo_names(data.get("prompt", ""))
        if "chart_data" in data and "chart_type" in data["chart_data"]:
            data["chart_data"]["chart_type"] = data["chart_data"]["chart_type"].lower()
        return Task1QuestionResponse(**data)
    except Exception:
        logger.exception("Task 1 question generation failed")
        return random_task1_question()


def validate_custom_question(question: str, task_type: str = "task2") -> ValidateQuestionResponse:
    cleaned_q = sanitize_user_input(question, max_length=1500)
    task_type = task_type.lower()
    if task_type not in ("task1", "task2"):
        task_type = "task2"

    if len(cleaned_q) < 15:
        return ValidateQuestionResponse(
            is_valid=False,
            formatted_question="",
            feedback="The question is too short. Please provide a complete IELTS prompt (at least 15 characters).",
        )

    if not has_real_key():
        formatted = cleaned_q
        if task_type == "task2" and "Write at least 250 words" not in formatted:
            formatted += "\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words."
        elif task_type == "task1" and "Write at least 150 words" not in formatted:
            formatted += "\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words."
        return ValidateQuestionResponse(
            is_valid=True,
            formatted_question=formatted,
            feedback="The question has been validated and formatted according to Cambridge IELTS standards.",
        )

    prompt = (
        f"Task Type: {task_type.upper()}\n"
        f"User Submitted Question:\n---\n{cleaned_q}\n---"
    )
    try:
        raw = __import__("asyncio").run(call_gemini(prompt, VALIDATION_SYSTEM, temperature=0.4))
        data = json.loads(raw)
        return ValidateQuestionResponse(**data)
    except Exception as exc:
        logger.exception("Validation failed")
        return ValidateQuestionResponse(
            is_valid=True,
            formatted_question=cleaned_q,
            feedback="Validation service temporarily degraded; question accepted with standard formatting.",
        )


async def async_validate_custom_question(question: str, task_type: str = "task2") -> ValidateQuestionResponse:
    cleaned_q = sanitize_user_input(question, max_length=1500)
    task_type = task_type.lower()
    if task_type not in ("task1", "task2"):
        task_type = "task2"
    if len(cleaned_q) < 15:
        return ValidateQuestionResponse(
            is_valid=False,
            formatted_question="",
            feedback="The question is too short. Please provide a complete IELTS prompt (at least 15 characters).",
        )
    if not has_real_key():
        formatted = cleaned_q
        if task_type == "task2" and "Write at least 250 words" not in formatted:
            formatted += "\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words."
        elif task_type == "task1" and "Write at least 150 words" not in formatted:
            formatted += "\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words."
        return ValidateQuestionResponse(
            is_valid=True,
            formatted_question=formatted,
            feedback="The question has been validated and formatted according to Cambridge IELTS standards.",
        )
    prompt = (
        f"Task Type: {task_type.upper()}\n"
        f"User Submitted Question:\n---\n{cleaned_q}\n---"
    )
    try:
        raw = await call_gemini(prompt, VALIDATION_SYSTEM, temperature=0.4)
        data = json.loads(raw)
        return ValidateQuestionResponse(**data)
    except Exception:
        logger.exception("Validation failed")
        return ValidateQuestionResponse(
            is_valid=True,
            formatted_question=cleaned_q,
            feedback="Validation service temporarily degraded; question accepted with standard formatting.",
        )


def grade_task2_essay(essay_text: str, question: str) -> GradingResult:
    cleaned_essay = sanitize_user_input(essay_text, max_length=8000)
    cleaned_q = sanitize_user_input(question, max_length=1500)
    if len(cleaned_essay.split()) == 0:
        return ZERO_GRADING_TASK2
    if not has_real_key():
        event = {"task": "task2", "overall_band": 6.5, "issue": None}
        log_evaluation(event)
        return MOCK_GRADING

    prompt = (
        f"Question given to the candidate:\n{cleaned_q}\n\n"
        f"Candidate's Essay:\n---\n{cleaned_essay}\n---"
    )
    try:
        raw = __import__("asyncio").run(call_gemini(prompt, GRADING_TASK2_SYSTEM, temperature=0.3))
        data = json.loads(raw)
        validated = validate_grading_payload(data, task="task2")
        log_evaluation({"task": "task2", "overall_band": validated.get("overall_band"), "issue": None})
        return GradingResult(**validated)
    except Exception as exc:
        logger.exception("Task 2 grading failed")
        log_evaluation({"task": "task2", "overall_band": 0.0, "issue": str(exc)})
        raise HTTPException(status_code=502, detail="Examiner service returned invalid data structure. Please retry.")


async def grade_task2_essay_async(essay_text: str, question: str) -> GradingResult:
    cleaned_essay = sanitize_user_input(essay_text, max_length=8000)
    cleaned_q = sanitize_user_input(question, max_length=1500)
    if len(cleaned_essay.split()) == 0:
        return ZERO_GRADING_TASK2
    if not has_real_key():
        return MOCK_GRADING

    prompt = (
        f"Question given to the candidate:\n{cleaned_q}\n\n"
        f"Candidate's Essay:\n---\n{cleaned_essay}\n---"
    )
    try:
        raw = await call_gemini(prompt, GRADING_TASK2_SYSTEM, temperature=0.3)
        data = json.loads(raw)
        validated = validate_grading_payload(data, task="task2")
        log_evaluation({"task": "task2", "overall_band": validated.get("overall_band"), "issue": None})
        return GradingResult(**validated)
    except Exception as exc:
        logger.exception("Task 2 grading failed")
        log_evaluation({"task": "task2", "overall_band": 0.0, "issue": str(exc)})
        raise HTTPException(status_code=502, detail="Examiner service returned invalid data structure. Please retry.")


def grade_task1_response(essay_text: str, question: str, chart_data: Any) -> GradingResult:
    cleaned_essay = sanitize_user_input(essay_text, max_length=5000)
    cleaned_q = sanitize_user_input(question, max_length=1500)
    if len(cleaned_essay.split()) == 0:
        return ZERO_GRADING_TASK1
    if not has_real_key():
        return MOCK_TASK1_GRADING

    prompt = (
        f"Task 1 Prompt:\n{cleaned_q}\n\n"
        f"GROUND TRUTH CHART DATA:\n{json.dumps(chart_data.model_dump() if hasattr(chart_data, 'model_dump') else chart_data, indent=2)}\n\n"
        f"Candidate's Task 1 Response:\n---\n{cleaned_essay}\n---"
    )
    try:
        raw = __import__("asyncio").run(call_gemini(prompt, GRADING_TASK1_SYSTEM, temperature=0.3))
        data = json.loads(raw)
        validated = validate_grading_payload(data, task="task1")
        log_evaluation({"task": "task1", "overall_band": validated.get("overall_band"), "issue": None})
        return GradingResult(**validated)
    except Exception as exc:
        logger.exception("Task 1 grading failed")
        log_evaluation({"task": "task1", "overall_band": 0.0, "issue": str(exc)})
        raise HTTPException(status_code=502, detail="Examiner service returned invalid data structure. Please retry.")


async def grade_task1_response_async(essay_text: str, question: str, chart_data: Any) -> GradingResult:
    cleaned_essay = sanitize_user_input(essay_text, max_length=5000)
    cleaned_q = sanitize_user_input(question, max_length=1500)
    if len(cleaned_essay.split()) == 0:
        return ZERO_GRADING_TASK1
    if not has_real_key():
        return MOCK_TASK1_GRADING

    prompt = (
        f"Task 1 Prompt:\n{cleaned_q}\n\n"
        f"GROUND TRUTH CHART DATA:\n{json.dumps(chart_data.model_dump() if hasattr(chart_data, 'model_dump') else chart_data, indent=2)}\n\n"
        f"Candidate's Task 1 Response:\n---\n{cleaned_essay}\n---"
    )
    try:
        raw = await call_gemini(prompt, GRADING_TASK1_SYSTEM, temperature=0.3)
        data = json.loads(raw)
        validated = validate_grading_payload(data, task="task1")
        log_evaluation({"task": "task1", "overall_band": validated.get("overall_band"), "issue": None})
        return GradingResult(**validated)
    except Exception as exc:
        logger.exception("Task 1 grading failed")
        log_evaluation({"task": "task1", "overall_band": 0.0, "issue": str(exc)})
        raise HTTPException(status_code=502, detail="Examiner service returned invalid data structure. Please retry.")
