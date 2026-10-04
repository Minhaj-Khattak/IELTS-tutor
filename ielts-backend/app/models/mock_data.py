import random
from typing import List

from app.models.schemas import (
    ChartData,
    ChartSeries,
    CriterionScore,
    GradingResult,
    QuestionResponse,
    SubScores,
    LineCorrection,
    Task1QuestionResponse,
)

MOCK_TASK2_QUESTIONS: List[QuestionResponse] = [
    QuestionResponse(
        question=(
            "Some people believe that governments should invest more in public transport rather than in building new roads. To what extent do you agree or disagree?\n\n"
            "Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words."
        ),
        type="agree_disagree",
        topic="transportation",
        is_mock=True,
    ),
    QuestionResponse(
        question=(
            "Some people think that universities should provide graduates with the knowledge and skills needed in the workplace. Others think that the true function of a university should be to give access to knowledge for its own sake, regardless of whether the course is useful to an employer.\n\n"
            "Discuss both views and give your own opinion. Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words."
        ),
        type="discuss_both",
        topic="education systems",
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
            ],
        ),
        is_mock=True,
    )
]

MOCK_QUESTION = MOCK_TASK2_QUESTIONS[0]
MOCK_TASK1_QUESTION = MOCK_TASK1_QUESTIONS[0]

MOCK_GRADING = GradingResult(
    overall_band=6.5,
    is_mock=True,
    examiner_summary=(
        "This is a simulated evaluation. The candidate presents a relevant position throughout, though key supporting ideas require further development. Grammatical structures show fair variety but are occasionally constrained by punctuation errors and minor lexical collocations."
    ),
    model_answer=(
        "In recent decades, the question of whether municipal and national authorities should prioritise public transit or highway infrastructure has ignited vigorous debate among urban planners. While road expansion is frequently advocated to facilitate commercial freight, I am firmly convinced that strategic investment in public transportation delivers far superior socioeconomic and ecological returns.\n\n"
        "To begin with, high-capacity mass transit systems offer the only sustainable antidote to chronic traffic congestion. Empirical evidence from metropolises such as Tokyo and Zurich demonstrates that robust subterranean metro networks can transport millions with minimal spatial consumption. Conversely, constructing additional road lanes invariably triggers induced demand, swiftly eroding any temporary alleviation of congestion.\n\n"
        "Furthermore, modern transit networks are indispensable for social mobility and environmental mitigation. Subsidised bus rapid transit and electrified commuter rail ensure that lower-income households retain unhindered access to employment centres without incurring private vehicle expenditures. Simultaneously, replacing private automobile trips with electric transit dramatically curtails greenhouse gas emissions and urban particulate smog.\n\n"
        "In conclusion, while rudimentary road maintenance remains necessary, public expenditure should unequivocally concentrate on expansive, dependable transit systems. Governments must envision long-term sustainability rather than pursuing short-term highway expansions."
    ),
    sub_scores=SubScores(
        task_achievement=CriterionScore(score=6.5, reason="Addresses all parts of the task with a clear position throughout. However, some secondary claims lack concrete examples, preventing a higher Band 7 award."),
        coherence_and_cohesion=CriterionScore(score=6.5, reason="Information is arranged coherently with clear overall progression. Paragraphing is logical, though mechanical linkers are slightly over-relied upon."),
        lexical_resource=CriterionScore(score=7.0, reason="Uses a sufficient range of less common lexical items such as 'chronic traffic congestion' and 'induced demand'. Occasional minor collocation slips do not impede communication."),
        grammatical_range_and_accuracy=CriterionScore(score=6.0, reason="Employs a mix of simple and complex sentence forms. Several minor errors in punctuation and clause coordination persist, keeping this criterion at Band 6."),
    ),
    line_by_line_corrections=[
        LineCorrection(
            original="People is believing that public transport is good.",
            corrected="It is widely believed that public transport provides substantial benefits.",
            explanation="Subject-verb agreement error with 'people' and informal phrasing.",
            category="grammar",
        )
    ],
)

MOCK_TASK1_GRADING = GradingResult(
    overall_band=7.0,
    is_mock=True,
    examiner_summary=(
        "This is a simulated Task 1 evaluation. The response provides a clear overview highlighting overall upward trends across all four nations. Key data points are accurately reported, though comparisons between intermediate years could be more tightly grouped."
    ),
    model_answer=(
        "The bar chart illustrates the proportion of electricity produced from renewable energy sources in four European nations—Germany, Denmark, Spain, and the UK—between 2010 and 2020.\n\nOverall, all four countries experienced substantial growth in renewable electricity generation over the ten-year period. Denmark consistently led throughout, while the UK demonstrated the most dramatic relative expansion despite starting from the lowest base.\n\nIn 2010, Denmark generated approximately 32.8% of its electricity from renewable sources, followed by Spain at 27.8% and Germany at 17.4%. The UK lagged significantly behind at just 6.9%. Over the next five years, all nations recorded notable gains, with Denmark surging past the 50% threshold to reach 51.3% by 2015.\n\nBy 2020, Denmark solidified its dominance with nearly two-thirds (65.4%) of its electricity derived from renewables. Germany and Spain followed closely at 45.1% and 44.0% respectively. Most notably, the UK increased its renewable share nearly sixfold to 40.3%, nearly matching Spain's figure."
    ),
    sub_scores=SubScores(
        task_achievement=CriterionScore(score=7.0, reason="Presents a clear overview highlighting general upward trends and country rankings. Key data figures are accurately cited without major distortion."),
        coherence_and_cohesion=CriterionScore(score=7.0, reason="Information is logically sequenced by initial standings and terminal comparisons. Paragraphing is well-managed with appropriate cohesive markers."),
        lexical_resource=CriterionScore(score=7.0, reason="Utilizes an effective range of data-interpretation vocabulary with minimal error."),
        grammatical_range_and_accuracy=CriterionScore(score=7.0, reason="Demonstrates good control of complex sentence structures, comparative clauses, and passive constructions throughout."),
    ),
    line_by_line_corrections=[
        LineCorrection(
            original="Denmark was have the most high percentage.",
            corrected="Denmark maintained the highest proportion throughout the period.",
            explanation="Double verb error and incorrect superlative form.",
            category="grammar",
        )
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


def random_task2_question() -> QuestionResponse:
    return random.choice(MOCK_TASK2_QUESTIONS)


def random_task1_question() -> Task1QuestionResponse:
    return random.choice(MOCK_TASK1_QUESTIONS)
