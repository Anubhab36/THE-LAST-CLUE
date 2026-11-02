import { useMemo, useState } from "react";
import type { Evidence, Suspect, InvestigationAction, InterrogationProfile } from "../../types/case";

export type NotebookNotes = {
  findings: string;
  theories: string;
  questions: string;
  suspectNotes?: Record<string, string>;
  linkedEvidence?: Record<string, string[]>;
  unresolvedQuestions?: { id: string; text: string; resolved: boolean }[];
  investigationLeads?: { id: string; title: string; category: "person" | "location" | "object" | "record" | "other"; status: "new" | "investigating" | "pursued"; notes: string }[];
  contradictions?: { id: string; firstEvidenceId: string; secondEvidenceId: string; explanation: string; }[];
  caseTheory?: {
    suspectId: string;
    motive: string;
    method: string;
    sequence: string;
    confidence: "low" | "medium" | "high";
    supportingEvidenceIds: string[];
    contradictingEvidenceIds: string[];
  };
};

interface NotebookProps {
  notes: NotebookNotes;
  onChange: (notes: NotebookNotes) => void;
  discoveredCount: number;
  evidence?: Evidence[];
  discoveredEvidenceIds?: string[];
  suspects?: Suspect[];
  investigationActions?: InvestigationAction[];
  completedActions?: string[];
  interrogation?: InterrogationProfile[];
  askedQuestions?: string[];
  onRunAction?: (action: InvestigationAction) => void;
  onInterrogate?: (suspect: Suspect) => void;
}

type TabKey = "findings" | "theories" | "questions" | "suspects";

const tabs: { key: TabKey; label: string; hint: string }[] = [
  { key: "findings", label: "Findings", hint: "Record observations and evidence. Separate what you know from what you infer." },
  { key: "theories", label: "Theories", hint: "Track hypotheses, then attach the evidence that supports or challenges them." },
  { key: "questions", label: "Open questions", hint: "List unanswered questions and leads you still need to pursue." },
  { key: "suspects", label: "Suspect tracker", hint: "Record your current assessment of each suspect. Suspicion is not proof." },
];

