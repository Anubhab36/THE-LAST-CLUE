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
from app.services.case_generator import get_case, get_case_by_id, get_case_catalog
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
    # Only generation failures trigger the built-in fallback.
    try:
        generated = generate_case(request.difficulty, request.theme)
    except Exception:
        logger.exception(
            "AI case generation failed; using built-in %s case",
            request.difficulty,
        )
        try:
            fallback = get_case(request.difficulty)
        except Exception as fallback_exc:
            logger.exception("Unable to load built-in fallback case")
            raise HTTPException(
                status_code=500,
                detail="Unable to generate or load a case right now.",
            ) from fallback_exc

        return to_public_case(fallback)

    # Persistence errors must not be misreported as AI generation errors.
    try:
        save_case(generated)
    except Exception as exc:
        logger.exception("Generated case could not be persisted")
        raise HTTPException(
            status_code=503,
            detail="The case could not be saved right now. Please try again.",
        ) from exc

    return to_public_case(generated)


@router.get("/catalog")
def case_catalog():
    """Return the selectable built-in case library."""
    return get_case_catalog()


@router.get("/by-id/{case_id}", response_model=PublicCase)
def case_by_id(case_id: str):
    """Return the public version of a specific persisted or built-in case."""
    existing = find_case(case_id)
    if existing is not None:
        return to_public_case(existing)

    try:
        return to_public_case(get_case_by_id(case_id))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Case not found.") from exc


@router.get("/{difficulty}", response_model=PublicCase)
def case(difficulty: Difficulty):
    return to_public_case(load(difficulty))


@router.post("/{case_id}/accuse", response_model=AccusationResult)
def accuse(case_id: str, request: AccusationRequest):
    generated = find_case(case_id)

    if generated is not None:
        return score_case(generated, request)

    try:
        built_in = get_case_by_id(case_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Case not found.") from exc

    return score_case(built_in, request)
