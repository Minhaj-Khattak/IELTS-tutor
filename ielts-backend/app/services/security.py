import re
from typing import Any

import nh3
from fastapi import HTTPException

from app.config import REAL_COUNTRIES

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


def sanitize_pseudo_names(text: str) -> str:
    if not text:
        return text

    def _sub_country(match: re.Match[str]) -> str:
        code = match.group(1).upper()
        if len(code) == 1 and code.isalpha():
            idx = ord(code) - ord("A")
            return REAL_COUNTRIES[idx % len(REAL_COUNTRIES)]
        return match.group(0)

    res = re.sub(r"(?i)\bcountry\s+([a-z])\b", _sub_country, text)
    res = re.sub(r"(?i)\bnation\s+([a-z])\b", _sub_country, res)
    return res


def sanitize_user_input(text: str, max_length: int = 6000) -> str:
    if not text:
        return ""
    cleaned = nh3.clean(text, tags=set()).strip()
    if len(cleaned) > max_length:
        cleaned = cleaned[:max_length]
    for pattern in PROMPT_INJECTION_PATTERNS:
        if re.search(pattern, cleaned):
            raise HTTPException(
                status_code=400,
                detail="Security validation error: disallowed instructions or prompt manipulation detected.",
            )
    return cleaned
