import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import allowed_origins
from app.routes.grading import router as grading_router
from app.routes.questions import router as questions_router
from app.routes.system import router as system_router

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ielts_examiner")

app = FastAPI(title="IELTS Academic AI Examiner API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "ClientError" if exc.status_code < 500 else "EvaluationServiceUnavailable",
            "message": str(exc.detail),
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Internal server error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "EvaluationServiceUnavailable",
            "message": "Our AI examiner is currently experiencing high demand. Please try again in a moment.",
        },
    )


app.include_router(system_router)
app.include_router(questions_router)
app.include_router(grading_router)
