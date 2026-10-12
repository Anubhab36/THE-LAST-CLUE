from app.schemas.case import Case

class CaseValidationError(Exception):
    pass

def validate_case(case: Case) -> None:
    suspect_ids = {s.id for s in case.suspects}
    location_ids = {l.id for l in case.locations}
    evidence_ids = {e.id for e in case.evidence}
    action_ids = {a.id for a in case.investigation_actions}
    if len(case.suspects) != 4:
        raise CaseValidationError("A playable case must contain exactly four suspects.")
    for label, values in (("suspect", [x.id for x in case.suspects]), ("location", [x.id for x in case.locations]), ("timeline event", [x.id for x in case.timeline]), ("red herring", [x.id for x in case.red_herrings]), ("interrogation profile", [x.suspect_id for x in case.interrogation])):
        if len(values) != len(set(values)):
            raise CaseValidationError(f"Duplicate {label} identifiers.")
    if len({x.id for x in case.locations}) != len(case.locations):
        raise CaseValidationError("Duplicate location IDs.")
    if len({x.id for x in case.timeline}) != len(case.timeline):
        raise CaseValidationError("Duplicate timeline IDs.")
    if len({x.id for x in case.investigation_actions}) != len(case.investigation_actions):
        raise CaseValidationError("Duplicate investigation action IDs.")
    if len({x.id for x in case.evidence}) != len(case.evidence):
        raise CaseValidationError("Duplicate evidence IDs.")
    expected = {"easy": (5, 8), "medium": (12, 18), "hard": (25, 35), "expert": (40, 55)}

    if case.solution.killer_id not in suspect_ids:
        raise CaseValidationError("Solution references an unknown killer.")
    if not expected[case.difficulty][0] <= case.target_minutes <= expected[case.difficulty][1]:
        raise CaseValidationError("Target duration is outside the difficulty range.")
    if len(evidence_ids) != len(case.evidence):
        raise CaseValidationError("Duplicate evidence IDs.")
    for e in case.evidence:
        if e.location_id not in location_ids:
            raise CaseValidationError(f"Evidence {e.id} references an unknown location.")
        if any(required not in evidence_ids for required in e.requires_evidence_ids):
            raise CaseValidationError(f"Evidence {e.id} references an unknown prerequisite.")
        if e.id in e.requires_evidence_ids:
            raise CaseValidationError(f"Evidence {e.id} cannot require itself.")
        if any(action_id not in action_ids for action_id in e.requires_action_ids):
            raise CaseValidationError(f"Evidence {e.id} references an unknown investigation action.")
    for event in case.timeline:
        if event.location_id and event.location_id not in location_ids:
            raise CaseValidationError(f"Timeline {event.id} references an unknown location.")
        if any(s not in suspect_ids for s in event.suspect_ids):
            raise CaseValidationError(f"Timeline {event.id} references an unknown suspect.")
    for action in case.investigation_actions:
        if any(eid not in evidence_ids for eid in action.requires_evidence_ids + action.unlocks_evidence_ids):
            raise CaseValidationError(f"Investigation action {action.id} references unknown evidence.")
        if any(aid not in action_ids for aid in action.requires_action_ids):
            raise CaseValidationError(f"Investigation action {action.id} references an unknown prerequisite action.")
    for profile in case.interrogation:
        if profile.suspect_id not in suspect_ids:
            raise CaseValidationError("Interrogation references an unknown suspect.")
        question_ids = [q.id for q in profile.questions]
        if len(question_ids) != len(set(question_ids)):
            raise CaseValidationError(f"Duplicate interrogation question IDs for {profile.suspect_id}.")
        if len(profile.questions) < 3:
            raise CaseValidationError(f"Suspect {profile.suspect_id} needs at least three interrogation questions.")
        for q in profile.questions:
            if any(aid not in action_ids for aid in q.requires_action_ids):
                raise CaseValidationError(f"Question {q.id} references an unknown action.")
            if any(eid not in evidence_ids for eid in q.requires_evidence_ids):
                raise CaseValidationError(f"Question {q.id} references unknown prerequisite evidence.")
            if any(aid not in action_ids for aid in q.requires_action_ids):
                raise CaseValidationError(f"Question {q.id} references unknown prerequisite action.")
            if not q.answers:
                raise CaseValidationError(f"Question {q.id} has no answers.")
            for a in q.answers:
                if a.reveals_evidence_id and a.reveals_evidence_id not in evidence_ids:
                    raise CaseValidationError("Interrogation references unknown evidence.")
    # Prove every clue and action can be reached from the initial case state.
    reachable_evidence = set()
    completed_actions = set()
    changed = True
    while changed:
        changed = False
        for evidence in case.evidence:
            if (evidence.id not in reachable_evidence
                and set(evidence.requires_evidence_ids) <= reachable_evidence
                and set(evidence.requires_action_ids) <= completed_actions):
                reachable_evidence.add(evidence.id)
                changed = True
        for action in case.investigation_actions:
            if (action.id not in completed_actions
                and set(action.requires_evidence_ids) <= reachable_evidence
                and set(action.requires_action_ids) <= completed_actions):
                completed_actions.add(action.id)
                changed = True
    if reachable_evidence != evidence_ids:
        unreachable = sorted(evidence_ids - reachable_evidence)
        raise CaseValidationError(f"Evidence is unreachable from the starting state: {', '.join(unreachable)}")
    if completed_actions != action_ids:
        unreachable_actions = sorted(action_ids - completed_actions)
        raise CaseValidationError(f"Investigation actions are unreachable: {', '.join(unreachable_actions)}")

