"""Persistent generated-case storage backed by PostgreSQL."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.game import GeneratedCase
from app.schemas.case import Case


def save_case(case: Case) -> None:
    """Persist the complete case, including its private solution."""
    with SessionLocal() as db:
        existing = db.get(GeneratedCase, case.case_id)

        data = case.model_dump(mode="json")
        if existing is None:
            existing = GeneratedCase(
                case_id=case.case_id,
                difficulty=case.difficulty,
                title=case.title,
                case_data=data,
            )
            db.add(existing)
        else:
            existing.difficulty = case.difficulty
            existing.title = case.title
            existing.case_data = data

        db.commit()


def find_case(case_id: str) -> Case | None:
    """Load a complete case from PostgreSQL."""
    with SessionLocal() as db:
        record = db.get(GeneratedCase, case_id)
        if record is None:
            return None
        return Case.model_validate(record.case_data)


def list_cases() -> list[str]:
    """Return IDs of persisted generated cases."""
    with SessionLocal() as db:
        return list(db.scalars(select(GeneratedCase.case_id)).all())
