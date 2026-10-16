"""Game session endpoints."""
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.schemas.case import AccusationRequest
from app.db import SessionLocal
from app.models.game import GameSession
from app.services.session_service import (
    create_session,
    get_session,
    discover_evidence,
    complete_action,
    record_analysis,
    close_session,
    save_refined_score,
    get_case_data,
)
from app.services.session_service import mark_question_asked
from app.services.scoring_engine import score_case, refine_semantic_answers
from app.schemas.case import AccusationResult

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


def get_session_created_at(session_id: str) -> datetime:
    with SessionLocal() as db:
        session = db.get(GameSession, session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="Game session not found.")
        created_at = session.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        return created_at



class CreateSessionRequest(BaseModel):
    case_id: str


class EvidenceRequest(BaseModel):
    evidence_id: str


class ActionRequest(BaseModel):
    action_id: str


class InterrogationRequest(BaseModel):
    suspect_id: str
    question_id: str


class AnalysisRequest(BaseModel):
    evidence_connections: list[tuple[str, str]] = Field(default_factory=list)
    important_events: list[str] = Field(default_factory=list)
    elapsed_seconds: int = Field(default=0, ge=0)


class FinalAccusationRequest(BaseModel):
    killer_id: str
    motive: str
    method: str
    elapsed_seconds: int = Field(default=0, ge=0)

class ScoreRefinementRequest(BaseModel):
    motive: str
    method: str


@router.post("")
def create(request: CreateSessionRequest):
    return create_session(request.case_id)


@router.get("/{session_id}")
def read(session_id: str):
    return get_session(session_id)


@router.post("/{session_id}/evidence")
def evidence(session_id: str, request: EvidenceRequest):
    return discover_evidence(session_id, request.evidence_id)


@router.post("/{session_id}/actions")
def action(session_id: str, request: ActionRequest):
    return complete_action(session_id, request.action_id)


@router.post("/{session_id}/interrogation")
def interrogation(session_id: str, request: InterrogationRequest):
    _, answer = mark_question_asked(session_id, request.suspect_id, request.question_id)
    return answer


@router.post("/{session_id}/analysis")
def analysis(session_id: str, request: AnalysisRequest):
    return record_analysis(
        session_id,
        request.evidence_connections,
        request.important_events,
        request.elapsed_seconds,
    )


@router.post("/{session_id}/accuse")
def accuse(session_id: str, request: FinalAccusationRequest):
    session_data = get_session(session_id)
    if session_data["status"] != "active":
        raise HTTPException(status_code=409, detail="This game session is no longer active.")

    case = get_case_data(session_data["case_id"])
    progress = session_data["progress"]
    trusted_request = AccusationRequest(
        killer_id=request.killer_id,
        motive=request.motive,
        method=request.method,
        elapsed_seconds=max(
            0,
            int(
                (
                    datetime.now(timezone.utc)
                    - get_session_created_at(session_id)
                ).total_seconds()
            )
            + int(progress.get("time_penalty_seconds", 0)),
        ),
        discovered_evidence=progress["discovered_evidence"],
        evidence_connections=[tuple(pair) for pair in progress["evidence_connections"]],
        important_events=progress["important_events"],
        interrogation_hits=progress["interrogation_hits"],
    )
    result = score_case(case, trusted_request)
    close_session(
        session_id,
        initial_score_result=result.model_dump(mode="json"),
        accusation_answers={
            "killer_id": request.killer_id,
            "motive": request.motive,
            "method": request.method,
        },
    )
    return result




@router.post("/{session_id}/score-refinement", response_model=AccusationResult)
def refine_score(session_id: str, request: ScoreRefinementRequest):
    """Return the complete authoritative result; never accept client-calculated points."""
    session_data = get_session(session_id)

    if session_data["status"] != "completed":
        raise HTTPException(
            status_code=409,
            detail="The game must be scored before its score can be refined.",
        )

    progress = session_data["progress"]
    cached_result = progress.get("refined_score_result")
    if cached_result:
        return AccusationResult.model_validate(cached_result)

    stored_result = progress.get("initial_score_result")
    stored_answers = progress.get("accusation_answers")
    if not stored_result or not stored_answers:
        raise HTTPException(
            status_code=409,
            detail="The initial score is unavailable for refinement.",
        )

    case = get_case_data(session_data["case_id"])
    initial = AccusationResult.model_validate(stored_result)
    # Use the answers saved when the accusation was submitted, not values
    # supplied by a later client request.
    trusted_request = AccusationRequest(
        killer_id=stored_answers["killer_id"],
        motive=stored_answers["motive"],
        method=stored_answers["method"],
    )
    refined = refine_semantic_answers(case, trusted_request, initial)
    result_data = refined.model_dump(mode="json")
    save_refined_score(session_id, result_data)
    return refined
