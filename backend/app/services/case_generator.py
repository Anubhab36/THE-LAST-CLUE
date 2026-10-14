from app.schemas.case import *
from app.services.case_validator import validate_case


def _base_interrogation(suspects, evidence_ids, killer_id):
    """Build suspect-specific, imperfect accounts without making contradiction a guilt flag.

    Innocent suspects can misremember details or protect unrelated secrets. The
    underlying solution remains deterministic; inconsistencies are prompts to verify
    claims against evidence, not proof of guilt.
    """
    profiles = []
    innocent_openings = [
        "I was occupied with a personal matter. I understand how that sounds, but it was not about Victor's death.",
        "I remember the evening in fragments. I can tell you what I did, but I will not pretend every minute is exact.",
        "I had a reason to avoid Victor that night. That reason is embarrassing, not violent.",
        "I was moving between rooms and speaking to people. Someone may remember seeing me differently than I do.",
    ]
    innocent_relationships = [
        "Our relationship was complicated. We disagreed about practical matters, but that is not the same as wanting him dead.",
        "Victor could be difficult, and I had my own frustrations. I would rather not turn private family matters into gossip.",
        "We were on professional terms, though recently there had been tension over responsibilities and trust.",
        "I knew his routines well enough to help, but that does not mean I knew everything happening in his private life.",
    ]
    innocent_followups = [
        "I may have the order of events wrong. I remember the conversation, but I cannot swear to the exact time.",
        "There is one detail I left out because it makes me look foolish. I was somewhere else briefly, and I did not think it mattered.",
        "If a record places me somewhere else, check its timestamp carefully. My memory of that part of the evening is not precise.",
        "I did not tell you everything at first. I was trying to keep an unrelated matter private, not conceal an attack.",
    ]
    for index, suspect in enumerate(suspects):
        is_killer = suspect.id == killer_id
        if is_killer:
            answers = [
                InterrogationAnswer(question_id="q1", answer="I was not alone with Victor during the important part of the evening. I only passed near that area.", reveals_evidence_id=evidence_ids[0] if evidence_ids else None, contradiction="The account leaves a gap that should be checked against the physical evidence and timeline."),
                InterrogationAnswer(question_id="q2", answer=f"{suspect.name.split()[0]} and Victor had a disagreement, but it was nothing that could not have been resolved.", reveals_evidence_id=evidence_ids[1] if len(evidence_ids) > 1 else None),
                InterrogationAnswer(question_id="q3", answer="I am confident about when I left. I did not return to that room afterward.", contradiction="This precise claim should be compared with the independently recorded sequence of events."),
            ]
        else:
            answers = [
                InterrogationAnswer(question_id="q1", answer=innocent_openings[index % len(innocent_openings)]),
                InterrogationAnswer(question_id="q2", answer=innocent_relationships[index % len(innocent_relationships)]),
                InterrogationAnswer(question_id="q3", answer=innocent_followups[index % len(innocent_followups)], contradiction=(
                    "The suspect's recollection of the sequence is uncertain; verify it against independent timestamps."
                    if index % 2 == 0 else None
                )),
            ]
        questions = [
            InterrogationQuestion(id=f"{suspect.id}_q1", text="Where were you during the critical part of the evening?", answers=[answers[0]]),
            InterrogationQuestion(id=f"{suspect.id}_q2", text="What was your relationship with the victim?", requires_evidence_ids=[evidence_ids[0]] if evidence_ids else [], unlock_hint="Inspect the first key piece of evidence before pressing this point.", answers=[answers[1]]),
            InterrogationQuestion(id=f"{suspect.id}_q3", text="Which part of your account could be independently checked?", requires_evidence_ids=[evidence_ids[1]] if len(evidence_ids) > 1 else [], unlock_hint="Find the second linked clue to unlock a more specific follow-up.", answers=[answers[2]]),
        ]
        profiles.append(InterrogationProfile(suspect_id=suspect.id, questions=questions))
    return profiles


