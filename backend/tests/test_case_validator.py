import pytest

from app.services.case_generator import get_case
from app.services.case_validator import CaseValidationError, validate_case


def test_rejects_missing_interrogation_profile():
    case = get_case("easy").model_copy(deep=True)
    case.interrogation.pop()

    with pytest.raises(CaseValidationError, match="interrogation"):
        validate_case(case)


def test_rejects_duplicate_interrogation_profile():
    case = get_case("easy").model_copy(deep=True)
    case.interrogation.append(case.interrogation[0].model_copy(deep=True))

    with pytest.raises(CaseValidationError, match="Duplicate interrogation profile"):
        validate_case(case)


def test_rejects_profile_for_unknown_suspect():
    case = get_case("easy").model_copy(deep=True)
    case.interrogation[0].suspect_id = "unknown_suspect"

    with pytest.raises(CaseValidationError, match="unknown suspect"):
        validate_case(case)


def test_rejects_answer_revealing_unknown_evidence():
    case = get_case("easy").model_copy(deep=True)
    case.interrogation[0].questions[0].answers[0].reveals_evidence_id = (
        "unknown_evidence"
    )

    with pytest.raises(CaseValidationError, match="unknown evidence"):
        validate_case(case)
