from fastapi import APIRouter, Response

from app.models.schemas import QuestionResponse, Task1QuestionResponse, ValidateQuestionRequest, ValidateQuestionResponse
from app.services.evaluation_service import async_generate_task1_question, async_generate_task2_question, async_validate_custom_question

router = APIRouter(prefix="/api")


@router.get("/question", response_model=QuestionResponse)
async def generate_task2_question(response: Response) -> QuestionResponse:
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return await async_generate_task2_question()


@router.get("/question/task1", response_model=Task1QuestionResponse)
async def generate_task1_question(response: Response) -> Task1QuestionResponse:
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return await async_generate_task1_question()


@router.post("/validate-question", response_model=ValidateQuestionResponse)
async def validate_custom_question(request: ValidateQuestionRequest) -> ValidateQuestionResponse:
    return await async_validate_custom_question(request.question, request.task_type)