def easy_case() -> Case:
    suspects = [
        Suspect(id="suspect_001", name="Daniel Hale", age=34, occupation="Financial Advisor", relationship_to_victim="Son", description="Victor's estranged son. Deeply in debt and openly resentful of his father."),
        Suspect(id="suspect_002", name="Martha Hale", age=52, occupation="Interior Designer", relationship_to_victim="Wife", description="Victor's second wife. Calm, composed, and financially dependent on him."),
        Suspect(id="suspect_003", name="Evan Brooks", age=41, occupation="Business Partner", relationship_to_victim="Business Partner", description="Victor's long-time business partner. Recently confronted over missing company funds."),
        Suspect(id="suspect_004", name="Laura Reed", age=29, occupation="House Manager", relationship_to_victim="Employee", description="Managed the Hale residence and knew the household routine."),
    ]
    evidence = [
        Evidence(id="evidence_001", name="Broken Paperweight", description="A heavy brass paperweight with a fresh impact mark and traces of the victim's blood.", location_id="location_002", importance="critical"),
        Evidence(id="evidence_002", name="Torn Financial Document", description="A torn ledger page showing irregular transfers from Victor's company into an account linked to Evan.", location_id="location_002", importance="critical"),
        Evidence(id="evidence_003", name="Dinner Plate", description="A half-finished plate from the family dinner. Nothing immediately unusual, but it anchors the evening routine.", location_id="location_001", importance="supporting"),
        Evidence(id="evidence_004", name="Broken Watch", description="Victor's wristwatch stopped at 21:15 after its glass was shattered.", location_id="location_002", importance="critical"),
        Evidence(id="evidence_005", name="Wet Umbrella", description="An umbrella is still wet despite no rain falling after the evening began. It creates suspicion around Laura's movements.", location_id="location_001", importance="red_herring"),
    ]
    timeline = [
        TimelineEvent(id="t01", time="20:00", description="Dinner begins in the dining room.", location_id="location_001", suspect_ids=["suspect_001","suspect_002","suspect_003","suspect_004"], victim_involved=True),
        TimelineEvent(id="t02", time="20:20", description="Daniel leaves the table after a heated exchange with Victor.", location_id="location_001", suspect_ids=["suspect_001"], victim_involved=True),
        TimelineEvent(id="t03", time="20:25", description="Martha remains in the dining room.", location_id="location_001", suspect_ids=["suspect_002"]),
        TimelineEvent(id="t04", time="20:35", description="Laura clears the dinner table.", location_id="location_001", suspect_ids=["suspect_004"]),
        TimelineEvent(id="t05", time="20:40", description="Evan asks Victor to speak privately about company accounts.", location_id="location_001", suspect_ids=["suspect_003"], victim_involved=True),
        TimelineEvent(id="t06", time="20:50", description="Victor enters the study alone.", location_id="location_002", victim_involved=True),
        TimelineEvent(id="t07", time="20:55", description="Martha begins a phone call upstairs.", location_id="location_001", suspect_ids=["suspect_002"]),
        TimelineEvent(id="t08", time="21:00", description="Daniel leaves the residence for a short drive.", location_id="location_001", suspect_ids=["suspect_001"]),
        TimelineEvent(id="t09", time="21:05", description="Evan is seen heading toward the study.", location_id="location_002", suspect_ids=["suspect_003"]),
        TimelineEvent(id="t10", time="21:10", description="The study door closes.", location_id="location_002", suspect_ids=["suspect_003"]),
        TimelineEvent(id="t11", time="21:15", description="A heavy impact is heard from the study.", location_id="location_002", suspect_ids=["suspect_003"], victim_involved=True),
        TimelineEvent(id="t12", time="21:20", description="Evan returns to the hallway and says Victor is still working.", location_id="location_001", suspect_ids=["suspect_003"]),
        TimelineEvent(id="t13", time="21:25", description="Laura notices the study door is closed.", location_id="location_001", suspect_ids=["suspect_004"]),
        TimelineEvent(id="t14", time="21:30", description="Martha ends her call and goes downstairs.", location_id="location_001", suspect_ids=["suspect_002"]),
        TimelineEvent(id="t15", time="21:35", description="Victor is discovered unresponsive in the study.", location_id="location_002", victim_involved=True),
    ]
    solution = Solution(killer_id="suspect_003", motive="Financial fraud", method="Blunt-force trauma with the brass paperweight", murder_time="21:15", explanation="Evan confronted Victor about the missing company funds, entered the study during the critical window, struck him with the paperweight, and staged the scene as an unexplained accident.")
    case = Case(case_id="case_001", title="The Locked Study", description="A businessman is found dead inside his study. Everyone has a reason to lie, but only one suspect had both motive and opportunity.", difficulty="easy", target_minutes=7, victim=Victim(id="victim_001", name="Victor Hale", age=58, occupation="Businessman", cause_of_death="Blunt-force trauma"), suspects=suspects, locations=[Location(id="location_001", name="Hale Residence", description="The main living area of the Hale family home."), Location(id="location_002", name="Study", description="Victor's private study containing his financial records.")], evidence=evidence, timeline=timeline, red_herrings=[RedHerring(id="rh1", description="The wet umbrella suggests Laura came and went during the critical window.", misleading_suspect_id="suspect_004"), RedHerring(id="rh2", description="Daniel's argument and debt make him look immediately suspicious.", misleading_suspect_id="suspect_001")], interrogation=[], solution=solution)
    case.interrogation = _base_interrogation(suspects, ["evidence_002", "evidence_004"], "suspect_003")
    validate_case(case)
    return case


