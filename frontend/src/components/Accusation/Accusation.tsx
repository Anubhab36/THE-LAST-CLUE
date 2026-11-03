import { useMemo, useState } from "react";
import type { Case } from "../../types/case";

type Props = {
  gameCase: Case;
  found: string[];
  onSubmit: (killer: string, motive: string, method: string, evidenceIds: string[], reasoning: string) => void | Promise<void>;
  onCancel: () => void;
  canCancel?: boolean;
  submitting?: boolean;
};

export default function Accusation({
  gameCase,
  found,
  onSubmit,
  onCancel,
  canCancel = true,
  submitting = false,
}: Props) {
  const [killer, setKiller] = useState("");
  const [motive, setMotive] = useState("");
  const [method, setMethod] = useState("");
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);
  const [reasoning, setReasoning] = useState("");

  const discoveredEvidence = useMemo(
    () => gameCase.evidence.filter((item) => found.includes(item.id)),
    [gameCase.evidence, found],
  );

  const toggleEvidence = (id: string) => {
    setSelectedEvidence((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const closeOnBackdrop = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && canCancel && !submitting) onCancel();
  };

  const canSubmit = Boolean(
    killer && motive.trim() && method.trim()
    && (discoveredEvidence.length === 0 || selectedEvidence.length > 0),
  );

  return (
    <div className="overlay accusation-overlay" onMouseDown={closeOnBackdrop}>
      <div
        className="modal accusation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="accusation-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {canCancel && (
          <button className="close" onClick={onCancel} disabled={submitting} aria-label="Cancel accusation">×</button>
        )}

        <span className="eyebrow">FINAL ACCUSATION · CASE REVIEW</span>
        <h2 id="accusation-title">Present your case</h2>
        <p className="accusation-intro">
          A conclusion is stronger when it is supported. Identify the suspect, establish the motive and method, then submit the exhibits that support your theory.
        </p>

        <section className="accusation-step">
          <div className="accusation-step-heading"><span>01</span><div><strong>Identify the perpetrator</strong><small>Who killed {gameCase.victim.name}?</small></div></div>
          <label className="accusation-field">
            <span>ACCUSED SUSPECT</span>
            <select value={killer} onChange={(event) => setKiller(event.target.value)} disabled={submitting}>
              <option value="">Select suspect</option>
              {gameCase.suspects.map((suspect) => <option key={suspect.id} value={suspect.id}>{suspect.name}</option>)}
            </select>
          </label>
        </section>

        <section className="accusation-step">
          <div className="accusation-step-heading"><span>02</span><div><strong>Establish the crime</strong><small>Explain why and how it happened.</small></div></div>
          <label className="accusation-field">
            <span>MOTIVE</span>
            <textarea rows={2} value={motive} onChange={(event) => setMotive(event.target.value)} placeholder="What drove the killer?" disabled={submitting} />
          </label>
          <label className="accusation-field">
            <span>METHOD</span>
            <textarea rows={2} value={method} onChange={(event) => setMethod(event.target.value)} placeholder="How was the victim killed?" disabled={submitting} />
          </label>
        </section>

        <section className="accusation-step">
          <div className="accusation-step-heading">
            <span>03</span>
            <div><strong>Submit supporting evidence</strong><small>Select the discovered exhibits that support your accusation.</small></div>
            <b className="accusation-selected-count">{selectedEvidence.length} SELECTED</b>
          </div>
          {discoveredEvidence.length ? (
            <div className="accusation-evidence-list">
              {discoveredEvidence.map((item) => (
                <label key={item.id} className={selectedEvidence.includes(item.id) ? "accusation-evidence selected" : "accusation-evidence"}>
                  <input type="checkbox" checked={selectedEvidence.includes(item.id)} onChange={() => toggleEvidence(item.id)} disabled={submitting} />
                  <span className="accusation-evidence-copy"><strong>{item.name}</strong><small>{item.description}</small><em>{item.importance.replace(/_/g, " ").toUpperCase()}</em></span>
                  <span className="accusation-evidence-check" aria-hidden="true">{selectedEvidence.includes(item.id) ? "✓" : "+"}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="accusation-no-evidence">No evidence has been discovered. You can still submit an accusation, but it will have no selected exhibits.</p>
          )}
        </section>

        <section className="accusation-step">
          <div className="accusation-step-heading"><span>04</span><div><strong>State your deduction</strong><small>Connect the clues to your conclusion (optional).</small></div></div>
          <label className="accusation-field">
            <span>DETECTIVE'S REASONING</span>
            <textarea rows={3} value={reasoning} onChange={(event) => setReasoning(event.target.value)} placeholder="Explain how the evidence connects the suspect to the motive and method…" disabled={submitting} />
          </label>
        </section>

        {discoveredEvidence.length > 0 && selectedEvidence.length === 0 && (
          <p className="accusation-validation" role="status">Select at least one discovered exhibit before submitting your case.</p>
        )}

        <div className="accusation-actions">
          {canCancel && <button className="secondary" onClick={onCancel} disabled={submitting}>RETURN TO INVESTIGATION</button>}
          <button className="primary" disabled={!canSubmit || submitting} onClick={() => {
            if (canSubmit && !submitting) void onSubmit(killer, motive.trim(), method.trim(), selectedEvidence, reasoning.trim());
          }}>
            {submitting ? "REVIEWING YOUR CASE…" : "SUBMIT FINAL ACCUSATION"}
          </button>
        </div>
        <p className="accusation-disclaimer">Your selected exhibits and reasoning are saved with this accusation. The existing scoring engine continues to calculate points from the case answers and investigation progress.</p>
      </div>
    </div>
  );
}
