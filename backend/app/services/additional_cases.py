"""Additional hand-authored cases for THE LAST CLUE's case library."""

from app.schemas.case import (
    Case, Victim, Suspect, Location, Evidence, TimelineEvent,
    RedHerring, Solution,
)
from app.services.case_generator import (
    easy_case, medium_case, hard_case, expert_case,
    _base_interrogation, _configure_investigation,
)
from app.services.case_validator import validate_case


# Each entry defines a separate mystery. Suspect references use stable IDs.
BLUEPRINTS = {
    "case_005": {
        "difficulty": "easy", "title": "The Last Train",
        "description": "A railway signal supervisor is found dead after the final service. A falsified delay report may reveal who returned to the platform.",
        "target_minutes": 6,
        "victim": ("victim_005", "Peter Rowan", 54, "Signal Supervisor", "Blunt-force trauma"),
        "killer": 2, "motive": "Concealment of a falsified safety inspection",
        "method": "A fatal blow with a metal signal wrench",
        "time": "23:18",
        "explanation": "The maintenance contractor returned after the last train to recover the inspection record. The wrench, altered log, and platform timeline place the contractor at the scene.",
        "suspects": [
            ("Amelia Frost", 32, "Ticket Inspector", "Colleague", "Was reprimanded after a passenger complaint."),
            ("Gareth Pike", 45, "Station Manager", "Supervisor", "Had signed the disputed delay report."),
            ("Lewis Grant", 39, "Maintenance Contractor", "Contractor", "Had access to the signal cabinet and workshop tools."),
            ("Nina Cole", 28, "Café Operator", "Tenant", "Was closing her kiosk near the platform."),
        ],
        "locations": [("Northbridge Station", "A small station after its final scheduled service."), ("Signal Workshop", "A locked maintenance room beside the platform.")],
        "evidence": [
            ("Wrench with Fresh Damage", "A workshop wrench carries fresh impact damage and traces consistent with the scene.", 1, "critical"),
            ("Altered Delay Sheet", "The signed sheet contains a correction made after the service had ended.", 1, "critical"),
            ("Platform Ticket Stub", "A ticket stub fixes one suspect's presence near the platform.", 0, "supporting"),
            ("Stopped Wall Clock", "The workshop clock stopped at 23:18, though it had recently been serviced.", 1, "supporting"),
            ("Wet Footprints", "Wet prints appear to lead toward the café, but a leaking drain runs across the same path.", 0, "red_herring"),
        ],
        "timeline": [
            ("22:40", "The last scheduled service departs.", 0, [0, 1], False),
            ("22:52", "The signal supervisor enters the workshop.", 1, [], True),
            ("23:02", "The station manager leaves the ticket office.", 0, [1], False),
            ("23:10", "A tool is removed from the workshop rack.", 1, [2], False),
            ("23:18", "A metallic impact is heard near the workshop.", 1, [2], True),
            ("23:27", "The café operator begins closing.", 0, [3], False),
            ("23:35", "The supervisor is discovered.", 1, [0, 1, 3], True),
        ],
        "red_herrings": [
            ("The ticket inspector's earlier reprimand suggests resentment.", 0),
            ("The wet prints seem to implicate the café operator.", 3),
        ],
    },
    "case_006": {
        "difficulty": "easy", "title": "Death at Room 12",
        "description": "A guest dies in a small seaside hotel. A missing room key and an incorrectly recorded checkout expose a hidden visit.",
        "target_minutes": 7,
        "victim": ("victim_006", "Marina Wells", 48, "Travel Journalist", "Fatal head injury"),
        "killer": 0, "motive": "Prevent publication of a fraudulent property scheme",
        "method": "A fatal strike with a ceramic bedside lamp",
        "time": "21:40",
        "explanation": "The hotel owner confronted Marina after learning she had documented the scheme. The broken lamp, altered checkout entry, and key record contradict the owner's claim of being away.",
        "suspects": [
            ("Edith Shaw", 51, "Hotel Owner", "Business contact", "Was afraid Marina's article would expose false property claims."),
            ("Tom Bell", 27, "Receptionist", "Employee", "Had access to room keys and the booking system."),
            ("Ravi Dutta", 36, "Guest", "Neighbouring guest", "Argued with Marina about noise earlier that evening."),
            ("Sophie Lane", 33, "Housekeeper", "Employee", "Had entered the corridor to replace towels."),
        ],
        "locations": [("Seabrook Hotel", "A modest hotel overlooking a coastal road."), ("Room 12", "The victim's room, with a view of the service stairwell.")],
        "evidence": [
            ("Broken Ceramic Lamp", "The bedside lamp is broken and bears traces matching the victim's injury.", 1, "critical"),
            ("Duplicate Room Key", "A duplicate key was signed out but the signature does not match the register.", 0, "critical"),
            ("Unsent Article Draft", "The draft describes false claims in a local property development.", 1, "supporting"),
            ("Checkout Correction", "The booking system records a checkout correction entered after the alleged departure.", 0, "critical"),
            ("Housekeeping Cart", "A cart outside the room contains clean towels and a misleading smear of red polish.", 0, "red_herring"),
        ],
        "timeline": [
            ("20:55", "Marina returns to the hotel.", 0, [], True),
            ("21:05", "The receptionist issues a duplicate key.", 0, [1], False),
            ("21:15", "A guest complains about noise from the corridor.", 1, [2], False),
            ("21:28", "The housekeeper passes Room 12.", 1, [3], False),
            ("21:40", "A loud crash comes from Room 12.", 1, [0], True),
            ("21:48", "The hotel owner enters the lobby.", 0, [0], False),
            ("22:05", "Marina is discovered.", 1, [1, 3], True),
        ],
        "red_herrings": [
            ("The neighbouring guest's argument appears to provide a motive.", 2),
            ("The polish on the cart resembles a stain from the scene.", 3),
        ],
    },
    "case_007": {
        "difficulty": "medium", "title": "The Midnight Broadcast",
        "description": "A late-night radio host dies during a broadcast. A short transmission gap and an edited recording reveal who entered the studio.",
        "target_minutes": 15,
        "victim": ("victim_007", "Jonah Price", 42, "Radio Host", "Poisoning"),
        "killer": 1, "motive": "Prevent the broadcast of evidence of fabricated news stories",
        "method": "Poison administered through a prepared drink",
        "time": "00:14",
        "explanation": "The producer used a scheduled station break to prepare the drink and edit the recording. The drink residue, console log, and missing segment align with the producer's access.",
        "suspects": [
            ("Mira Chen", 34, "News Editor", "Colleague", "Was criticised for approving an inaccurate report."),
            ("Caleb Ross", 38, "Show Producer", "Producer", "Controlled the studio schedule and audio archive."),
            ("Dylan Shaw", 29, "Sound Engineer", "Employee", "Had technical access to the mixing console."),
            ("Ruth Ellis", 46, "Station Director", "Manager", "Feared a public scandal could threaten the station."),
        ],
        "locations": [("WNR Midnight Studio", "A live radio studio with a small control room."), ("Audio Archive", "A restricted room storing recordings and production logs.")],
        "evidence": [
            ("Half-Finished Drink", "The host's drink contains an unexplained chemical residue.", 0, "critical"),
            ("Edited Broadcast File", "A short section has been cut from the archived broadcast.", 1, "critical"),
            ("Studio Access Log", "The door log shows a badge entry during the transmission gap.", 0, "critical"),
            ("Producer's Run Sheet", "The schedule marks an unscripted break just before the host collapsed.", 1, "supporting"),
            ("Loose Headphone Cable", "A damaged cable suggests a sound check, but it does not explain the drink.", 0, "red_herring"),
        ],
        "timeline": [
            ("23:40", "The live programme begins.", 0, [0, 1, 2], True),
            ("23:56", "The editor leaves the control room.", 0, [0], False),
            ("00:03", "The producer changes the run sheet.", 0, [1], False),
            ("00:09", "The broadcast contains an unexpected pause.", 0, [1, 2], False),
            ("00:14", "The host collapses after drinking.", 0, [], True),
            ("00:19", "The sound engineer calls for medical help.", 0, [2], True),
            ("00:31", "The director arrives at the studio.", 0, [3], False),
        ],
        "red_herrings": [
            ("The editor's disputed story gives her a reason to silence the host.", 0),
            ("The damaged headphone cable makes the engineer look careless.", 2),
        ],
    },
    "case_008": {
        "difficulty": "medium", "title": "The Missing Blueprint",
        "description": "An architect is found dead and a redevelopment blueprint disappears. A printer trace and a revised access list expose a staged theft.",
        "target_minutes": 16,
        "victim": ("victim_008", "Sanjay Mehra", 57, "Architect", "Fatal fall with head trauma"),
        "killer": 3, "motive": "Conceal unauthorised changes to a redevelopment plan",
        "method": "A deliberate push from the mezzanine followed by removal of the blueprint",
        "time": "19:52",
        "explanation": "The project lawyer altered the access list and used the mezzanine meeting as cover. Printer history places the revised plan in the lawyer's hands shortly before the fatal fall.",
        "suspects": [
            ("Iris Bell", 31, "Junior Architect", "Employee", "Had challenged the victim's design decisions."),
            ("Omar Siddiqui", 43, "Site Engineer", "Contractor", "Was responsible for a safety issue on the site."),
            ("Helen Wu", 39, "Planning Consultant", "Consultant", "Had been asked to explain a zoning discrepancy."),
            ("Peter Voss", 50, "Project Lawyer", "Legal adviser", "Had approved a disputed clause in the redevelopment agreement."),
        ],
        "locations": [("Meridian Design Office", "An architectural office above a construction showroom."), ("Model Mezzanine", "A raised display area overlooking the project models.")],
        "evidence": [
            ("Missing Blueprint Sleeve", "The sleeve is empty, though a fresh pencil mark remains inside.", 0, "critical"),
            ("Printer Job History", "A confidential plan was printed under a temporary account.", 0, "critical"),
            ("Mezzanine Dust Pattern", "A clear drag mark crosses dust near the railing.", 1, "critical"),
            ("Revised Access List", "A late edit removes one visitor from the official record.", 0, "critical"),
            ("Cracked Safety Helmet", "A damaged helmet belongs to the site engineer, but the damage predates the incident.", 1, "red_herring"),
        ],
        "timeline": [
            ("18:55", "The design team reviews the redevelopment model.", 0, [0, 1, 2, 3], True),
            ("19:12", "The engineer leaves to inspect the site.", 0, [1], False),
            ("19:24", "A confidential blueprint is printed.", 0, [0, 3], False),
            ("19:37", "The consultant checks the mezzanine display.", 1, [2], False),
            ("19:52", "A crash is heard below the mezzanine.", 1, [], True),
            ("20:01", "The lawyer reports the blueprint missing.", 0, [3], False),
            ("20:14", "The victim is found at the foot of the stairs.", 1, [0, 2], True),
        ],
        "red_herrings": [
            ("The engineer's damaged helmet suggests a safety dispute.", 1),
            ("The junior architect's design disagreement looks personal.", 0),
        ],
    },
    "case_009": {
        "difficulty": "hard", "title": "The Blackout Protocol",
        "description": "A grid-control analyst dies during a regional blackout. A relay override, duplicate credentials, and mismatched telemetry must be reconciled.",
        "target_minutes": 30,
        "victim": ("victim_009", "Leena Bose", 49, "Grid-Control Analyst", "Electrocution"),
        "killer": 0, "motive": "Hide deliberate manipulation of outage records",
        "method": "A staged electrical accident after an unauthorised relay override",
        "time": "02:17",
        "explanation": "The operations chief used a copied credential to trigger the relay sequence and staged the death as an unavoidable equipment failure. The telemetry offset and relay audit trail identify the deliberate override.",
        "suspects": [
            ("Marcus Reed", 46, "Operations Chief", "Supervisor", "Had approved the disputed outage procedure."),
            ("Tara Iqbal", 35, "Cybersecurity Analyst", "Colleague", "Had detected duplicate control-room credentials."),
            ("Noah Kim", 41, "Field Technician", "Technician", "Was dispatched to a substation during the blackout."),
            ("Eva Laurent", 53, "Compliance Auditor", "Auditor", "Was due to deliver a damaging safety report."),
        ],
        "locations": [("Regional Control Centre", "A secure room with grid telemetry and relay controls."), ("Relay Test Bay", "A restricted bay used for high-voltage diagnostics.")],
        "evidence": [
            ("Relay Override Record", "A manual override was entered using a credential assigned to a different shift.", 0, "critical"),
            ("Burnt Insulation Sample", "The sample is consistent with a deliberately bridged relay contact.", 1, "critical"),
            ("Telemetry Clock Offset", "Two independent logs differ by ninety seconds during the outage.", 0, "critical"),
            ("Copied Access Token", "A token was duplicated shortly before the blackout.", 0, "critical"),
            ("Field Dispatch Note", "The technician's dispatch time was handwritten after the event.", 0, "supporting"),
            ("Uniform Fiber Sample", "A fiber matches standard control-room clothing but is not unique to one suspect.", 1, "supporting"),
        ],
        "timeline": [
            ("01:42", "The auditor requests the latest safety report.", 0, [3], False),
            ("01:55", "A duplicate credential is detected.", 0, [1], False),
            ("02:03", "The technician is dispatched to the substation.", 1, [2], False),
            ("02:11", "Telemetry begins to diverge between systems.", 0, [], False),
            ("02:17", "The relay bay reports a fatal electrical incident.", 1, [], True),
            ("02:24", "The operations chief orders a log export.", 0, [0], False),
            ("02:39", "The auditor arrives at the relay bay.", 1, [3], False),
        ],
        "red_herrings": [
            ("The technician's late handwritten dispatch note looks like an alibi alteration.", 2),
            ("The auditor's pending report gives her an apparent motive.", 3),
        ],
    },
    "case_010": {
        "difficulty": "hard", "title": "Murder on the Research Vessel",
        "description": "A marine biologist dies aboard a research vessel far from shore. A pressure log, sample chain, and navigation correction contradict the crew's accounts.",
        "target_minutes": 32,
        "victim": ("victim_010", "Dr. Celia Hart", 44, "Marine Biologist", "Drowning"),
        "killer": 2, "motive": "Prevent exposure of falsified environmental sample results",
        "method": "Forced submersion in the specimen wash tank",
        "time": "03:26",
        "explanation": "The chief scientist had falsified sample results and used a scheduled deck wash to conceal the killing. The tank-pressure log and sample seals place the scientist in the lab during the unexplained navigation correction.",
        "suspects": [
            ("Ben Okafor", 37, "First Officer", "Crew member", "Had altered a course correction without explaining why."),
            ("Mila Torres", 30, "Deck Engineer", "Crew member", "Had access to pumps and pressure controls."),
            ("Dr. Adrian Vale", 51, "Chief Scientist", "Colleague", "Was responsible for the disputed sample programme."),
            ("Jonas Pike", 42, "Expedition Sponsor", "Sponsor", "Risked losing funding if the findings were discredited."),
        ],
        "locations": [("RV Pelagic", "A research vessel operating offshore."), ("Specimen Laboratory", "A wet lab connected to a pressure-controlled wash tank.")],
        "evidence": [
            ("Unsealed Sample Case", "A sample case was opened after its seal was recorded as intact.", 1, "critical"),
            ("Wash-Tank Pressure Log", "A pressure spike coincides with the estimated time of death.", 1, "critical"),
            ("Navigation Correction", "A manual course change was entered while the bridge log shows no officer at the console.", 0, "critical"),
            ("Contaminated Lab Gloves", "Gloves carry residue from the disputed sample batch.", 1, "critical"),
            ("Emergency Pump Key", "The pump key was left near the engine-room entrance.", 0, "supporting"),
            ("Sponsor's Expense Receipt", "The sponsor paid for an unrelated equipment delivery.", 0, "red_herring"),
        ],
        "timeline": [
            ("02:35", "The team seals the latest sample batch.", 1, [2], False),
            ("02:48", "The first officer records a minor course correction.", 0, [0], False),
            ("03:02", "The engineer checks the wash-tank pump.", 1, [1], False),
            ("03:14", "The chief scientist returns to the laboratory.", 1, [2], False),
            ("03:26", "The pressure log records a sudden spike.", 1, [], True),
            ("03:34", "The sponsor asks for the sample results.", 0, [3], False),
            ("03:47", "The victim is discovered in the lab.", 1, [1, 2], True),
        ],
        "red_herrings": [
            ("The navigation correction suggests the first officer was hiding a route change.", 0),
            ("The sponsor's payment looks like an attempt to buy the results.", 3),
        ],
    },
    "case_011": {
        "difficulty": "expert", "title": "The Glasshouse Paradox",
        "description": "A botanist dies inside a sealed glasshouse while a rare plant disappears. Condensation patterns, irrigation chemistry, and a false environmental alarm challenge the apparent locked-room explanation.",
        "target_minutes": 45,
        "victim": ("victim_011", "Professor Amara Venn", 61, "Botanist", "Toxic exposure"),
        "killer": 3, "motive": "Conceal an illegal sale of a protected plant specimen",
        "method": "A controlled toxic exposure disguised as a greenhouse-system malfunction",
        "time": "04:42",
        "explanation": "The collections director manipulated the environmental alarm and irrigation schedule to create a false sealed-room timeline. The residue, valve service trace, and condensation pattern show that the exposure occurred before the recorded alarm.",
        "suspects": [
            ("Dr. Felix Ward", 40, "Plant Geneticist", "Colleague", "Had disputed ownership of the rare specimen."),
            ("Nora Bell", 36, "Greenhouse Engineer", "Employee", "Maintained the climate and irrigation systems."),
            ("Soren Malik", 48, "Botanical Archivist", "Colleague", "Had catalogued a protected specimen under a temporary identifier."),
            ("Vivian Cross", 55, "Collections Director", "Supervisor", "Controlled transfers and had authorised a questionable shipment."),
        ],
        "locations": [("Glasshouse Seven", "A sealed climate-controlled greenhouse."), ("Service Gallery", "A narrow maintenance gallery above the irrigation channels."), ("Specimen Vault", "A secure chamber for rare and protected plants.")],
        "evidence": [
            ("Residue on Pruning Shears", "The residue is consistent with the compound found in the victim's blood.", 0, "critical"),
            ("Irrigation Valve Trace", "The valve was operated manually before the system recorded its scheduled cycle.", 1, "critical"),
            ("Condensation Boundary", "A dry strip on the glass shows that the door was opened earlier than reported.", 0, "critical"),
            ("Environmental Alarm Printout", "The printout contains a reset timestamp that does not match the central server.", 0, "critical"),
            ("Missing Specimen Tag", "The rare plant's tag was removed and replaced with a temporary catalogue number.", 2, "critical"),
            ("Service-Key Register", "A key was checked out under a supervisor's initials and returned without a witness.", 1, "supporting"),
            ("Damaged Research Notebook", "A notebook page about plant toxicity was torn out, but the remaining notes are routine.", 0, "red_herring"),
        ],
        "timeline": [
            ("03:55", "The archivist checks the rare specimen tag.", 2, [2], False),
            ("04:08", "The engineer reports a climate sensor warning.", 1, [1], False),
            ("04:17", "The collections director requests a transfer record.", 2, [3], False),
            ("04:26", "The central alarm is reset from the service gallery.", 1, [], False),
            ("04:42", "The greenhouse registers an environmental fault.", 0, [], True),
            ("04:51", "The geneticist reports that the victim is unresponsive.", 0, [0], True),
            ("05:06", "The missing specimen is noticed.", 2, [2, 3], False),
        ],
        "red_herrings": [
            ("The torn notebook page makes the geneticist's research look dangerous.", 0),
            ("The archivist's temporary catalogue number resembles a deliberate falsification.", 2),
        ],
    },
    "case_012": {
        "difficulty": "expert", "title": "The Seventh Witness",
        "description": "A retired judge is found dead before a sealed testimony is opened. Six witness statements agree too neatly; a seventh, omitted statement reveals the staged chronology.",
        "target_minutes": 52,
        "victim": ("victim_012", "Justice Malcolm Rook", 68, "Retired Judge", "Fatal blunt-force injury"),
        "killer": 1, "motive": "Prevent a witness from exposing evidence tampering in a historic trial",
        "method": "A fatal blow during a staged document handover",
        "time": "20:36",
        "explanation": "The court archivist removed the seventh statement and adjusted the document handover time. The paper-fiber match, archive access trail, and independent clock record show that the archivist had the only viable opportunity.",
        "suspects": [
            ("Elaine Rook", 45, "Legal Advocate", "Daughter", "Had recently challenged the judge's account of a historic case."),
            ("Martin Quill", 57, "Court Archivist", "Professional colleague", "Controlled sealed testimony and historical case files."),
            ("Sasha Dean", 39, "Investigative Reporter", "Researcher", "Was preparing a story about a wrongful conviction."),
            ("Theo Marsh", 50, "Former Court Clerk", "Former colleague", "Had signed a disputed evidence receipt years earlier."),
        ],
        "locations": [("Old Chambers", "A private chamber where the judge reviewed sealed documents."), ("Court Archive", "A secure repository for historical testimony."), ("Records Passage", "A staff corridor with an independent clock and access reader.")],
        "evidence": [
            ("Sealed Testimony Envelope", "The envelope's seal was replaced, though its outer stamp appears intact.", 0, "critical"),
            ("Paper-Fiber Comparison", "Fibers from the victim's sleeve match the paper stock used in the missing statement.", 0, "critical"),
            ("Archive Access Gap", "The archive reader records a reset during the claimed handover.", 1, "critical"),
            ("Independent Passage Clock", "A maintenance clock shows the handover occurred earlier than the official record.", 2, "critical"),
            ("Evidence Receipt Copy", "The receipt contains a signature added in a different ink.", 1, "critical"),
            ("Personal Letter", "A letter shows the reporter had promised to publish the case story.", 0, "red_herring"),
            ("Removed Statement Index", "The catalogue index lists a seventh statement absent from the sealed bundle.", 1, "critical"),
        ],
        "timeline": [
            ("19:48", "The reporter arrives to review the sealed testimony.", 0, [2], False),
            ("20:02", "The former clerk submits an old evidence receipt.", 1, [3], False),
            ("20:14", "The archivist records the testimony as sealed.", 1, [1], False),
            ("20:23", "The advocate speaks with the judge in the chambers.", 0, [0], True),
            ("20:31", "The archive access reader resets.", 1, [], False),
            ("20:36", "A heavy impact is heard from the chambers.", 0, [], True),
            ("20:49", "The archivist announces that the sealed bundle is incomplete.", 1, [1], False),
        ],
        "red_herrings": [
            ("The reporter's promised publication suggests a motive to silence the judge.", 2),
            ("The former clerk's altered receipt appears to connect him to the missing evidence.", 3),
        ],
    },
}