def medium_case() -> Case:
    case = easy_case().model_copy(deep=True)
    case.case_id = "case_002"
    case.title = "The Gallery After Midnight"
    case.description = "A gallery owner is found dead after a private showing. Four people knew about a missing painting and the alarm schedule."
    case.difficulty = "medium"
    case.target_minutes = 15
    case.victim = Victim(id="victim_002", name="Nadia Mercer", age=46, occupation="Gallery Owner", cause_of_death="Poisoning")
    case.locations = [Location(id="location_001", name="Mercer Gallery", description="A private contemporary art gallery."), Location(id="location_002", name="Restoration Room", description="A secured room where valuable works are repaired.")]
    case.suspects = [Suspect(id="suspect_001", name="Julian Cross", age=38, occupation="Collector", relationship_to_victim="Client", description="A wealthy collector whose purchase was recently rejected."), Suspect(id="suspect_002", name="Priya Shah", age=33, occupation="Curator", relationship_to_victim="Employee", description="Nadia's trusted curator who discovered a missing painting."), Suspect(id="suspect_003", name="Marcus Vale", age=49, occupation="Restorer", relationship_to_victim="Contractor", description="A restorer with access to the secured room."), Suspect(id="suspect_004", name="Elena Mercer", age=42, occupation="Art Lawyer", relationship_to_victim="Sister", description="Nadia's sister and legal adviser, worried about the gallery's debts.")]
    case.evidence = [Evidence(id="evidence_001", name="Spiked Tasting Glass", description="A wine glass containing traces of a sedative compound.", location_id="location_001", importance="critical"), Evidence(id="evidence_002", name="Missing Inventory Tag", description="A torn inventory tag from a painting missing from the restoration room.", location_id="location_002", importance="supporting"), Evidence(id="evidence_003", name="Restoration Gloves", description="A pair of gloves with pigment residue but no poison trace.", location_id="location_002", importance="red_herring"), Evidence(id="evidence_004", name="Alarm Log", description="The gallery alarm was disabled for nine minutes from 23:04 to 23:13.", location_id="location_001", importance="critical"), Evidence(id="evidence_005", name="Debt Notice", description="A legal notice shows Elena would inherit the gallery if Nadia died.", location_id="location_001", importance="supporting")]
    case.timeline = [TimelineEvent(id="t01",time="22:30",description="Private showing begins.",location_id="location_001",suspect_ids=["suspect_001","suspect_002","suspect_003","suspect_004"],victim_involved=True), TimelineEvent(id="t02",time="22:45",description="Nadia refuses Julian's offer for a disputed painting.",location_id="location_001",suspect_ids=["suspect_001"],victim_involved=True), TimelineEvent(id="t03",time="22:55",description="Marcus takes a restoration kit into the secured room.",location_id="location_002",suspect_ids=["suspect_003"]), TimelineEvent(id="t04",time="23:00",description="Elena leaves the main room to make a phone call.",location_id="location_001",suspect_ids=["suspect_004"]), TimelineEvent(id="t05",time="23:04",description="The gallery alarm is disabled.",location_id="location_001"), TimelineEvent(id="t06",time="23:06",description="Nadia pours herself a tasting glass.",location_id="location_001",victim_involved=True), TimelineEvent(id="t07",time="23:09",description="Priya returns from the archive and sees the restoration-room door open.",location_id="location_002",suspect_ids=["suspect_002"]), TimelineEvent(id="t08",time="23:12",description="Nadia collapses in the gallery office.",location_id="location_001",victim_involved=True), TimelineEvent(id="t09",time="23:13",description="The alarm is restored.",location_id="location_001"), TimelineEvent(id="t10",time="23:25",description="The group discovers Nadia and calls emergency services.",location_id="location_001",victim_involved=True)]
    case.red_herrings = [RedHerring(id="rh1",description="Marcus's gloves and pigment make him appear connected to the missing painting.",misleading_suspect_id="suspect_003"), RedHerring(id="rh2",description="Elena's inheritance creates an obvious motive.",misleading_suspect_id="suspect_004")]
    case.solution = Solution(killer_id="suspect_002",motive="Prevent discovery of the stolen painting scheme",method="Poisoning the tasting glass",murder_time="23:12",explanation="Priya used the alarm gap to move through the restoration room, had access to the glass, and killed Nadia to prevent her from exposing the missing inventory.")
    case.interrogation = _base_interrogation(case.suspects,["evidence_001","evidence_004"],"suspect_002")
    validate_case(case)
    return case


