from typing import Literal
from pydantic import BaseModel, Field

Difficulty = Literal["easy", "medium", "hard", "expert"]

class Victim(BaseModel):
    id: str
    name: str
    age: int
    occupation: str
    cause_of_death: str

class Suspect(BaseModel):
    id: str
    name: str
    age: int
    occupation: str
    relationship_to_victim: str
    description: str

class Location(BaseModel):
    id: str
    name: str
    description: str

class Evidence(BaseModel):
    id: str
    name: str
    description: str
    location_id: str
    discoverable: bool = True
    requires_evidence_ids: list[str] = Field(default_factory=list)
    requires_action_ids: list[str] = Field(default_factory=list)
    unlock_hint: str | None = None
    importance: Literal["critical", "supporting", "red_herring"]

class TimelineEvent(BaseModel):
    id: str
    time: str
    description: str
    location_id: str | None = None
    suspect_ids: list[str] = Field(default_factory=list)
    victim_involved: bool = False

class RedHerring(BaseModel):
    id: str
    description: str
    misleading_suspect_id: str | None = None

class InterrogationAnswer(BaseModel):
    question_id: str
    answer: str
    reveals_evidence_id: str | None = None
    contradiction: str | None = None

class InterrogationQuestion(BaseModel):
    id: str
    text: str
    requires_evidence_ids: list[str] = Field(default_factory=list)
    requires_action_ids: list[str] = Field(default_factory=list)
    unlock_hint: str | None = None
    answers: list[InterrogationAnswer]

class InvestigationAction(BaseModel):
    id: str
    title: str
    category: Literal["forensics", "records", "follow_up"] = "forensics"
    description: str
    requires_evidence_ids: list[str] = Field(default_factory=list)
    requires_action_ids: list[str] = Field(default_factory=list)
    unlocks_evidence_ids: list[str] = Field(default_factory=list)
    result_text: str
    time_cost_seconds: int = Field(default=45, ge=0, le=600)

class InterrogationProfile(BaseModel):
    suspect_id: str
    questions: list[InterrogationQuestion]

class Solution(BaseModel):
    killer_id: str
    motive: str
    method: str
    murder_time: str
    explanation: str

class Case(BaseModel):
    case_id: str
    title: str
    description: str
    difficulty: Difficulty
    target_minutes: int
    victim: Victim
    suspects: list[Suspect]
    locations: list[Location]
    evidence: list[Evidence]
    timeline: list[TimelineEvent]
    red_herrings: list[RedHerring]
    interrogation: list[InterrogationProfile]
    investigation_actions: list[InvestigationAction] = Field(default_factory=list)
    solution: Solution

class PublicInterrogationQuestion(BaseModel):
    id: str
    text: str
    requires_evidence_ids: list[str] = Field(default_factory=list)
    requires_action_ids: list[str] = Field(default_factory=list)
    unlock_hint: str | None = None

class PublicInterrogationProfile(BaseModel):
    suspect_id: str
    questions: list[PublicInterrogationQuestion]

class PublicCase(BaseModel):
    case_id: str
    title: str
    description: str
    difficulty: Difficulty
    target_minutes: int
    victim: Victim
    suspects: list[Suspect]
    locations: list[Location]
    evidence: list[Evidence]
    timeline: list[TimelineEvent]
    red_herrings: list[RedHerring]
    interrogation: list[PublicInterrogationProfile]
    investigation_actions: list[InvestigationAction] = Field(default_factory=list)

class AccusationRequest(BaseModel):
    killer_id: str
    motive: str
    method: str
    elapsed_seconds: int = 0
    discovered_evidence: list[str] = Field(default_factory=list)
    evidence_connections: list[tuple[str, str]] = Field(default_factory=list)
    important_events: list[str] = Field(default_factory=list)
    interrogation_hits: int = 0

class ScoreBreakdown(BaseModel):
    killer: int
    motive: int
    method: int
    evidence: int
    analysis: int
    interrogation: int
    time_bonus: int
    deductions: int
    total: int
    grade: str

class ScoreFeedback(BaseModel):
    submitted_answer: str
    points: int = Field(ge=0, le=15)
    max_points: int = 15
    explanation: str

class AccusationResult(BaseModel):
    correct: bool
    correct_killer: bool
    correct_motive: bool
    correct_method: bool
    solution: Solution
    score: ScoreBreakdown
    motive_feedback: ScoreFeedback | None = None
    method_feedback: ScoreFeedback | None = None


def to_public_case(case: Case) -> PublicCase:
    return PublicCase(
        case_id=case.case_id,
        title=case.title,
        description=case.description,
        difficulty=case.difficulty,
        target_minutes=case.target_minutes,
        victim=case.victim,
        suspects=case.suspects,
        locations=case.locations,
        evidence=case.evidence,
        timeline=case.timeline,
        red_herrings=case.red_herrings,
        interrogation=[
            PublicInterrogationProfile(
                suspect_id=profile.suspect_id,
                questions=[PublicInterrogationQuestion(
                    id=question.id,
                    text=question.text,
                    requires_evidence_ids=question.requires_evidence_ids,
                    requires_action_ids=question.requires_action_ids,
                    unlock_hint=question.unlock_hint,
                ) for question in profile.questions],
            ) for profile in case.interrogation
        ],
        investigation_actions=case.investigation_actions,
    )


class GenerateCaseRequest(BaseModel):
    difficulty: Difficulty
    theme: str | None = Field(default=None, max_length=120)

