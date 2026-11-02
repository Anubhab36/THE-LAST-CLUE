import { useMemo, useState } from "react";
import type { Evidence, Suspect } from "../../types/case";

export type NotebookNotes = {
  findings: string;
  theories: string;
  questions: string;
  suspectNotes?: Record<string, string>;
  linkedEvidence?: Record<string, string[]>;
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
}

type TabKey = "findings" | "theories" | "questions" | "suspects";

const tabs: { key: TabKey; label: string; hint: string }[] = [
  { key: "findings", label: "Findings", hint: "Record observations and evidence. Separate what you know from what you infer." },
  { key: "theories", label: "Theories", hint: "Track hypotheses, then attach the evidence that supports or challenges them." },
  { key: "questions", label: "Open questions", hint: "List unanswered questions and leads you still need to pursue." },
  { key: "suspects", label: "Suspect tracker", hint: "Record your current assessment of each suspect. Suspicion is not proof." },
];

export default function Notebook({ notes, onChange, discoveredCount, evidence = [], discoveredEvidenceIds = [], suspects = [] }: NotebookProps) {
  const [active, setActive] = useState<TabKey>("findings");
  const [filter, setFilter] = useState<"all" | "critical" | "supporting" | "red_herring">("all");
  const current = tabs.find((tab) => tab.key === active)!;
  const discoveredEvidence = useMemo(
    () => evidence.filter((item) => discoveredEvidenceIds.includes(item.id)),
    [evidence, discoveredEvidenceIds],
  );
  const linkedEvidence = notes.linkedEvidence ?? {};
  const suspectNotes = notes.suspectNotes ?? {};

  const caseTheory = notes.caseTheory ?? {
    suspectId: "", motive: "", method: "", sequence: "",
    confidence: "low" as const, supportingEvidenceIds: [], contradictingEvidenceIds: [],
  };
  const updateCaseTheory = (patch: Partial<NonNullable<NotebookNotes["caseTheory"]>>) => {
    onChange({ ...notes, caseTheory: { ...caseTheory, ...patch } });
  };
  const toggleTheoryEvidence = (kind: "supportingEvidenceIds" | "contradictingEvidenceIds", evidenceId: string) => {
    const currentIds = caseTheory[kind];
    updateCaseTheory({ [kind]: currentIds.includes(evidenceId) ? currentIds.filter((id) => id !== evidenceId) : [...currentIds, evidenceId] });
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