def hard_case() -> Case:
    case = medium_case().model_copy(deep=True)
    case.case_id="case_003"; case.title="The Vanishing Hour"; case.description="A technology executive disappears from a secured conference floor and is later found dead. The key is reconstructing a missing twelve-minute window."; case.difficulty="hard"; case.target_minutes=30
    case.victim=Victim(id="victim_003",name="Arjun Mehta",age=51,occupation="Technology Executive",cause_of_death="Blunt-force trauma")
    case.suspects=[Suspect(id="suspect_001",name="Rhea Kapoor",age=37,occupation="COO",relationship_to_victim="Executive colleague",description="Had a dispute with Arjun over a board vote."),Suspect(id="suspect_002",name="Neil Foster",age=44,occupation="Security Lead",relationship_to_victim="Employee",description="Controlled badge access and camera maintenance."),Suspect(id="suspect_003",name="Kabir Sen",age=40,occupation="Investor",relationship_to_victim="Investor",description="Would lose millions if Arjun exposed a failed deal."),Suspect(id="suspect_004",name="Maya Mehta",age=47,occupation="Spouse",relationship_to_victim="Wife",description="Was negotiating a private settlement with Arjun.")]
    case.locations=[Location(id="location_001",name="Conference Floor",description="A restricted executive floor."),Location(id="location_002",name="Server Corridor",description="A camera-covered corridor leading to the executive suite.")]
    case.evidence=[Evidence(id="evidence_001",name="Badge Clone",description="A cloned access badge was used during the camera outage.",location_id="location_002",importance="critical"),Evidence(id="evidence_002",name="Shattered Tablet",description="Arjun's tablet contains a deleted board memo and impact damage.",location_id="location_001",importance="critical"),Evidence(id="evidence_003",name="Camera Maintenance Ticket",description="A legitimate maintenance ticket overlaps the missing twelve-minute window.",location_id="location_002",importance="supporting"),Evidence(id="evidence_004",name="Board Memo Fragment",description="A fragment accuses one executive of falsifying investment records.",location_id="location_001",importance="critical"),Evidence(id="evidence_005",name="Spare Keycard",description="A spare keycard belonging to Maya is found in a drawer.",location_id="location_001",importance="red_herring"),Evidence(id="evidence_006",name="Fiber on Jacket",description="A synthetic fiber matches the lining of a security uniform.",location_id="location_002",importance="supporting")]
    case.timeline = [
    TimelineEvent(
        id=f"t{i:02}",
        time=t,
        description=d,
        location_id=loc,
        suspect_ids=ss,
        victim_involved=vi,
    )
    for i, (t, d, loc, ss, vi) in enumerate([
        ("21:00", "Board meeting ends.", "location_001", ["suspect_001", "suspect_003"], True),
        ("21:04", "Arjun enters the executive suite.", "location_001", [], True),
        ("21:08", "Neil begins scheduled camera maintenance.", "location_002", ["suspect_002"], False),
        ("21:10", "Rhea leaves for the elevator lobby.", "location_001", ["suspect_001"], False),
        ("21:12", "The corridor camera feed drops.", "location_002", [], False),
        ("21:14", "A cloned badge opens the executive suite.", "location_002", [], False),
        ("21:17", "A heavy impact is detected by a desk sensor.", "location_001", [], True),
        ("21:19", "The camera feed returns.", "location_002", [], False),
        ("21:21", "Kabir is seen entering the lobby.", "location_001", ["suspect_003"], False),
        ("21:23", "Maya calls Arjun repeatedly.", "location_001", ["suspect_004"], False),
        ("21:30", "Arjun is discovered.", "location_001", [], True),
    ])
]

    case.red_herrings = [
    RedHerring(
        id="rh1",
        description="Maya's spare keycard looks like direct access evidence.",
        misleading_suspect_id="suspect_004",
    ),
    RedHerring(
        id="rh2",
        description="Kabir had a strong financial motive.",
        misleading_suspect_id="suspect_003",
    ),
]    
    case.evidence[-1].requires_evidence_ids = ["evidence_001"]
    case.evidence[-1].unlock_hint = "The access badge suggests another trace may be worth examining."
    case.solution=Solution(killer_id="suspect_002",motive="Prevent exposure of security-contract fraud",method="Blunt-force trauma during the camera outage",murder_time="21:17",explanation="Neil used the legitimate maintenance window to disable cameras, used a cloned badge to enter, killed Arjun, and planted the narrative around the financial suspects.")
    case.interrogation=_base_interrogation(case.suspects,["evidence_001","evidence_006"],"suspect_002"); validate_case(case); return case


