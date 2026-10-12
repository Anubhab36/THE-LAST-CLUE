from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.services.case_generator import get_case
from app.services.case_registry import find_case

router = APIRouter(prefix="/api/interrogation", tags=["interrogation"])
class AnswerRequest(BaseModel):
    case_id: str
    suspect_id: str
    question_id: str
    discovered_evidence: list[str] = Field(default_factory=list)
    completed_actions: list[str] = Field(default_factory=list)

@router.post("/answer")
def answer(request: AnswerRequest):
    mapping={"case_001":"easy","case_002":"medium","case_003":"hard","case_004":"expert"}
    case = find_case(request.case_id)
    if case is None:
        if request.case_id not in mapping: raise HTTPException(404,"Case not found or generated case expired after a server restart.")
        case=get_case(mapping[request.case_id])
    profile=next((p for p in case.interrogation if p.suspect_id==request.suspect_id),None)
    if not profile: raise HTTPException(404,"Suspect not found")
    question=next((q for q in profile.questions if q.id==request.question_id),None)
    if not question: raise HTTPException(404,"Question not found")
    if not set(question.requires_evidence_ids).issubset(set(request.discovered_evidence)):
        raise HTTPException(status_code=409, detail="Discover the required evidence before asking this question.")
    if not set(question.requires_action_ids).issubset(set(request.completed_actions)):
        raise HTTPException(status_code=409, detail="Complete the required investigation action before asking this question.")
    a=question.answers[0]
    return {"answer":a.answer,"reveals_evidence_id":a.reveals_evidence_id,"hit":bool(a.reveals_evidence_id)}
