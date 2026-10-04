import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

QUALITY_LOG_PATH = Path(__file__).resolve().parents[2] / "quality" / "model_quality_log.jsonl"
QUALITY_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)


def log_evaluation(event: Dict[str, Any]) -> None:
    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **event,
    }
    with QUALITY_LOG_PATH.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def get_quality_summary() -> Dict[str, Any]:
    if not QUALITY_LOG_PATH.exists():
        return {
            "total_evaluations": 0,
            "average_overall_band": 0.0,
            "recent_issues": [],
            "last_updated": None,
        }

    records: List[Dict[str, Any]] = []
    with QUALITY_LOG_PATH.open("r", encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                records.append(json.loads(line))

    total = len(records)
    average = sum(float(item.get("overall_band", 0.0)) for item in records) / total if total else 0.0
    recent_issues = [
        item.get("issue")
        for item in records[-20:]
        if item.get("issue")
    ]

    return {
        "total_evaluations": total,
        "average_overall_band": round(average, 2),
        "recent_issues": recent_issues,
        "last_updated": records[-1].get("timestamp") if records else None,
    }