def expert_case() -> Case:
    case=hard_case().model_copy(deep=True); case.case_id="case_004"; case.title="The Silent Archive"; case.description="A historian is found dead in a private archive after a rare manuscript vanishes. Multiple timelines overlap, and several clues are deliberately misleading."; case.difficulty="expert"; case.target_minutes=50
    case.victim=Victim(id="victim_004",name="Dr. Elias Ward",age=63,occupation="Historian",cause_of_death="Drug-induced cardiac arrest")
    case.solution=Solution(killer_id="suspect_003",motive="Conceal the theft and sale of the manuscript",method="Drugging the victim's evening medication",murder_time="22:42",explanation="The investor had arranged the manuscript sale, but the archivist discovered the plan. The killer used a controlled medication access window, then manipulated the archive timeline to implicate the curator and security officer.")
    case.suspects=[Suspect(id="suspect_001",name="Clara Ward",age=39,occupation="Curator",relationship_to_victim="Daughter",description="Managed the archive and stood to inherit the collection."),Suspect(id="suspect_002",name="Owen Price",age=46,occupation="Security Officer",relationship_to_victim="Employee",description="Responsible for the archive's access system."),Suspect(id="suspect_003",name="Victor Lang",age=55,occupation="Private Collector",relationship_to_victim="Client",description="A collector desperate to acquire a manuscript Elias refused to sell."),Suspect(id="suspect_004",name="Sara Lin",age=31,occupation="Research Fellow",relationship_to_victim="Researcher",description="Was secretly copying portions of the manuscript for her thesis.")]
    case.locations=[Location(id="location_001",name="Private Archive",description="A temperature-controlled research archive."),Location(id="location_002",name="Reading Room",description="A monitored room where researchers examine manuscripts."),Location(id="location_003",name="Service Corridor",description="A staff-only corridor connecting the archive to the loading area.")]
    case.evidence=[Evidence(id="evidence_001",name="Medication Vial",description="Elias's medication vial contains an unexpected compound.",location_id="location_001",importance="critical"),Evidence(id="evidence_002",name="Missing Manuscript Box",description="The manuscript's archival box is gone but its catalogue number remains.",location_id="location_001",importance="critical"),Evidence(id="evidence_003",name="Access Log Gap",description="A seven-minute access-log gap occurs during a scheduled system restart.",location_id="location_003",importance="critical"),Evidence(id="evidence_004",name="Copied Pages",description="Sara secretly copied several pages, creating an apparent theft motive.",location_id="location_002",importance="red_herring"),Evidence(id="evidence_005",name="Inheritance Amendment",description="Clara recently changed a document that would affect her inheritance.",location_id="location_001",importance="supporting"),Evidence(id="evidence_006",name="Collector Invoice",description="A private invoice connects Victor to a planned manuscript purchase.",location_id="location_002",importance="critical"),Evidence(id="evidence_007",name="Service Key",description="A service key was removed from the security cabinet and returned later.",location_id="location_003",importance="supporting")]
    case.evidence[5].requires_evidence_ids = ["evidence_001"]
    case.evidence[5].unlock_hint = "The medication vial points toward the archive access records."
    case.evidence[6].requires_evidence_ids = ["evidence_006"]
    case.evidence[6].unlock_hint = "The collector invoice suggests checking the service-key trail."
    case.timeline=[TimelineEvent(id=f"t{i:02}",time=t,description=d,location_id=l,suspect_ids=s,victim_involved=v) for i,(t,d,l,s,v) in enumerate([("21:50","Research session begins.","location_002",["suspect_001","suspect_004"],False),("22:00","Victor checks the manuscript catalogue.","location_001",[],True),("22:10","Victor refuses Victor Lang's offer by phone.","location_001",["suspect_003"],True),("22:18","Owen starts a scheduled system restart.","location_003",["suspect_002"],False),("22:22","Clara enters the archive.","location_001",["suspect_001"],False),("22:28","Sara leaves the reading room.","location_002",["suspect_004"],False),("22:35","The access log begins its restart gap.","location_003",[],False),("22:38","A service key is used near the archive.","location_003",[],False),("22:42","Victor takes his evening medication.","location_001",[],True),("22:45","The manuscript box is removed.","location_001",[],False),("22:47","Access logging resumes.","location_003",[],False),("22:55","Clara discovers Victor unconscious.","location_001",["suspect_001"],True),("23:00","Emergency services are called.","location_001",[],True)])]
    case.red_herrings=[RedHerring(id="rh1",description="Sara's copied pages suggest she stole the manuscript.",misleading_suspect_id="suspect_004"),RedHerring(id="rh2",description="Clara's inheritance change creates an obvious motive.",misleading_suspect_id="suspect_001")]
    case.interrogation=_base_interrogation(case.suspects,["evidence_001","evidence_003"],"suspect_003"); validate_case(case); return case


