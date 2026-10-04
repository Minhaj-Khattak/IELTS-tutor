import math
from typing import Any, Dict


def _round_half_up(value: float) -> float:
    return round(value * 2) / 2


def validate_grading_payload(payload: Dict[str, Any], task: str = "task2") -> Dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValueError("Grading payload must be a dictionary.")

    if payload.get("overall_band") is None:
        raise ValueError("overall_band is required.")

    sub_scores = payload.get("sub_scores")
    if not isinstance(sub_scores, dict):
        raise ValueError("sub_scores is required.")

    required_keys = [
        "task_achievement",
        "coherence_and_cohesion",
        "lexical_resource",
        "grammatical_range_and_accuracy",
    ]
    missing = [key for key in required_keys if key not in sub_scores]
    if missing:
        raise ValueError(f"Missing required sub-score keys: {missing}")

    values: list[float] = []
    for key in required_keys:
        entry = sub_scores[key]
        if not isinstance(entry, dict):
            raise ValueError(f"Sub-score {key} must be an object.")
        score = float(entry.get("score", -1))
        reason = str(entry.get("reason", "")).strip()
        if not 0 <= score <= 9:
            raise ValueError(f"Sub-score {key} out of range: {score}")
        if len(reason) < 20:
            raise ValueError(f"Sub-score {key} reason is too short for rubric traceability.")
        values.append(score)

    expected = _round_half_up(sum(values) / len(values))
    if not math.isclose(float(payload["overall_band"]), expected, abs_tol=0.01):
        raise ValueError(f"overall_band {payload['overall_band']} does not match sub-score average {expected}.")

    examiner_summary = str(payload.get("examiner_summary", "")).strip()
    model_answer = str(payload.get("model_answer", "")).strip()
    if not examiner_summary or len(examiner_summary) < 30:
        raise ValueError("examiner_summary must be a substantive explanation.")
    if not model_answer:
        raise ValueError("model_answer cannot be empty.")

    corrections = payload.get("line_by_line_corrections", [])
    if float(payload["overall_band"]) == 0.0:
        if corrections:
            raise ValueError("Zero-grade responses must not include line-by-line corrections.")
    else:
        min_count = 4 if task == "task2" else 4
        max_count = 8 if task == "task2" else 7
        if not isinstance(corrections, list) or not (min_count <= len(corrections) <= max_count):
            raise ValueError(f"line_by_line_corrections must contain between {min_count} and {max_count} items.")

    return payload
