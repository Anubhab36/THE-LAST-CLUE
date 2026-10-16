from app.services.case_generator import get_case
from app.services.case_validator import validate_case
from app.services.scoring_engine import score_case
from app.schemas.case import AccusationRequest


def test_all_cases_validate():
    for difficulty in ["easy", "medium", "hard", "expert"]:
        case = get_case(difficulty)
        validate_case(case)
        assert case.solution.killer_id in {s.id for s in case.suspects}


def test_hard_and_expert_evidence_counts_and_unlocks():
    hard = get_case("hard")
    expert = get_case("expert")
    assert len(hard.evidence) == 6
    assert len(expert.evidence) == 7
    assert hard.evidence[5].requires_action_ids == ["compare_security_fiber"]
    assert expert.evidence[5].requires_action_ids == ["analyze_medication"]
    assert expert.evidence[6].requires_action_ids == ["trace_collector_transaction"]


def test_evidence_prerequisites_reference_existing_evidence_and_actions():
    for difficulty in ["easy", "medium", "hard", "expert"]:
        case = get_case(difficulty)
        evidence_ids = {e.id for e in case.evidence}
        action_ids = {a.id for a in case.investigation_actions}
        for item in case.evidence:
            assert set(item.requires_evidence_ids) <= evidence_ids
            assert set(item.requires_action_ids) <= action_ids
        for action in case.investigation_actions:
            assert set(action.requires_evidence_ids) <= evidence_ids
            assert set(action.requires_action_ids) <= action_ids
            assert set(action.unlocks_evidence_ids) <= evidence_ids


def test_all_evidence_is_reachable_through_clue_and_action_graph():
    for difficulty in ["easy", "medium", "hard", "expert"]:
        case = get_case(difficulty)
        found = set()
        completed = set()
        changed = True
        while changed:
            changed = False
            for item in case.evidence:
                if item.id not in found and set(item.requires_evidence_ids) <= found and set(item.requires_action_ids) <= completed:
                    found.add(item.id)
                    changed = True
            for action in case.investigation_actions:
                if action.id not in completed and set(action.requires_evidence_ids) <= found and set(action.requires_action_ids) <= completed:
                    completed.add(action.id)
                    changed = True
        assert found == {item.id for item in case.evidence}, f"Unreachable evidence in {difficulty}"
        assert completed == {action.id for action in case.investigation_actions}, f"Unreachable action in {difficulty}"


def test_difficulties_have_distinct_depth_and_target_times():
    easy, medium, hard, expert = [get_case(d) for d in ["easy", "medium", "hard", "expert"]]
    assert [c.target_minutes for c in [easy, medium, hard, expert]] == [7, 15, 30, 50]
    assert [len(c.investigation_actions) for c in [easy, medium, hard, expert]] == [1, 2, 2, 3]
    assert len(expert.timeline) > len(hard.timeline) > len(medium.timeline)
    assert len(easy.timeline) > len(medium.timeline)  # easy is clue-clear, but has a full chronological record


def test_score_rejects_unearned_evidence_and_accepts_reasonable_answer_variation(monkeypatch):
    # Keep this unit test deterministic and independent of a live Gemini call.
    monkeypatch.setattr(
        "app.services.scoring_engine._semantic_match",
        lambda submitted, expected: True,
    )
    case = get_case("easy")
    result = score_case(case, AccusationRequest(
        killer_id=case.solution.killer_id,
        motive="financial fraud",
        method="blunt force trauma with a brass paperweight",
        elapsed_seconds=case.target_minutes * 60,
        discovered_evidence=["made_up_evidence_id"],
        evidence_connections=[("made_up_evidence_id", case.solution.killer_id)],
        important_events=["made_up_event"],
        interrogation_hits=99,
    ))
    assert result.correct_killer is True
    assert result.correct_motive is True
    assert result.correct_method is True
    assert result.score.evidence == 0
    assert result.score.deductions == 0
    assert result.score.interrogation == 10
    assert result.score.analysis == 0


def test_public_case_includes_investigation_actions():
    from app.schemas.case import to_public_case
    case = get_case("expert")
    public = to_public_case(case)
    assert len(public.investigation_actions) == 3
    assert public.investigation_actions[0].id == "analyze_medication"


