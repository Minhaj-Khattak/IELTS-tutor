import os
import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

os.environ.pop("GEMINI_API_KEY", None)

from main import app

client = TestClient(app)


def test_health_endpoint_reports_mock_mode():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["mode"] == "mock"


def test_question_endpoint_returns_valid_schema():
    response = client.get("/api/question")
    assert response.status_code == 200
    body = response.json()
    assert "question" in body
    assert "type" in body
    assert "topic" in body
    assert body["is_mock"] is True


def test_task1_question_endpoint_returns_valid_schema():
    response = client.get("/api/question/task1")
    assert response.status_code == 200
    body = response.json()
    assert "prompt" in body
    assert "chart_data" in body
    assert body["is_mock"] is True


def test_grade_endpoint_returns_grading_result_contract():
    response = client.post(
        "/api/grade",
        json={
            "essay_text": "I believe public transport is essential for modern cities. It reduces congestion and pollution.",
            "question": "Some people think governments should invest more in public transport. To what extent do you agree or disagree?",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["overall_band"] >= 0
    assert "sub_scores" in body
    assert "line_by_line_corrections" in body
    assert "examiner_summary" in body
    assert "model_answer" in body


def test_zero_word_task_returns_zero_grade():
    response = client.post(
        "/api/grade",
        json={
            "essay_text": "",
            "question": "To what extent do you agree or disagree?",
        },
    )
    assert response.status_code == 200
    assert response.json()["overall_band"] == 0.0


def test_validation_endpoint_formats_question():
    response = client.post(
        "/api/validate-question",
        json={
            "question": "Why do people use social media?",
            "task_type": "task2",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["is_valid"] is True
    assert "Write at least 250 words" in body["formatted_question"]


def test_rubric_validator_rejects_invalid_payload():
    from app.services.rubric_validation import validate_grading_payload

    invalid = {
        "overall_band": 9.0,
        "sub_scores": {
            "task_achievement": {"score": 9.0, "reason": "ok"},
            "coherence_and_cohesion": {"score": 9.0, "reason": "ok"},
            "lexical_resource": {"score": 9.0, "reason": "ok"},
            "grammatical_range_and_accuracy": {"score": 9.0, "reason": "ok"},
        },
        "examiner_summary": "",
        "model_answer": "",
        "line_by_line_corrections": [],
    }

    try:
        validate_grading_payload(invalid)
    except ValueError:
        pass
    else:
        raise AssertionError("Expected invalid rubric payload to be rejected")


def test_quality_summary_endpoint_exists():
    response = client.get("/api/quality/summary")
    assert response.status_code == 200
    body = response.json()
    assert "total_evaluations" in body
    assert "recent_issues" in body
