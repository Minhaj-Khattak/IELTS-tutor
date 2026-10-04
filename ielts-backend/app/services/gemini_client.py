import json
import logging
import os
from typing import Any

import httpx
from fastapi import HTTPException

from app.config import GEMINI_BASE_URL, GEMINI_MODELS

logger = logging.getLogger("ielts_examiner")


def has_real_key() -> bool:
    key = os.getenv("GEMINI_API_KEY", "")
    return bool(key) and "your-gemini-api-key" not in key


async def call_gemini(prompt: str, system: str, temperature: float = 0.4) -> str:
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
                    continue
            except httpx.RequestError as req_err:
                logger.warning(f"Connection error to {model}: {req_err}")
                last_error = str(req_err)
                continue

    raise HTTPException(
        status_code=503,
        detail="Our AI examiner is currently experiencing high demand. Please wait a few moments and try submitting again.",
    )
