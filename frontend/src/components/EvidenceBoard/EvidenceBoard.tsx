import { useMemo, useState } from "react";
import type { Evidence, Suspect } from "../../types/case";

type BoardFilter = "all" | "connected" | "unconnected";

interface EvidenceCrossReference {
  id: string;
  firstEvidenceId: string;
  secondEvidenceId: string;
  deduction: string;
}

interface EvidenceBoardProps {
  evidence: Evidence[];
  suspects: Suspect[];
  found: string[];
  connections: [string, string][];
  evidenceCrossReferences: EvidenceCrossReference[];
  onAddEvidenceCrossReference: (firstEvidenceId: string, secondEvidenceId: string, deduction: string) => void;
  onRemoveEvidenceCrossReference: (id: string) => void;
  onConnect: (evidenceId: string, suspectId: string) => void;
  onDisconnect: (evidenceId: string, suspectId: string) => void;
}

export default function EvidenceBoard({
  evidence,
  suspects,
  found,
  connections,
  evidenceCrossReferences,
  onAddEvidenceCrossReference,
  onRemoveEvidenceCrossReference,
  onConnect,
  onDisconnect,
}: EvidenceBoardProps) {
  const [filter, setFilter] = useState<BoardFilter>("all");
  const [feedback, setFeedback] = useState("");
  const [selectedEvidenceId, setSelectedEvidenceId] = useState("");
  const [selectedSuspectId, setSelectedSuspectId] = useState("");
  const [crossReferenceFirstId, setCrossReferenceFirstId] = useState("");
  const [crossReferenceSecondId, setCrossReferenceSecondId] = useState("");
  const [crossReferenceDeduction, setCrossReferenceDeduction] = useState("");

  const discoveredEvidence = useMemo(
    () => evidence.filter((item) => found.includes(item.id)),
    [evidence, found],
  );

  const visibleEvidence = useMemo(
    () =>
      discoveredEvidence.filter((item) => {
        const connected = connections.some(([evidenceId]) => evidenceId === item.id);
        if (filter === "connected") return connected;
        if (filter === "unconnected") return !connected;
        return true;
      }),
    [discoveredEvidence, connections, filter],
  );

  const getEvidenceName = (id: string) =>
    evidence.find((item) => item.id === id)?.name ?? "Unknown evidence";
  const getSuspectName = (id: string) =>
    suspects.find((item) => item.id === id)?.name ?? "Unknown suspect";

  const handleConnect = (evidenceId: string, suspectId: string) => {
    const exists = connections.some(
      ([existingEvidence, existingSuspect]) =>
        existingEvidence === evidenceId && existingSuspect === suspectId,
    );
    if (exists) return;
    onConnect(evidenceId, suspectId);
    setFeedback(`Link recorded: “${getEvidenceName(evidenceId)}” ↔ ${getSuspectName(suspectId)}.`);
  };

  const handleDisconnect = (evidenceId: string, suspectId: string) => {
    onDisconnect(evidenceId, suspectId);
    setFeedback(`Link removed: “${getEvidenceName(evidenceId)}” ↔ ${getSuspectName(suspectId)}.`);
  };

  const suspectInitials = (name: string) =>
    name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");

  const criticalCount = discoveredEvidence.filter((item) => item.importance === "critical").length;
  const linkedEvidenceCount = discoveredEvidence.filter((item) =>
    connections.some(([evidenceId]) => evidenceId === item.id),
  ).length;

  return (
    <section className="board evidence-command" aria-labelledby="evidence-board-title">
      <div className="evidence-command-top">
        <div>
          <span className="eyebrow">INVESTIGATIVE ANALYSIS / 04</span>
          <h2 id="evidence-board-title">The Evidence Wall</h2>
          <p>Connect discovered clues to persons of interest. Build a theory, test it, and keep track of what remains unexplained.</p>
        </div>
        <div className="evidence-wall-stamp" aria-hidden="true">
          <span>CASE</span><strong>ACTIVE</strong><span>FIELD NOTES · CLASSIFIED</span>
        </div>
      </div>

      <div className="evidence-wall-metrics" aria-live="polite">
        <div className="evidence-wall-metric">
          <span className="metric-label">CLUES COLLECTED</span>
          <strong>{String(discoveredEvidence.length).padStart(2, "0")}<small> / {String(evidence.length).padStart(2, "0")}</small></strong>
          <span className="metric-foot">Evidence recovered</span>
        </div>
        <div className="evidence-wall-metric">
          <span className="metric-label">LINKS ESTABLISHED</span>
          <strong>{String(connections.length).padStart(2, "0")}</strong>
          <span className="metric-foot">Working hypotheses</span>
        </div>
        <div className="evidence-wall-metric">
          <span className="metric-label">CRITICAL CLUES</span>
          <strong>{String(criticalCount).padStart(2, "0")}</strong>
          <span className="metric-foot">High-priority findings</span>
        </div>
        <div className="evidence-wall-metric">
          <span className="metric-label">STILL UNLINKED</span>
          <strong>{String(Math.max(0, discoveredEvidence.length - linkedEvidenceCount)).padStart(2, "0")}</strong>
          <span className="metric-foot">Need further analysis</span>
        </div>
      </div>

      <div className="evidence-wall-toolbar">
        <div>
          <span className="toolbar-kicker">EVIDENCE REGISTER</span>
          <span className="toolbar-count">{visibleEvidence.length} RECORD{visibleEvidence.length === 1 ? "" : "S"}</span>
        </div>
        <div className="evidence-board-filters" aria-label="Filter evidence">
          {([
            ["all", "All clues"],
            ["connected", "Linked"],
            ["unconnected", "Unlinked"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`evidence-filter ${filter === value ? "selected" : ""}`}
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <section className="deduction-workbench" aria-labelledby="deduction-workbench-title">
        <div className="deduction-workbench-heading">
          <div>
            <span className="toolbar-kicker">FIELD ANALYSIS</span>
            <h3 id="deduction-workbench-title">Build a connection</h3>
            <p>Select a recovered clue and a person of interest to record a working theory.</p>
          </div>
          <span className="deduction-workbench-seal" aria-hidden="true">LC / 02</span>
        </div>
        {discoveredEvidence.length === 0 ? (
          <div className="deduction-workbench-empty">
            Recover evidence from the crime scene to start connecting clues to suspects.
          </div>
        ) : suspects.length === 0 ? (
          <div className="deduction-workbench-empty">No suspect dossiers are available for this case.</div>
        ) : (
          <>
            <div className="deduction-workbench-controls">
              <label>
                <span>01 / SELECT EVIDENCE</span>
                <select
                  value={discoveredEvidence.some((item) => item.id === selectedEvidenceId) ? selectedEvidenceId : discoveredEvidence[0].id}
                  onChange={(event) => setSelectedEvidenceId(event.target.value)}
                >
                  {discoveredEvidence.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <span className="deduction-link-symbol" aria-hidden="true">↔</span>
              <label>
                <span>02 / SELECT PERSON</span>
                <select
                  value={suspects.some((item) => item.id === selectedSuspectId) ? selectedSuspectId : suspects[0].id}
                  onChange={(event) => setSelectedSuspectId(event.target.value)}
                >
                  {suspects.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="deduction-connect-button"
                disabled={connections.some(([evidenceId, suspectId]) =>
                  evidenceId === (discoveredEvidence.some((item) => item.id === selectedEvidenceId) ? selectedEvidenceId : discoveredEvidence[0].id)
                  && suspectId === (suspects.some((item) => item.id === selectedSuspectId) ? selectedSuspectId : suspects[0].id)
                )}
                onClick={() => {
                  const evidenceId = discoveredEvidence.some((item) => item.id === selectedEvidenceId) ? selectedEvidenceId : discoveredEvidence[0].id;
                  const suspectId = suspects.some((item) => item.id === selectedSuspectId) ? selectedSuspectId : suspects[0].id;
                  handleConnect(evidenceId, suspectId);
                }}
              >
                + Record theory
              </button>
            </div>
            <div className="deduction-preview" aria-live="polite">
              <div className="deduction-preview-node">
                <span>EXHIBIT</span>
                <strong>{discoveredEvidence.find((item) => item.id === selectedEvidenceId)?.name ?? discoveredEvidence[0].name}</strong>
              </div>
              <span className="deduction-preview-line" aria-hidden="true"><i /></span>
              <div className="deduction-preview-node person">
                <span>PERSON OF INTEREST</span>
                <strong>{suspects.find((item) => item.id === selectedSuspectId)?.name ?? suspects[0].name}</strong>
              </div>
              <span className="deduction-preview-note">HYPOTHESIS · NOT PROOF</span>
            </div>
          </>
        )}
      </section>

      <section className="cross-reference-workbench" aria-labelledby="cross-reference-title">
        <div className="cross-reference-heading">
          <div>
            <span className="toolbar-kicker">COMPARATIVE ANALYSIS</span>
            <h3 id="cross-reference-title">Cross-reference evidence</h3>
            <p>Compare two recovered clues and record the connection you believe they suggest.</p>
          </div>
          <span className="deduction-workbench-seal" aria-hidden="true">LC / 03</span>
        </div>
        {discoveredEvidence.length < 2 ? (
          <div className="cross-reference-empty">Recover at least two clues to compare evidence against evidence.</div>
        ) : (
          <form
            className="cross-reference-form"
            onSubmit={(event) => {
              event.preventDefault();
              const first = discoveredEvidence.some((item) => item.id === crossReferenceFirstId)
                ? crossReferenceFirstId : discoveredEvidence[0].id;
              const second = discoveredEvidence.some((item) => item.id === crossReferenceSecondId)
                ? crossReferenceSecondId : discoveredEvidence[1].id;
              const pairExists = evidenceCrossReferences.some((item) =>
                (item.firstEvidenceId === first && item.secondEvidenceId === second)
                || (item.firstEvidenceId === second && item.secondEvidenceId === first)
              );
              const deduction = crossReferenceDeduction.trim();
              if (first === second || pairExists || !deduction) return;
              onAddEvidenceCrossReference(first, second, deduction);
              setCrossReferenceDeduction("");
              setFeedback("Evidence cross-reference recorded. This is your deduction, not a confirmed case fact.");
            }}
          >
            <div className="cross-reference-selectors">
              <label>
                <span>01 / FIRST CLUE</span>
                <select
                  value={discoveredEvidence.some((item) => item.id === crossReferenceFirstId) ? crossReferenceFirstId : discoveredEvidence[0].id}
                  onChange={(event) => setCrossReferenceFirstId(event.target.value)}
                >
                  {discoveredEvidence.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <span className="cross-reference-symbol" aria-hidden="true">＋</span>
              <label>
                <span>02 / SECOND CLUE</span>
                <select
                  value={discoveredEvidence.some((item) => item.id === crossReferenceSecondId) ? crossReferenceSecondId : discoveredEvidence[1].id}
                  onChange={(event) => setCrossReferenceSecondId(event.target.value)}
                >
                  {discoveredEvidence.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
            </div>
            <label className="cross-reference-deduction-label">
              <span>YOUR DEDUCTION</span>
              <textarea
                value={crossReferenceDeduction}
                onChange={(event) => setCrossReferenceDeduction(event.target.value)}
                placeholder="What do these two clues suggest when considered together?"
                maxLength={600}
                rows={3}
                required
              />
            </label>
            {(() => {
              const first = discoveredEvidence.some((item) => item.id === crossReferenceFirstId) ? crossReferenceFirstId : discoveredEvidence[0].id;
              const second = discoveredEvidence.some((item) => item.id === crossReferenceSecondId) ? crossReferenceSecondId : discoveredEvidence[1].id;
              const duplicate = evidenceCrossReferences.some((item) =>
                (item.firstEvidenceId === first && item.secondEvidenceId === second)
                || (item.firstEvidenceId === second && item.secondEvidenceId === first)
              );
              return (
                <button type="submit" className="cross-reference-save" disabled={first === second || duplicate || !crossReferenceDeduction.trim()}>
                  {duplicate ? "PAIR ALREADY RECORDED" : first === second ? "SELECT TWO DIFFERENT CLUES" : "+ RECORD DEDUCTION"}
                </button>
              );
            })()}
          </form>
        )}
        <div className="cross-reference-records" aria-live="polite">
          <div className="cross-reference-records-heading">
            <span className="toolbar-kicker">RECORDED CONNECTIONS</span>
            <span className="toolbar-count">{evidenceCrossReferences.length} DEDUCTION{evidenceCrossReferences.length === 1 ? "" : "S"}</span>
          </div>
          {evidenceCrossReferences.length === 0 ? (
            <p className="cross-reference-no-records">No evidence-to-evidence deductions recorded yet.</p>
          ) : (
            <div className="cross-reference-list">
              {evidenceCrossReferences.map((item, index) => (
                <article className="cross-reference-record" key={item.id}>
                  <div className="cross-reference-record-topline">
                    <span>DEDUCTION {String(index + 1).padStart(2, "0")}</span>
                    <button type="button" onClick={() => onRemoveEvidenceCrossReference(item.id)} aria-label="Remove evidence cross-reference">REMOVE</button>
                  </div>
                  <div className="cross-reference-pair">
                    <strong>{getEvidenceName(item.firstEvidenceId)}</strong>
                    <span aria-hidden="true">↔</span>
                    <strong>{getEvidenceName(item.secondEvidenceId)}</strong>
                  </div>
                  <p>{item.deduction}</p>
                  <small>PLAYER RECORDED · NOT VERIFIED FACT</small>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="suspect-dossier-strip" aria-label="Persons of interest">
        <div className="suspect-dossier-heading">
          <span className="toolbar-kicker">PERSONS OF INTEREST</span>
          <span className="toolbar-count">{suspects.length} DOSSIERS</span>
        </div>
        <div className="suspect-dossier-list">
          {suspects.map((suspect, index) => (
            <div className="suspect-dossier" key={suspect.id}>
              <span className="suspect-dossier-monogram" aria-hidden="true">{suspectInitials(suspect.name)}</span>
              <div className="suspect-dossier-details">
                <span className="suspect-dossier-id">SUBJECT {String(index + 1).padStart(2, "0")}</span>
                <strong>{suspect.name}</strong>
                <span>{suspect.relationship_to_victim || suspect.occupation}</span>
              </div>
              <span className="suspect-dossier-corner" aria-hidden="true">↗</span>
            </div>
          ))}
        </div>
        <p className="suspect-dossier-disclaimer">Illustrative reference portraits · not verified identities</p>
      </div>

      {feedback && (
        <div className="evidence-board-feedback" role="status" aria-live="polite">
          <span className="feedback-indicator" />{feedback}
          <button type="button" onClick={() => setFeedback("")} aria-label="Dismiss update">×</button>
        </div>
      )}

      {discoveredEvidence.length === 0 ? (
        <div className="evidence-board-empty">
          <span className="empty-file-mark">+</span>
          <strong>Evidence register is empty</strong>
          <p>Inspect the crime scene and complete investigative actions to recover clues. Every discovery will appear here.</p>
        </div>
      ) : visibleEvidence.length === 0 ? (
        <div className="evidence-board-empty">
          <span className="empty-file-mark">—</span>
          <strong>{filter === "connected" ? "No links recorded yet" : "Every discovered clue has a link"}</strong>
          <p>Change the filter to review another part of the evidence register.</p>
        </div>
      ) : (
        <div className="evidence-wall-grid">
          {visibleEvidence.map((item, index) => {
            const itemConnections = connections.filter(([evidenceId]) => evidenceId === item.id);
            const importanceLabel = item.importance.replace(/_/g, " ");
            return (
              <article className="evidence-file" key={item.id}>
                <div className="evidence-file-topline">
                  <span className="evidence-file-index">EXHIBIT {String(index + 1).padStart(2, "0")}</span>
                  <span className={`evidence-priority priority-${item.importance}`}>{importanceLabel}</span>
                </div>
                <div className="evidence-file-symbol" aria-hidden="true">
                  {item.importance === "critical" ? "✳" : item.importance === "red_herring" ? "?" : "◇"}
                </div>
                <h3>{item.name}</h3>
                <p className="evidence-file-description">{item.description}</p>

                <div className="evidence-file-links">
                  <div className="evidence-file-section-heading">
                    <span>ASSOCIATED PERSONS</span><strong>{String(itemConnections.length).padStart(2, "0")}</strong>
                  </div>
                  {itemConnections.length === 0 ? (
                    <p className="evidence-no-links">No association recorded.</p>
                  ) : (
                    <ul>
                      {itemConnections.map(([, suspectId]) => (
                        <li key={`${item.id}-${suspectId}`}>
                          <span className="connection-node" />
                          <span className="connection-name">{getSuspectName(suspectId)}</span>
                          <button
                            type="button"
                            className="evidence-remove-link"
                            onClick={() => handleDisconnect(item.id, suspectId)}
                            aria-label={`Remove link from ${item.name} to ${getSuspectName(suspectId)}`}
                          >REMOVE</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="evidence-file-link-actions">
                  <span className="link-action-label">ESTABLISH A LINK</span>
                  <div className="evidence-suspect-options">
                    {suspects.map((suspect) => {
                      const active = itemConnections.some(([, suspectId]) => suspectId === suspect.id);
                      return (
                        <button
                          key={suspect.id}
                          type="button"
                          disabled={active}
                          className={`evidence-suspect-chip ${active ? "active" : ""}`}
                          onClick={() => handleConnect(item.id, suspect.id)}
                        >
                          <span className="suspect-chip-monogram" aria-hidden="true">{suspectInitials(suspect.name)}</span>
                          <span className="suspect-chip-symbol">{active ? "✓" : "+"}</span>{suspect.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="evidence-wall-footer">
        <span className="footer-seal">LC / IU</span>
        <p><strong>Analyst's note</strong> — Connections represent your working hypotheses, not confirmed proof of guilt. Reassess them as new evidence emerges.</p>
        <span className="footer-classification">CONFIDENTIAL</span>
      </div>
    </section>
  );
}