export default function Notebook({ notes, onChange, discoveredCount, evidence = [], discoveredEvidenceIds = [], suspects = [], investigationActions = [], completedActions = [], interrogation = [], askedQuestions = [], onRunAction, onInterrogate }: NotebookProps) {
  const [active, setActive] = useState<TabKey>("findings");
  const [filter, setFilter] = useState<"all" | "critical" | "supporting" | "red_herring">("all");
  const [newQuestion, setNewQuestion] = useState("");
  const unresolvedQuestions = notes.unresolvedQuestions ?? [];
  const investigationLeads = notes.investigationLeads ?? [];
  const [newLeadTitle, setNewLeadTitle] = useState("");
  const [newLeadCategory, setNewLeadCategory] = useState<"person" | "location" | "object" | "record" | "other">("person");
  const addLead = () => {
    const title = newLeadTitle.trim();
    if (!title) return;
    onChange({ ...notes, investigationLeads: [...investigationLeads, { id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title, category: newLeadCategory, status: "new", notes: "" }] });
    setNewLeadTitle("");
    setNewLeadCategory("person");
  };
  const updateLead = (id: string, patch: Partial<{ title: string; category: "person" | "location" | "object" | "record" | "other"; status: "new" | "investigating" | "pursued"; notes: string }>) =>
    onChange({ ...notes, investigationLeads: investigationLeads.map((lead) => lead.id === id ? { ...lead, ...patch } : lead) });
  const removeLead = (id: string) => onChange({ ...notes, investigationLeads: investigationLeads.filter((lead) => lead.id !== id) });
  const addQuestion = () => {
    const text = newQuestion.trim();
    if (!text) return;
    onChange({ ...notes, unresolvedQuestions: [...unresolvedQuestions, { id: `question-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text, resolved: false }] });
    setNewQuestion("");
  };
  const updateQuestion = (id: string, patch: Partial<{ text: string; resolved: boolean }>) => {
    onChange({ ...notes, unresolvedQuestions: unresolvedQuestions.map((item) => item.id === id ? { ...item, ...patch } : item) });
  };
  const removeQuestion = (id: string) => onChange({ ...notes, unresolvedQuestions: unresolvedQuestions.filter((item) => item.id !== id) });
  const current = tabs.find((tab) => tab.key === active)!;
  const discoveredEvidence = useMemo(
    () => evidence.filter((item) => discoveredEvidenceIds.includes(item.id)),
    [evidence, discoveredEvidenceIds],
  );
  const linkedEvidence = notes.linkedEvidence ?? {};
  const suspectNotes = notes.suspectNotes ?? {};
  const availableActionLeads = investigationActions.filter((action) =>
    !completedActions.includes(action.id) &&
    (action.requires_evidence_ids ?? []).every((id) => discoveredEvidenceIds.includes(id)) &&
    (action.requires_action_ids ?? []).every((id) => completedActions.includes(id)),
  );
  const availableQuestionLeads = suspects.flatMap((suspect) => {
    const profile = interrogation.find((item) => item.suspect_id === suspect.id);
    return (profile?.questions ?? []).filter((question) =>
      !askedQuestions.includes(`${suspect.id}:${question.id}`) &&
      (question.requires_evidence_ids ?? []).every((id) => discoveredEvidenceIds.includes(id)) &&
      (question.requires_action_ids ?? []).every((id) => completedActions.includes(id)),
    ).map((question) => ({ suspect, question }));
  });

  const contradictions = notes.contradictions ?? [];
  const [firstConflictEvidence, setFirstConflictEvidence] = useState("");
  const [secondConflictEvidence, setSecondConflictEvidence] = useState("");
  const [conflictExplanation, setConflictExplanation] = useState("");
  const addContradiction = () => {
    const explanation = conflictExplanation.trim();
    if (!firstConflictEvidence || !secondConflictEvidence || firstConflictEvidence === secondConflictEvidence || !explanation) return;
    const duplicate = contradictions.some((item) =>
      (item.firstEvidenceId === firstConflictEvidence && item.secondEvidenceId === secondConflictEvidence) ||
      (item.firstEvidenceId === secondConflictEvidence && item.secondEvidenceId === firstConflictEvidence)
    );
    if (duplicate) return;
    onChange({ ...notes, contradictions: [...contradictions, {
      id: `conflict-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      firstEvidenceId: firstConflictEvidence,
      secondEvidenceId: secondConflictEvidence,
      explanation,
    }] });
    setFirstConflictEvidence("");
    setSecondConflictEvidence("");
    setConflictExplanation("");
  };
  const removeContradiction = (id: string) =>
    onChange({ ...notes, contradictions: contradictions.filter((item) => item.id !== id) });
  const evidenceName = (id: string) => evidence.find((item) => item.id === id)?.name ?? "Evidence no longer available";

  const caseTheory = notes.caseTheory ?? {
    suspectId: "", motive: "", method: "", sequence: "",
    confidence: "low" as const, supportingEvidenceIds: [], contradictingEvidenceIds: [],
  };
  const updateCaseTheory = (patch: Partial<NonNullable<NotebookNotes["caseTheory"]>>) => {
    onChange({ ...notes, caseTheory: { ...caseTheory, ...patch } });
  };
  const toggleTheoryEvidence = (kind: "supportingEvidenceIds" | "contradictingEvidenceIds", evidenceId: string) => {
    const currentIds = caseTheory[kind];
    const otherKind = kind === "supportingEvidenceIds" ? "contradictingEvidenceIds" : "supportingEvidenceIds";
    const nextIds = currentIds.includes(evidenceId) ? currentIds.filter((id) => id !== evidenceId) : [...currentIds, evidenceId];
    updateCaseTheory({
      [kind]: nextIds,
      [otherKind]: caseTheory[otherKind].filter((id) => id !== evidenceId),
    });
  };
  const textValue = active === "suspects" ? "" : notes[active];

  const updateText = (key: "findings" | "theories" | "questions", value: string) => {
    onChange({ ...notes, [key]: value });
  };
  const toggleEvidence = (key: string, evidenceId: string) => {
    const currentLinks = linkedEvidence[key] ?? [];
    onChange({
      ...notes,
      linkedEvidence: {
        ...linkedEvidence,
        [key]: currentLinks.includes(evidenceId)
          ? currentLinks.filter((id) => id !== evidenceId)
          : [...currentLinks, evidenceId],
      },
    });
  };

  return (
    <section className="board notebook-panel" aria-labelledby="notebook-title">
      <div className="section-head">
        <div>
          <h2 id="notebook-title">Detective's Notebook 2.0</h2>
          <p className="muted">Private case workspace · {discoveredCount} evidence items recovered</p>
        </div>
        <span className="notebook-status">FIELD NOTES / {active.toUpperCase()}</span>
      </div>

      <div className="notebook-summary" aria-label="Notebook summary">
        <div><strong>{notes.findings.trim() ? "01" : "00"}</strong><span>FINDINGS</span></div>
        <div><strong>{notes.theories.trim() ? "01" : "00"}</strong><span>THEORIES</span></div>
        <div><strong>{notes.questions.trim() ? "01" : "00"}</strong><span>OPEN QUESTIONS</span></div>
        <div><strong>{Object.values(linkedEvidence).reduce((sum, ids) => sum + ids.length, 0)}</strong><span>EVIDENCE LINKS</span></div>
      </div>

      <div className="notebook-tabs" role="tablist" aria-label="Notebook sections">
        {tabs.map((tab) => (
          <button key={tab.key} type="button" role="tab" aria-selected={active === tab.key}
            className={active === tab.key ? "notebook-tab active" : "notebook-tab"}
            onClick={() => setActive(tab.key)}>{tab.label}</button>
        ))}
      </div>
      <p className="notebook-label">{current.hint}</p>

      {active !== "suspects" ? (
        <>
          <textarea id={`notebook-${active}`} className="notebook-textarea"
            value={textValue} onChange={(event) => updateText(active, event.target.value)}
            placeholder={`Write your ${current.label.toLowerCase()} here...`} rows={7} />
          {active === "theories" && (
            <>
            <section className="case-theory-builder" aria-labelledby="case-theory-title">
              <div className="case-theory-heading">
                <div><span className="notebook-status">STRUCTURED DEDUCTION</span><h3 id="case-theory-title">Build Your Case Theory</h3><p>Form a working explanation from what you have discovered. Revise it as new clues emerge.</p></div>
                <span className="case-theory-confidence">{caseTheory.confidence.toUpperCase()} CONFIDENCE</span>
              </div>
              <div className="case-theory-fields">
                <label>PRIMARY SUSPECT
                  <select value={caseTheory.suspectId} onChange={(event) => updateCaseTheory({ suspectId: event.target.value })}>
                    <option value="">Undecided</option>{suspects.map((suspect) => <option key={suspect.id} value={suspect.id}>{suspect.name}</option>)}
                  </select>
                </label>
                <label>PROPOSED MOTIVE<textarea value={caseTheory.motive} onChange={(event) => updateCaseTheory({ motive: event.target.value })} placeholder="Why might the suspect have committed the crime?" rows={2} /></label>
                <label>PROPOSED METHOD<textarea value={caseTheory.method} onChange={(event) => updateCaseTheory({ method: event.target.value })} placeholder="How do you think the crime was carried out?" rows={2} /></label>
                <label>RECONSTRUCTED SEQUENCE OF EVENTS<textarea value={caseTheory.sequence} onChange={(event) => updateCaseTheory({ sequence: event.target.value })} placeholder="Arrange the events into your current explanation..." rows={4} /></label>
                <label>CONFIDENCE IN THIS THEORY
                  <select value={caseTheory.confidence} onChange={(event) => updateCaseTheory({ confidence: event.target.value as "low" | "medium" | "high" })}>
                    <option value="low">Low — early hypothesis</option><option value="medium">Medium — some corroboration</option><option value="high">High — substantial corroboration</option>
                  </select>
                </label>
              </div>
              <div className="case-theory-evidence-grid">
                <div><div className="notebook-subhead"><strong>Supporting evidence</strong><span>{caseTheory.supportingEvidenceIds.length} selected</span></div><p className="case-theory-help">Clues that strengthen your explanation.</p>
                  {discoveredEvidence.length ? <div className="notebook-evidence-list">{discoveredEvidence.map((item) => <label className="notebook-evidence-option" key={item.id}><input type="checkbox" checked={caseTheory.supportingEvidenceIds.includes(item.id)} onChange={() => toggleTheoryEvidence("supportingEvidenceIds", item.id)} /><span><strong>{item.name}</strong><small>{item.importance.replace("_", " ").toUpperCase()}</small></span></label>)}</div> : <p className="notebook-empty">Discover evidence to attach it to your theory.</p>}
                </div>
                <div><div className="notebook-subhead"><strong>Contradicting evidence</strong><span>{caseTheory.contradictingEvidenceIds.length} selected</span></div><p className="case-theory-help">Clues that challenge or weaken your explanation.</p>
                  {discoveredEvidence.length ? <div className="notebook-evidence-list">{discoveredEvidence.map((item) => <label className="notebook-evidence-option" key={item.id}><input type="checkbox" checked={caseTheory.contradictingEvidenceIds.includes(item.id)} onChange={() => toggleTheoryEvidence("contradictingEvidenceIds", item.id)} /><span><strong>{item.name}</strong><small>{item.importance.replace("_", " ").toUpperCase()}</small></span></label>)}</div> : <p className="notebook-empty">Discover evidence to attach it to your theory.</p>}
                </div>
              </div>
              <p className="case-theory-disclaimer">This is your working hypothesis, not a confirmed solution. Confidence is self-assessed and does not affect scoring or accusation results.</p>
            </section>
            <section className="contradiction-detector" aria-labelledby="contradiction-detector-title">
              <div className="contradiction-detector-heading">
                <div><span className="notebook-status">EVIDENCE ANALYSIS</span><h3 id="contradiction-detector-title">Contradiction Detector</h3>
                  <p>Flag two clues that appear inconsistent. You decide whether they conflict; the tracker does not invent or automatically judge contradictions.</p></div>
                <div className="contradiction-detector-count"><strong>{contradictions.length}</strong><span>RECORDED</span></div>
              </div>
              {discoveredEvidence.length >= 2 ? (
                <div className="contradiction-detector-form">
                  <div className="contradiction-detector-selectors">
                    <label>FIRST CLUE<select value={firstConflictEvidence} onChange={(event) => setFirstConflictEvidence(event.target.value)}>
                      <option value="">Select evidence</option>{discoveredEvidence.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select></label>
                    <span className="contradiction-detector-symbol">≠</span>
                    <label>SECOND CLUE<select value={secondConflictEvidence} onChange={(event) => setSecondConflictEvidence(event.target.value)}>
                      <option value="">Select evidence</option>{discoveredEvidence.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select></label>
                  </div>
                  <label className="contradiction-detector-explanation">WHY DO THEY CONFLICT?
                    <textarea value={conflictExplanation} onChange={(event) => setConflictExplanation(event.target.value)} rows={3} maxLength={600}
                      placeholder="Describe the specific inconsistency, and what each clue appears to establish..." />
                  </label>
                  <button type="button" className="contradiction-detector-add" onClick={addContradiction}
                    disabled={!firstConflictEvidence || !secondConflictEvidence || firstConflictEvidence === secondConflictEvidence || !conflictExplanation.trim() ||
                      contradictions.some((item) => (item.firstEvidenceId === firstConflictEvidence && item.secondEvidenceId === secondConflictEvidence) || (item.firstEvidenceId === secondConflictEvidence && item.secondEvidenceId === firstConflictEvidence))}>
                    RECORD CONTRADICTION
                  </button>
                </div>
              ) : <p className="notebook-empty">Discover at least two evidence items to compare them.</p>}
              <div className="contradiction-detector-list">
                {contradictions.length === 0 ? <p className="notebook-empty">No contradictions recorded. Compare discovered clues when details appear inconsistent.</p> :
                  contradictions.map((item) => <article className="contradiction-detector-record" key={item.id}>
                    <div className="contradiction-detector-pair"><strong>{evidenceName(item.firstEvidenceId)}</strong><span>CONFLICTS WITH</span><strong>{evidenceName(item.secondEvidenceId)}</strong></div>
                    <p>{item.explanation}</p>
                    <button type="button" onClick={() => removeContradiction(item.id)} aria-label="Remove recorded contradiction">REMOVE</button>
                  </article>)}
              </div>
              <p className="contradiction-detector-note">Recorded contradictions are investigative notes only. They do not change case logic, hints, progression, or scoring.</p>
            </section>
            </>
          )}
          {active === "questions" && (
            <section className="lead-discovery-panel" aria-labelledby="lead-discovery-title">
              <div className="lead-discovery-heading">
                <div><span className="notebook-status">INTELLIGENCE / NEXT STEPS</span><h3 id="lead-discovery-title">Lead Discovery</h3>
                  <p>Actionable leads surfaced from evidence and investigation progress. New leads appear as you recover clues and complete follow-ups.</p></div>
                <div className="lead-discovery-count"><strong>{availableActionLeads.length + availableQuestionLeads.length}</strong><span>AVAILABLE</span></div>
              </div>
              {availableActionLeads.length === 0 && availableQuestionLeads.length === 0 ? (
                <p className="notebook-empty">No new leads are available right now. Recover more evidence or complete an investigation action to uncover the next steps.</p>
              ) : (
                <div className="lead-discovery-list">
                  {availableActionLeads.map((action) => (
                    <article className="lead-discovery-card" key={`action-${action.id}`}>
                      <div className="lead-discovery-card-top"><span className="lead-discovery-kind">{action.category.replace("_", " ").toUpperCase()} LEAD</span><span className="lead-discovery-source">INVESTIGATION ACTION</span></div>
                      <strong>{action.title}</strong><p>{action.description}</p>
                      <button type="button" onClick={() => onRunAction?.(action)} disabled={!onRunAction}>START INVESTIGATION <span aria-hidden="true">↗</span></button>
                    </article>
                  ))}
                  {availableQuestionLeads.map(({ suspect, question }) => (
                    <article className="lead-discovery-card" key={`question-${suspect.id}-${question.id}`}>
                      <div className="lead-discovery-card-top"><span className="lead-discovery-kind">PERSON OF INTEREST</span><span className="lead-discovery-source">INTERROGATION</span></div>
                      <strong>{suspect.name}</strong><p>{question.text}</p>
                      <button type="button" onClick={() => onInterrogate?.(suspect)} disabled={!onInterrogate}>OPEN INTERROGATION <span aria-hidden="true">↗</span></button>
                    </article>
                  ))}
                </div>
              )}
              <p className="lead-discovery-note">Only currently unlocked actions and unanswered questions are shown. Hidden evidence and future case facts are not exposed.</p>
            </section>
          )}
          {active === "questions" && (
            <section className="investigation-lead-tracker" aria-labelledby="investigation-lead-title">
              <div className="investigation-lead-heading">
                <div><span className="notebook-status">FIELD OPERATIONS</span><h3 id="investigation-lead-title">Investigation Lead Tracker</h3>
                  <p>Turn promising people, places, objects, and records into leads you can actively pursue. Track progress without changing case outcomes.</p></div>
                <div className="investigation-lead-count"><strong>{investigationLeads.filter((lead) => lead.status !== "pursued").length}</strong><span>ACTIVE</span></div>
              </div>
              <form className="investigation-lead-form" onSubmit={(event) => { event.preventDefault(); addLead(); }}>
                <input value={newLeadTitle} onChange={(event) => setNewLeadTitle(event.target.value)} placeholder="Add a person, place, object, or record to investigate…" aria-label="New investigation lead" maxLength={160} />
                <select aria-label="Lead category" value={newLeadCategory} onChange={(event) => setNewLeadCategory(event.target.value as typeof newLeadCategory)}>
                  <option value="person">Person</option><option value="location">Location</option><option value="object">Object</option><option value="record">Record</option><option value="other">Other</option>
                </select>
                <button type="submit" disabled={!newLeadTitle.trim()}>ADD LEAD</button>
              </form>
              <div className="investigation-lead-list">
                {investigationLeads.length === 0 ? <p className="notebook-empty">No leads added yet. Record a person to interview, location to inspect, or record to verify.</p> :
                  investigationLeads.map((lead) => <article className="investigation-lead-card" key={lead.id}>
                    <div className="investigation-lead-card-top">
                      <div><span className="investigation-lead-category">{lead.category.toUpperCase()}</span><strong>{lead.title}</strong></div>
                      <button type="button" onClick={() => removeLead(lead.id)} aria-label={`Remove lead: ${lead.title}`}>REMOVE</button>
                    </div>
                    <label className="investigation-lead-status">PROGRESS
                      <select value={lead.status} onChange={(event) => updateLead(lead.id, { status: event.target.value as typeof lead.status })}>
                        <option value="new">New lead</option><option value="investigating">Investigating</option><option value="pursued">Pursued</option>
                      </select>
                    </label>
                    <label className="investigation-lead-notes">INVESTIGATION NOTES
                      <textarea rows={2} maxLength={500} value={lead.notes} onChange={(event) => updateLead(lead.id, { notes: event.target.value })} placeholder="What needs checking? What did you learn?" />
                    </label>
                  </article>)}
              </div>
              {investigationLeads.length > 0 && <div className="investigation-lead-footer"><span>{investigationLeads.filter((lead) => lead.status === "new").length} new · {investigationLeads.filter((lead) => lead.status === "investigating").length} investigating · {investigationLeads.filter((lead) => lead.status === "pursued").length} pursued</span></div>}
            </section>
          )}
          {active === "questions" && (
            <section className="unresolved-questions" aria-labelledby="unresolved-questions-title">
              <div className="unresolved-questions-heading">
                <div><h3 id="unresolved-questions-title">Unresolved Questions Tracker</h3><p>Turn loose ends into actionable investigation tasks. Mark each question resolved when you have an answer.</p></div>
                <div className="unresolved-questions-count"><strong>{unresolvedQuestions.filter((item) => !item.resolved).length}</strong><span>OPEN</span></div>
              </div>
              <form className="unresolved-question-form" onSubmit={(event) => { event.preventDefault(); addQuestion(); }}>
                <input value={newQuestion} onChange={(event) => setNewQuestion(event.target.value)} placeholder="What still needs to be explained?" aria-label="New investigation question" maxLength={240} />
                <button type="submit" disabled={!newQuestion.trim()}>ADD QUESTION</button>
              </form>
              <div className="unresolved-question-list">
                {unresolvedQuestions.length === 0 ? <p className="notebook-empty">No questions tracked yet. Add an unanswered question, missing detail, or lead to investigate.</p> : unresolvedQuestions.map((item) => (
                  <article className={item.resolved ? "unresolved-question resolved" : "unresolved-question"} key={item.id}>
                    <label><input type="checkbox" checked={item.resolved} onChange={(event) => updateQuestion(item.id, { resolved: event.target.checked })} /><span>{item.text}</span></label>
                    <button type="button" onClick={() => removeQuestion(item.id)} aria-label={`Remove question: ${item.text}`}>REMOVE</button>
                  </article>
                ))}
              </div>
              {unresolvedQuestions.length > 0 && <div className="unresolved-questions-footer"><span>{unresolvedQuestions.filter((item) => item.resolved).length} resolved · {unresolvedQuestions.filter((item) => !item.resolved).length} still open</span><button type="button" onClick={() => onChange({ ...notes, unresolvedQuestions: unresolvedQuestions.filter((item) => !item.resolved) })} disabled={!unresolvedQuestions.some((item) => item.resolved)}>CLEAR RESOLVED</button></div>}
            </section>
          )}
          {active !== "questions" && (
            <div className="notebook-evidence-links">
              <div className="notebook-subhead"><strong>Attach recovered evidence</strong><span>{(linkedEvidence[active] ?? []).length} linked</span></div>
              {discoveredEvidence.length === 0 ? (
                <p className="notebook-empty">Recover evidence during the investigation to link it to these notes.</p>
              ) : (
                <div className="notebook-evidence-list">
                  {discoveredEvidence.map((item) => (
                    <label className="notebook-evidence-option" key={item.id}>
                      <input type="checkbox" checked={(linkedEvidence[active] ?? []).includes(item.id)} onChange={() => toggleEvidence(active, item.id)} />
                      <span><strong>{item.name}</strong><small>{item.importance.replace("_", " ").toUpperCase()}</small></span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="notebook-footer">
            <span>Saved with this investigation and restored when you resume it.</span>
            <span>{notes[active].trim().length} characters</span>
          </div>
        </>
      ) : (
        <div className="notebook-suspect-tracker">
          <div className="notebook-subhead"><strong>Suspect assessments</strong><span>{suspects.length} profiles</span></div>
          <p className="notebook-empty">Track what you believe, why you believe it, and what could disprove it. These notes do not affect the accusation score.</p>
          {suspects.map((suspect) => (
            <article className="notebook-suspect-card" key={suspect.id}>
              <div className="notebook-suspect-heading"><div><strong>{suspect.name}</strong><span>{suspect.relationship_to_victim}</span></div><span className="notebook-suspect-id">{suspect.id.replace("suspect_", "#")}</span></div>
              <textarea className="notebook-textarea notebook-suspect-textarea" aria-label={`Assessment for ${suspect.name}`}
                value={suspectNotes[suspect.id] ?? ""}
                onChange={(event) => onChange({ ...notes, suspectNotes: { ...suspectNotes, [suspect.id]: event.target.value } })}
                placeholder="Alibi, motive, contradictions, and evidence to verify…" rows={3} />
              <div className="notebook-subhead"><span>Supporting / contradicting evidence</span><span>{(linkedEvidence[suspect.id] ?? []).length} linked</span></div>
              {discoveredEvidence.length > 0 && (
                <div className="notebook-evidence-list">
                  {discoveredEvidence.map((item) => (
                    <label className="notebook-evidence-option" key={item.id}>
                      <input type="checkbox" checked={(linkedEvidence[suspect.id] ?? []).includes(item.id)} onChange={() => toggleEvidence(suspect.id, item.id)} />
                      <span><strong>{item.name}</strong><small>{item.importance.replace("_", " ").toUpperCase()}</small></span>
                    </label>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