def _configure_investigation(case: Case) -> Case:
    """Attach deterministic, difficulty-specific follow-up investigation actions."""
    by_id = {item.id: item for item in case.evidence}
    if case.difficulty == "easy":
        case.investigation_actions = [
            InvestigationAction(id="compare_dinner_routine", title="Compare the dinner routine", category="records", description="Compare the dinner plate and household routine against the timeline.", requires_evidence_ids=["evidence_003"], unlocks_evidence_ids=["evidence_005"], result_text="The household routine narrows the window, but the wet umbrella remains a misleading lead.", time_cost_seconds=30),
        ]
        by_id["evidence_005"].requires_action_ids = ["compare_dinner_routine"]
        by_id["evidence_005"].requires_evidence_ids = []
        by_id["evidence_005"].unlock_hint = "Compare the household routine against the dinner timeline."
    elif case.difficulty == "medium":
        case.investigation_actions = [
            InvestigationAction(id="trace_inventory_tag", title="Trace the inventory tag", category="records", description="Compare the torn tag with the gallery's inventory and ownership records.", requires_evidence_ids=["evidence_002"], unlocks_evidence_ids=["evidence_005"], result_text="The records expose a financial pressure point around the gallery, but motive alone does not establish who administered the sedative.", time_cost_seconds=60),
            InvestigationAction(id="test_tasting_glass", title="Request a toxicology comparison", category="forensics", description="Compare the residue on the tasting glass with the victim's medical findings.", requires_evidence_ids=["evidence_001"], result_text="The residue is consistent with the reported poisoning. The timing must still be reconciled with the alarm log.", time_cost_seconds=90),
        ]
        by_id["evidence_005"].requires_action_ids = ["trace_inventory_tag"]
        by_id["evidence_005"].requires_evidence_ids = []
        by_id["evidence_005"].unlock_hint = "Trace the missing inventory tag through gallery records."
    elif case.difficulty == "hard":
        case.investigation_actions = [
            InvestigationAction(id="compare_security_fiber", title="Compare the uniform fiber", category="forensics", description="Compare the fiber recovered from the scene with staff uniform samples and the access badge timeline.", requires_evidence_ids=["evidence_001"], unlocks_evidence_ids=["evidence_006"], result_text="The fiber is consistent with the security uniform. This links the camera outage to a person with access, but does not prove who entered the suite.", time_cost_seconds=120),
            InvestigationAction(id="audit_camera_ticket", title="Audit the maintenance ticket", category="records", description="Cross-check the authorized maintenance window against the access log and impact sensor.", requires_evidence_ids=["evidence_003", "evidence_004"], result_text="The authorized ticket explains how the outage could occur; the cloned badge remains the key evidence for who exploited it.", time_cost_seconds=90),
        ]
        by_id["evidence_006"].requires_action_ids = ["compare_security_fiber"]
        by_id["evidence_006"].requires_evidence_ids = []
        by_id["evidence_006"].unlock_hint = "Request a forensic comparison after examining the cloned badge."
    else:
        case.investigation_actions = [
            InvestigationAction(id="analyze_medication", title="Analyze the medication vial", category="forensics", description="Request a toxicology screen and compare the result with the victim's medication schedule.", requires_evidence_ids=["evidence_001"], unlocks_evidence_ids=["evidence_006"], result_text="The unexpected compound is consistent with deliberate interference. The collector invoice now provides a possible motive and transaction to trace.", time_cost_seconds=150),
            InvestigationAction(id="trace_collector_transaction", title="Trace the collector invoice", category="records", description="Cross-reference the invoice with archive access and service-key records.", requires_evidence_ids=["evidence_006"], requires_action_ids=["analyze_medication"], unlocks_evidence_ids=["evidence_007"], result_text="The service-key trail overlaps the access-log gap. It narrows the opportunity window but must be combined with motive and medication evidence.", time_cost_seconds=180),
            InvestigationAction(id="reconstruct_archive_timeline", title="Reconstruct the archive timeline", category="follow_up", description="Cross-check the access-log gap, service key, medication time, and manuscript removal.", requires_evidence_ids=["evidence_003", "evidence_006", "evidence_007"], requires_action_ids=["analyze_medication", "trace_collector_transaction"], result_text="The reconstructed sequence shows who could exploit the logging gap and when. Compare it with each suspect's statement before accusing anyone.", time_cost_seconds=120),
        ]
        by_id["evidence_006"].requires_action_ids = ["analyze_medication"]
        by_id["evidence_006"].requires_evidence_ids = []
        by_id["evidence_006"].unlock_hint = "Request toxicology analysis after examining the medication vial."
        by_id["evidence_007"].requires_action_ids = ["trace_collector_transaction"]
        by_id["evidence_007"].requires_evidence_ids = []
        by_id["evidence_007"].unlock_hint = "Trace the collector invoice through the service-key records."
    action_gated_evidence = {item.id for item in case.evidence if item.requires_action_ids}
    for profile in case.interrogation:
        for question in profile.questions:
            for answer in question.answers:
                if answer.reveals_evidence_id in action_gated_evidence:
                    answer.reveals_evidence_id = None
    validate_case(case)
    return case