def test_action_gated_evidence_is_not_revealed_by_interrogation_shortcut():
    hard = get_case("hard")
    gated = {item.id for item in hard.evidence if item.requires_action_ids}
    for profile in hard.interrogation:
        for question in profile.questions:
            for answer in question.answers:
                assert answer.reveals_evidence_id not in gated


def test_interrogation_dialogue_varies_by_suspect_and_innocents_can_be_inconsistent():
    for difficulty in ["easy", "medium", "hard", "expert"]:
        case = get_case(difficulty)
        profiles = {profile.suspect_id: profile for profile in case.interrogation}
        killer_id = case.solution.killer_id
        innocent_profiles = [profile for sid, profile in profiles.items() if sid != killer_id]
        opening_answers = [profile.questions[0].answers[0].answer for profile in innocent_profiles]
        assert len(opening_answers) == len(set(opening_answers)), f"repeated opening dialogue in {difficulty}"
        assert all("I told investigators everything I remembered." not in answer for profile in profiles.values() for question in profile.questions for answer in [question.answers[0].answer])
        assert any(question.answers[0].contradiction for profile in innocent_profiles for question in profile.questions), f"innocents never have an inconsistency in {difficulty}"


def test_interrogation_questions_have_distinct_prompts_and_answers():
    for difficulty in ["easy", "medium", "hard", "expert"]:
        case = get_case(difficulty)
        for profile in case.interrogation:
            prompts = [question.text for question in profile.questions]
            answers = [question.answers[0].answer for question in profile.questions]
            assert len(prompts) == len(set(prompts))
            assert len(answers) == len(set(answers)), f"repeated answers for {profile.suspect_id} in {difficulty}"


def test_interrogation_api_does_not_expose_contradiction_marker():
    from app.api.interrogation import AnswerRequest, answer
    case = get_case("easy")
    profile = next(p for p in case.interrogation if p.suspect_id == case.solution.killer_id)
    question = profile.questions[0]
    response = answer(AnswerRequest(
        case_id=case.case_id,
        suspect_id=profile.suspect_id,
        question_id=question.id,
        discovered_evidence=[],
        completed_actions=[],
    ))
    assert "contradiction" not in response
    assert "DETAIL TO VERIFY" not in response["answer"]


def test_developer_social_links_are_configured():
    from pathlib import Path
    footer = Path(__file__).resolve().parents[2] / "frontend" / "src" / "components" / "DeveloperFooter.tsx"
    source = footer.read_text()
    assert "https://www.instagram.com/_anoobhab_/" in source
    assert "https://www.linkedin.com/in/anubhab-chakraborty-4h28s" in source
    assert "https://github.com/Anubhab36" in source
    assert "replace_with_username" not in source



def test_semantic_refinement_awards_partial_credit_without_marking_answer_correct(monkeypatch):
    from app.services.scoring_engine import (
        SemanticJudgment,
        refine_semantic_answers,
    )

    case = get_case("easy")
    request = AccusationRequest(
        killer_id=case.solution.killer_id,
        motive="a partly relevant but incomplete explanation",
        method="an unrelated method",
        elapsed_seconds=case.target_minutes * 60,
    )
    initial = score_case(case, request)
    assert initial.score.motive == 0
    assert initial.score.method == 0

    monkeypatch.setattr(
        "app.services.scoring_engine._semantic_judgment",
        lambda submitted, expected: SemanticJudgment(
            equivalent=False,
            confidence=90,
            points=8,
            rationale="Captures part of the central idea.",
        ),
    )

    refined = refine_semantic_answers(case, request, initial)

    assert refined.score.motive == 8
    assert refined.score.method == 8
    assert refined.score.total == min(100, initial.score.total + 16)
    assert refined.correct_motive is False
    assert refined.correct_method is False
    assert refined.correct is False


def test_semantic_judgment_failure_awards_no_extra_credit(monkeypatch):
    from app.services.scoring_engine import refine_semantic_answers

    case = get_case("easy")
    request = AccusationRequest(
        killer_id=case.solution.killer_id,
        motive="unrelated answer",
        method="another unrelated answer",
        elapsed_seconds=case.target_minutes * 60,
    )
    initial = score_case(case, request)
    monkeypatch.setattr(
        "app.services.scoring_engine._semantic_judgment",
        lambda submitted, expected: None,
    )

    refined = refine_semantic_answers(case, request, initial)

    assert refined.score.total == initial.score.total
    assert refined.score.motive == initial.score.motive
    assert refined.score.method == initial.score.method
