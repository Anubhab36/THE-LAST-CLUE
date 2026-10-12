"""Gemini-powered case generation with strict schema and deterministic validation.

Generated cases are held in process memory for this Phase 1 prototype. Phase 2
will move canonical cases and sessions to PostgreSQL.
"""
from __future__ import annotations

import os
import uuid

from pydantic import ValidationError

from app.schemas.case import Case, Difficulty
from app.services.case_validator import CaseValidationError, validate_case

TARGET_MINUTES = {"easy": 7, "medium": 15, "hard": 30, "expert": 50}
CASE_COUNTS = {
    "easy": (4, 5, 6),
    "medium": (4, 6, 8),
    "hard": (5, 7, 10),
    "expert": (5, 8, 12),
}


def _client():
    try:
        from google import genai
    except ImportError as exc:
        raise RuntimeError("Google Gemini SDK is not installed. Run: python -m pip install -r requirements.txt") from exc
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured. Add your key to backend/.env and restart the API.")
    return genai.Client(api_key=api_key)


def _prompt(difficulty: Difficulty, theme: str | None) -> str:
    suspects, evidence, events = CASE_COUNTS[difficulty]
    target = TARGET_MINUTES[difficulty]
    theme_text = theme.strip() if theme and theme.strip() else "Choose an original, grounded mystery setting."
    return f"""Create a complete, original, fair, fictional murder-mystery case for a detective game.
Difficulty: {difficulty}. Target duration must be exactly {target} minutes.
Theme guidance: {theme_text}
Required scale: 4 suspects exactly; at least {evidence} and at most {evidence + 2} evidence items; at least {events} timeline events.
Return a complete object matching the supplied JSON schema. Use IDs consistently: suspect_001..., location_001..., evidence_001..., t001..., rh001..., action IDs in snake_case, question IDs q1/q2/q3.
Rules:
- The solution must have exactly one killer among the suspects, a clear motive, method, murder time, and a logically supported explanation.
- All events and clues must agree with the solution. No impossible timeline, duplicate identities, or unexplained critical facts.
- Include 1-3 red herrings that are suspicious but fairly resolvable.
- Every evidence location_id must exist. Every referenced suspect/evidence/action ID must exist.
- Every clue and action must be reachable. Use only prerequisite chains that can start with evidence requiring no prerequisites. Do not create cycles.
- Make at least one investigation action for medium/hard/expert and at least one for easy; each action must have sensible prerequisites and results. Actions may unlock evidence.
- Include an interrogation profile for each suspect and at least three distinct questions per suspect. Every question has an answer. Suspect answers must be character-specific. Innocent suspects may be evasive or imperfect, but do not mark the killer specially and do not include UI labels such as 'DETAIL TO VERIFY'.
- Never state or reveal the solution in public-facing case descriptions, evidence descriptions, timeline descriptions, red herrings, or interrogation answers. The solution is only in the solution object.
- Evidence importance must be critical, supporting, or red_herring. Avoid graphic detail.
- Use a coherent setting, varied motives, credible forensic clues, and natural dialogue. No copyrighted characters or existing famous mystery plots.
- `case_id` must be a temporary unique-looking string; the server will replace it. Do not include API keys or external URLs.
"""


def generate_case(difficulty: Difficulty, theme: str | None = None) -> Case:
    client = _client()
    from google.genai import types
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip() or "gemini-2.5-flash"
    response = client.models.generate_content(
        model=model,
        contents=_prompt(difficulty, theme),
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_json_schema=Case.model_json_schema(),
            temperature=0.85,
        ),
    )
    if not response.text:
        raise RuntimeError("Gemini returned an empty response. Please try again.")
    try:
        case = Case.model_validate_json(response.text)
    except ValidationError as exc:
        raise RuntimeError("Gemini generated a case that did not match the case schema. Please retry.") from exc
    case.case_id = f"generated_{uuid.uuid4().hex[:12]}"
    case.difficulty = difficulty
    case.target_minutes = TARGET_MINUTES[difficulty]
    # Validate all references, dependencies and reachability before making a case playable.
    try:
        validate_case(case)
    except (CaseValidationError, ValidationError, ValueError) as exc:
        raise RuntimeError(f"Generated case failed validation: {exc}") from exc
    return case