def get_case(difficulty: str) -> Case:
    if difficulty not in {"easy", "medium", "hard", "expert"}:
        raise ValueError(f"Unknown difficulty: {difficulty}")
    return _configure_investigation({"easy": easy_case, "medium": medium_case, "hard": hard_case, "expert": expert_case}[difficulty]())


# Stable case IDs used by the selectable case library.
from app.services.additional_cases import build_additional_case, BLUEPRINTS
# Additional cases will be registered here as their definitions are added.
BUILT_IN_CASE_FACTORIES = {
    "case_001": easy_case,
    "case_002": medium_case,
    "case_003": hard_case,
    "case_004": expert_case,
    **{case_id: (lambda case_id=case_id: build_additional_case(case_id))
       for case_id in BLUEPRINTS},
}

BUILT_IN_CASE_METADATA = {
    "case_001": {
        "title": "The Locked Study",
        "description": "A businessman's death, a broken paperweight, and missing company funds.",
        "difficulty": "easy",
        "target_minutes": 7,
    },
    "case_002": {
        "title": "The Gallery After Midnight",
        "description": "A gallery owner's death, a missing painting, and a suspicious alarm outage.",
        "difficulty": "medium",
        "target_minutes": 15,
    },
    "case_003": {
        "title": "The Vanishing Hour",
        "description": "Reconstruct a missing twelve-minute window on a restricted executive floor.",
        "difficulty": "hard",
        "target_minutes": 30,
    },
    "case_004": {
        "title": "The Silent Archive",
        "description": "A historian's death and a missing manuscript hide a layered sequence of events.",
        "difficulty": "expert",
        "target_minutes": 50,
    },
    "case_005": {
        "title": "The Last Train",
        "description": "A railway supervisor's death exposes a falsified safety inspection.",
        "difficulty": "easy",
        "target_minutes": 6,
    },
    "case_006": {
        "title": "Death at Room 12",
        "description": "A seaside hotel death, a missing key, and a corrected checkout entry.",
        "difficulty": "easy",
        "target_minutes": 7,
    },
    "case_007": {
        "title": "The Midnight Broadcast",
        "description": "A radio host dies on air while a recording segment disappears.",
        "difficulty": "medium",
        "target_minutes": 15,
    },
    "case_008": {
        "title": "The Missing Blueprint",
        "description": "An architect's death and a missing redevelopment plan.",
        "difficulty": "medium",
        "target_minutes": 16,
    },
    "case_009": {
        "title": "The Blackout Protocol",
        "description": "A control-room death amid contradictory power-grid telemetry.",
        "difficulty": "hard",
        "target_minutes": 30,
    },
    "case_010": {
        "title": "Murder on the Research Vessel",
        "description": "A marine research death involving sample tampering and a pressure log.",
        "difficulty": "hard",
        "target_minutes": 32,
    },
    "case_011": {
        "title": "The Glasshouse Paradox",
        "description": "A botanist dies in a sealed greenhouse as a rare plant vanishes.",
        "difficulty": "expert",
        "target_minutes": 45,
    },
    "case_012": {
        "title": "The Seventh Witness",
        "description": "A judge's death exposes a missing statement and a falsified chronology.",
        "difficulty": "expert",
        "target_minutes": 52,
    },
}


def get_case_by_id(case_id: str) -> Case:
    """Return a fresh, fully configured built-in case by its stable ID."""
    factory = BUILT_IN_CASE_FACTORIES.get(case_id)
    if factory is None:
        raise ValueError(f"Unknown built-in case ID: {case_id}")

    case = _configure_investigation(factory())
    case.case_id = case_id
    return case


def get_case_catalog() -> list[dict]:
    """Return public selection metadata, ordered by stable case ID."""
    return [
        {"case_id": case_id, **metadata}
        for case_id, metadata in BUILT_IN_CASE_METADATA.items()
    ]