def build_additional_case(case_id: str) -> Case:
    """Build and validate a fresh additional case by stable ID."""
    data = BLUEPRINTS.get(case_id)
    if data is None:
        raise ValueError(f"Unknown additional case ID: {case_id}")

    templates = {
        "easy": easy_case,
        "medium": medium_case,
        "hard": hard_case,
        "expert": expert_case,
    }
    case = templates[data["difficulty"]]().model_copy(deep=True)
    case.case_id = case_id
    case.title = data["title"]
    case.description = data["description"]
    case.difficulty = data["difficulty"]
    case.target_minutes = data["target_minutes"]

    victim_id, victim_name, age, occupation, cause = data["victim"]
    case.victim = Victim(
        id=victim_id, name=victim_name, age=age,
        occupation=occupation, cause_of_death=cause,
    )

    case.suspects = [
        Suspect(
            id=f"suspect_{i:03}",
            name=row[0],
            age=row[1],
            occupation=row[2],
            relationship_to_victim=row[3],
            description=row[4],
        )
        for i, row in enumerate(data["suspects"], start=1)
    ]

    case.locations = [
        Location(id=f"location_{i:03}", name=row[0], description=row[1])
        for i, row in enumerate(data["locations"], start=1)
    ]

    case.evidence = [
        Evidence(
            id=f"evidence_{i:03}",
            name=row[0],
            description=row[1],
            location_id=f"location_{row[2] + 1:03}",
            importance=row[3],
        )
        for i, row in enumerate(data["evidence"], start=1)
    ]

    case.timeline = [
        TimelineEvent(
            id=f"timeline_{i:03}",
            time=row[0],
            description=row[1],
            location_id=f"location_{row[2] + 1:03}",
            suspect_ids=[f"suspect_{index + 1:03}" for index in row[3]],
            victim_involved=row[4],
        )
        for i, row in enumerate(data["timeline"], start=1)
    ]

    case.red_herrings = [
        RedHerring(
            id=f"red_herring_{i:03}",
            description=row[0],
            misleading_suspect_id=f"suspect_{row[1] + 1:03}",
        )
        for i, row in enumerate(data["red_herrings"], start=1)
    ]

    killer_id = f"suspect_{data['killer'] + 1:03}"
    case.solution = Solution(
        killer_id=killer_id,
        motive=data["motive"],
        method=data["method"],
        murder_time=data["time"],
        explanation=data["explanation"],
    )

    case.interrogation = _base_interrogation(
        case.suspects,
        ["evidence_001", "evidence_002"],
        killer_id,
    )

    case = _configure_investigation(case)
    case.case_id = case_id
    validate_case(case)
    return case
