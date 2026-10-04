from fastapi import APIRouter

from app.models.schemas import EssayRequest, GradingResult, Task1GradeRequest
from app.services.evaluation_service import grade_task1_response_async, grade_task2_essay_async

router = APIRouter(prefix="/api")


@router.post("/grade", response_model=GradingResult)
async def grade_task2_essay(request: EssayRequest) -> GradingResult:
    return await grade_task2_essay_async(request.essay_text, request.question)


@router.post("/grade-task1", response_model=GradingResult)
async def grade_task1_response(request: Task1GradeRequest) -> GradingResult:
    return await grade_task1_response_async(request.essay_text, request.question, request.chart_data)
