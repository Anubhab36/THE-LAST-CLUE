import { useMemo, useState } from "react";
import type { Evidence, Suspect } from "../../types/case";

export type NotebookNotes = {
  findings: string;
  theories: string;
  questions: string;
  suspectNotes?: Record<string, string>;
  linkedEvidence?: Record<string, string[]>;
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
