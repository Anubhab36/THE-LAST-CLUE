from app.db import SessionLocal
from app.models.game import GameSession, GeneratedCase
from app.services.case_generator import get_case
from app.services.case_registry import find_case, save_case
from app.services.session_service import get_session
from app.services.session_service import (
    create_session,
    get_session,
    discover_evidence,
    complete_action,
    mark_question_asked,
)


def cleanup(case_id: str, session_id: str | None = None):
    with SessionLocal() as db:
        if session_id:
            session = db.get(GameSession, session_id)
            if session:
                db.delete(session)

        case = db.get(GeneratedCase, case_id)
        if case:
            db.delete(case)

        db.commit()


def test_builtin_case_is_persisted_before_session_creation():
    case = get_case("easy")
    session_id = None

    try:
        # Ensure this test starts without an existing copy.
        cleanup(case.case_id)

        result = create_session(case.case_id)
        session_id = result["session_id"]

        assert find_case(case.case_id) is not None
        session = get_session(session_id)
        assert session["case_id"] == case.case_id
        assert session["status"] == "active"
        assert session["progress"]["discovered_evidence"] == []
    finally:
        cleanup(case.case_id, session_id)


def test_evidence_requires_valid_id_and_prerequisites():
    case = get_case("easy")
    session_id = None

    try:
        save_case(case)
        session_id = create_session(case.case_id)["session_id"]

        try:
            discover_evidence(session_id, "definitely_not_real")
            assert False, "Unknown evidence should be rejected"
        except Exception as exc:
            assert getattr(exc, "status_code", None) == 404

        evidence = next((e for e in case.evidence if e.discoverable), None)
        assert evidence is not None

        state = get_session(session_id)
        progress = state["progress"]

        if (
            not evidence.requires_evidence_ids
            and not evidence.requires_action_ids
        ):
            updated = discover_evidence(session_id, evidence.id)
            assert evidence.id in updated["progress"]["discovered_evidence"]
        else:
            try:
                discover_evidence(session_id, evidence.id)
                assert False, "Evidence with unmet prerequisites should be rejected"
            except Exception as exc:
                assert getattr(exc, "status_code", None) == 409
    finally:
        cleanup(case.case_id, session_id)


def test_repeated_interrogation_question_is_allowed():
    case = get_case("easy")
    session_id = None

    try:
        save_case(case)
        session_id = create_session(case.case_id)["session_id"]

        selected = None
        for profile in case.interrogation:
            for question in profile.questions:
                if (
                    not question.requires_evidence_ids
                    and not question.requires_action_ids
                ):
                    selected = (profile.suspect_id, question.id)
                    break
            if selected:
                break

        if selected is None:
            return

        suspect_id, question_id = selected

        _, first_answer = mark_question_asked(
            session_id, suspect_id, question_id
        )
        _, second_answer = mark_question_asked(
            session_id, suspect_id, question_id
        )

        assert first_answer["answer"] == second_answer["answer"]

        progress = get_session(session_id)["progress"]
        key = f"{suspect_id}:{question_id}"
        assert progress["asked_questions"].count(key) == 1

    finally:
        if session_id is not None:
            from app.db import SessionLocal
            from app.models.game import GameSession

            with SessionLocal() as db:
                session = db.get(GameSession, session_id)
                if session is not None:
                    db.delete(session)
                    db.commit()


def test_score_refinement_returns_cached_result_without_rescoring(monkeypatch):
    from app.api import sessions as sessions_api

    expected = object()
    calls = {"count": 0}

    monkeypatch.setattr(sessions_api, "get_session", lambda session_id: {
        "status": "completed",
        "case_id": "unused",
        "progress": {"refined_score_result": {"cached": True}},
    })

    def should_not_refine(*args, **kwargs):
        calls["count"] += 1
        raise AssertionError("Cached score should not be recalculated")

    monkeypatch.setattr(
        sessions_api.AccusationResult,
        "model_validate",
        lambda value: expected,
    )
    monkeypatch.setattr(
        sessions_api,
        "refine_semantic_answers",
        should_not_refine,
    )

    result = sessions_api.refine_score(
        "test-session",
        sessions_api.ScoreRefinementRequest(motive="anything", method="anything"),
    )

    assert result is expected
    assert calls["count"] == 0
