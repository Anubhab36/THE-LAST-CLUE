from app.schemas.case import GenerateCaseRequest, to_public_case
from app.services.case_generator import get_case
from app.services.case_registry import find_case, save_case
from app.services.ai_case_generator import _prompt


def test_generate_request_accepts_difficulty_and_optional_theme():
    request = GenerateCaseRequest(difficulty="hard", theme="remote mountain hotel")
    assert request.difficulty == "hard"
    assert request.theme == "remote mountain hotel"


def test_prompt_has_difficulty_and_deterministic_solution_constraints():
    prompt = _prompt("expert", "isolated research station")
    assert "Difficulty: expert" in prompt
    assert "exactly 50 minutes" in prompt
    assert "exactly one killer" in prompt
    assert "Every clue and action must be reachable" in prompt


def test_generated_case_can_be_saved_and_loaded_from_database():
    case = get_case("easy")

    try:
        # A built-in case may already exist because the application persists
        # cases before creating sessions. Test saving and loading without
        # assuming the database is empty.
        save_case(case)

        loaded = find_case(case.case_id)
        assert loaded is not None
        assert loaded.case_id == case.case_id
        assert loaded.solution == case.solution
        assert loaded.model_dump(mode="json") == case.model_dump(mode="json")
    finally:
        # Remove this test record so repeated test runs remain isolated.
        from app.db import SessionLocal
        from app.models.game import GeneratedCase

        with SessionLocal() as db:
            record = db.get(GeneratedCase, case.case_id)
            if record is not None:
                db.delete(record)
                db.commit()


def test_public_case_does_not_expose_answers_or_solution():
    public = to_public_case(get_case("easy"))
    payload = public.model_dump()

    assert "solution" not in payload
    assert all(
        "answers" not in question
        for profile in payload["interrogation"]
        for question in profile["questions"]
    )
