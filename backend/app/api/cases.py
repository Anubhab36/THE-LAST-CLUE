import logging
import re
from fastapi import APIRouter, HTTPException

from app.schemas.case import (
    Difficulty,
    PublicCase,
    to_public_case,
    AccusationRequest,
    AccusationResult,
    GenerateCaseRequest,
)
from app.services.case_generator import get_case
from app.services.ai_case_generator import generate_case
from app.services.scoring_engine import score_case
from app.services.case_registry import save_case, find_case

logger = logging.getLogger(__name__)

def format_quota_wait_time(error_text: str) -> str:
    """Extract Gemini's retry delay and format it for the player."""

    # Matches messages such as:
    # "Please retry in 17h33m6.94s"
    match = re.search(
        r"retry in\s+"
        r"(?:(\d+)h)?"
        r"(?:(\d+)m)?"
        r"(?:(\d+(?:\.\d+)?)s)?",
        error_text,
        re.IGNORECASE,
    )

    if match:
        hours = int(match.group(1) or 0)
        minutes = int(match.group(2) or 0)
        seconds = float(match.group(3) or 0)

        total_seconds = hours * 3600 + minutes * 60 + seconds
        total_minutes = max(1, int((total_seconds + 59) // 60))

        hours, minutes = divmod(total_minutes, 60)

        if hours and minutes:
            return f"{hours} hours and {minutes} minutes"
        if hours:
            return f"{hours} hours"
        return f"{minutes} minutes"

    # Gemini did not provide a usable retry delay.
    return "a little while"


router = APIRouter(prefix="/api/cases", tags=["cases"])

BUILT_IN_CASES = {
    "case_001": "easy",
    "case_002": "medium",
    "case_003": "hard",
    "case_004": "expert",
}


def load(difficulty: Difficulty):
    try:
        return get_case(difficulty)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to load the selected case.",
        ) from exc



@router.post("/generate", response_model=PublicCase)
def generate(request: GenerateCaseRequest):
    try:
        generated = generate_case(request.difficulty, request.theme)
        save_case(generated)

    except Exception as exc:
        logger.exception("Case generation or persistence failed")
        message = str(exc)

        # Detect Gemini quota exhaustion.
        is_quota_error = (
            getattr(exc, "code", None) == 429
            or getattr(exc, "status_code", None) == 429
            or "RESOURCE_EXHAUSTED" in message
            or "quota exceeded" in message.lower()
            or "generate_content_free_tier_requests" in message
        )

        if is_quota_error:
            wait_time = format_quota_wait_time(message)

            raise HTTPException(
                status_code=429,
                detail=(
                    "AI Cases are not available right now. "
                    f"Please try again after {wait_time}. "
                    "Sorry for the inconvenience."
                ),
            ) from exc

        # Keep configuration errors understandable.
        if "GEMINI_API_KEY" in message:
            raise HTTPException(
                status_code=503,
                detail="The AI service is not configured correctly.",
            ) from exc

        raise HTTPException(
            status_code=502,
            detail=(
                "We couldn't generate your AI case right now. "
                "Please try again later."
            ),
        ) from exc

    return to_public_case(generated)



@router.get("/{difficulty}", response_model=PublicCase)
def case(difficulty: Difficulty):
    return to_public_case(load(difficulty))


@router.post("/{case_id}/accuse", response_model=AccusationResult)
def accuse(case_id: str, request: AccusationRequest):
    generated = find_case(case_id)

    if generated is not None:
        return score_case(generated, request)

    difficulty = BUILT_IN_CASES.get(case_id)
    if difficulty is None:
        raise HTTPException(status_code=404, detail="Case not found.")

    return score_case(load(difficulty), request)
