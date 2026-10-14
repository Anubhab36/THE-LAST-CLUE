from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.api import cases as cases_api
from app.services.case_generator import get_case
from app.schemas.case import to_public_case


client = TestClient(app)


def test_ai_generation_failure_returns_builtin_case_at_requested_difficulty(
    monkeypatch,
):
    def fail_generation(*args, **kwargs):
        raise RuntimeError("Gemini quota exhausted")

    monkeypatch.setattr(cases_api, "generate_case", fail_generation)

    response = client.post(
        "/api/cases/generate",
        json={"difficulty": "medium", "theme": "old hotel"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["case_id"] == "case_002"
    assert payload["difficulty"] == "medium"
    assert "solution" not in payload


def test_successful_ai_generation_saves_generated_case(monkeypatch):
    generated = get_case("hard")
    generated.case_id = "generated_test_fallback_route"

    saved = []

    monkeypatch.setattr(
        cases_api,
        "generate_case",
        lambda difficulty, theme: generated,
    )
    monkeypatch.setattr(
        cases_api,
        "save_case",
        lambda case: saved.append(case.case_id),
    )

    response = client.post(
        "/api/cases/generate",
        json={"difficulty": "hard"},
    )

    assert response.status_code == 200
    assert response.json()["case_id"] == "generated_test_fallback_route"
    assert saved == ["generated_test_fallback_route"]


def test_database_save_failure_returns_server_error_without_fallback(
    monkeypatch,
):
    generated = get_case("expert")
    generated.case_id = "generated_test_save_failure"

    monkeypatch.setattr(
        cases_api,
        "generate_case",
        lambda difficulty, theme: generated,
    )

    def fail_save(case):
        raise RuntimeError("database unavailable")

    monkeypatch.setattr(cases_api, "save_case", fail_save)

    response = client.post(
        "/api/cases/generate",
        json={"difficulty": "expert"},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == (
        "The case could not be saved right now. Please try again."
    )
