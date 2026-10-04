from fastapi import APIRouter

from app.config import GEMINI_MODELS
from app.services.gemini_client import has_real_key
from app.services.quality_tracking import get_quality_summary

router = APIRouter()


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "IELTS Academic Examiner API v2",
        "provider": "Google Gemini (REST)",
        "models": GEMINI_MODELS,
        "mode": "live" if has_real_key() else "mock",
    }


@router.get("/api/quality/summary")
async def quality_summary():
    return get_quality_summary()
