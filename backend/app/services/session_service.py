"""Server-authoritative investigation session operations."""
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy.orm.attributes import flag_modified

from app.db import SessionLocal
from app.models.game import GameSession
from app.schemas.case import Case
from app.services.case_registry import find_case, save_case
from app.services.case_generator import get_case


BUILT_IN_CASES = {
    "case_001": "easy",
    "case_002": "medium",
    "case_003": "hard",
    "case_004": "expert",
}


def get_case_data(case_id: str) -> Case:
    case = find_case(case_id)
    if case is not None:
        return case

    difficulty = BUILT_IN_CASES.get(case_id)
    if difficulty:
        case = get_case(difficulty)
        save_case(case)
        return case

    raise HTTPException(status_code=404, detail="Case not found.")


def _session_or_404(db, session_id: str) -> GameSession:
    session = db.get(GameSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Game session not found.")
    if session.status != "active":
        raise HTTPException(status_code=409, detail="This game session is no longer active.")
    return session


def create_session(case_id: str) -> dict:
    get_case_data(case_id)

    session_id = str(uuid4())
    now = datetime.now(timezone.utc)

    with SessionLocal() as db:
        session = GameSession(
            session_id=session_id,
            case_id=case_id,
            status="active",
            progress={
                "discovered_evidence": [],
                "completed_actions": [],
                "evidence_connections": [],
                "important_events": [],
                "interrogation_hits": 0,
                "asked_questions": [],
                "elapsed_seconds": 0,
                "time_penalty_seconds": 0,
            },
            created_at=now,
            updated_at=now,
        )
        db.add(session)
        db.commit()

    return {"session_id": session_id, "case_id": case_id, "status": "active"}


def get_session(session_id: str) -> dict:
    with SessionLocal() as db:
        session = db.get(GameSession, session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="Game session not found.")
        return {
            "session_id": session.session_id,
            "case_id": session.case_id,
            "status": session.status,
            "progress": session.progress,
        }


def _update_progress(session_id: str, callback) -> dict:
    with SessionLocal() as db:
        session = _session_or_404(db, session_id)
        case = get_case_data(session.case_id)
        progress = dict(session.progress or {})
        callback(case, progress)
        session.progress = progress
        session.updated_at = datetime.now(timezone.utc)
        flag_modified(session, "progress")
        db.commit()
        db.refresh(session)
        return {
            "session_id": session.session_id,
            "case_id": session.case_id,
            "status": session.status,
            "progress": session.progress,
        }


def discover_evidence(session_id: str, evidence_id: str) -> dict:
    def apply(case: Case, progress: dict):
        evidence = next((e for e in case.evidence if e.id == evidence_id), None)
        if evidence is None:
            raise HTTPException(status_code=404, detail="Evidence not found.")
        if not evidence.discoverable:
            raise HTTPException(status_code=409, detail="This evidence requires an investigation action.")
        if not set(evidence.requires_evidence_ids).issubset(progress["discovered_evidence"]):
            raise HTTPException(status_code=409, detail="Required evidence has not been discovered.")
        if not set(evidence.requires_action_ids).issubset(progress["completed_actions"]):
            raise HTTPException(status_code=409, detail="Required investigation actions are incomplete.")
        if evidence_id not in progress["discovered_evidence"]:
            progress["discovered_evidence"].append(evidence_id)

    return _update_progress(session_id, apply)


def complete_action(session_id: str, action_id: str) -> dict:
    def apply(case: Case, progress: dict):
        action = next((a for a in case.investigation_actions if a.id == action_id), None)
        if action is None:
            raise HTTPException(status_code=404, detail="Investigation action not found.")
        if action_id in progress["completed_actions"]:
            return
        if not set(action.requires_evidence_ids).issubset(progress["discovered_evidence"]):
            raise HTTPException(status_code=409, detail="Required evidence has not been discovered.")
        if not set(action.requires_action_ids).issubset(progress["completed_actions"]):
            raise HTTPException(status_code=409, detail="Required investigation actions are incomplete.")

        progress["completed_actions"].append(action_id)
        progress["time_penalty_seconds"] += action.time_cost_seconds

        for evidence_id in action.unlocks_evidence_ids:
            evidence = next((e for e in case.evidence if e.id == evidence_id), None)
            if evidence is None:
                continue
            if set(evidence.requires_evidence_ids).issubset(progress["discovered_evidence"]) and \
               set(evidence.requires_action_ids).issubset(progress["completed_actions"]) and \
               evidence_id not in progress["discovered_evidence"]:
                progress["discovered_evidence"].append(evidence_id)

    return _update_progress(session_id, apply)


def mark_question_asked(
    session_id: str, suspect_id: str, question_id: str
) -> tuple[dict, dict]:
    answer_result = {}

    def apply(case: Case, progress: dict):
        profile = next((p for p in case.interrogation if p.suspect_id == suspect_id), None)
        if profile is None:
            raise HTTPException(status_code=404, detail="Suspect not found.")
        question = next((q for q in profile.questions if q.id == question_id), None)
        if question is None:
            raise HTTPException(status_code=404, detail="Question not found.")

        key = f"{suspect_id}:{question_id}"

        if not set(question.requires_evidence_ids).issubset(progress["discovered_evidence"]):
            raise HTTPException(status_code=409, detail="Discover the required evidence before asking this question.")
        if not set(question.requires_action_ids).issubset(progress["completed_actions"]):
            raise HTTPException(status_code=409, detail="Complete the required investigation action before asking this question.")

        already_asked = key in progress["asked_questions"]
        response = question.answers[0]

        # Repeated questions remain allowed, but never earn another hit.
        hit = bool(response.contradiction) and not already_asked
        if not already_asked:
            progress["asked_questions"].append(key)

        if hit:
            progress["interrogation_hits"] = min(
                5, int(progress.get("interrogation_hits", 0)) + 1
            )

        answer_result.update({
            "answer": response.answer,
            # Speaking about evidence must never mark it as inspected.
            "reveals_evidence_id": None,
            "hit": hit,
        })


    updated = _update_progress(session_id, apply)
    return updated, answer_result


def record_analysis(
    session_id: str,
    evidence_connections: list[tuple[str, str]],
    important_events: list[str],
    elapsed_seconds: int,
) -> dict:
    def apply(case: Case, progress: dict):
        valid_evidence = {e.id for e in case.evidence}
        valid_suspects = {s.id for s in case.suspects}
        valid_events = {event.id for event in case.timeline}
        discovered = set(progress["discovered_evidence"])

        progress["evidence_connections"] = [
            [e, s] for e, s in evidence_connections
            if e in discovered and s in valid_suspects
        ]
        progress["important_events"] = [
            event for event in important_events if event in valid_events
        ]
        maximum = case.target_minutes * 60
        progress["elapsed_seconds"] = max(
            progress["elapsed_seconds"],
            min(maximum, max(0, elapsed_seconds)),
        )

    return _update_progress(session_id, apply)


def close_session(session_id: str) -> None:
    with SessionLocal() as db:
        session = _session_or_404(db, session_id)
        session.status = "completed"
        session.updated_at = datetime.now(timezone.utc)
        db.commit()
