from typing import List

from pydantic import BaseModel, Field


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
