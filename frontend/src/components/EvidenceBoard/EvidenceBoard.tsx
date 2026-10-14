import { useMemo, useState } from "react";
import type { Evidence, Suspect } from "../../types/case";

type BoardFilter = "all" | "connected" | "unconnected";

interface EvidenceBoardProps {
  evidence: Evidence[];
  suspects: Suspect[];
  found: string[];
  connections: [string, string][];
  onConnect: (evidenceId: string, suspectId: string) => void;
  onDisconnect: (evidenceId: string, suspectId: string) => void;
}

export default function EvidenceBoard({
  evidence,
  suspects,
  found,
  connections,
  onConnect,
  onDisconnect,
}: EvidenceBoardProps) {
  const [filter, setFilter] = useState<BoardFilter>("all");
  const [feedback, setFeedback] = useState("");

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

  const portraitReferences = [
    "photo-1500648767791-00dcc994a43e",
    "photo-1534528741775-53994a69daeb",
    "photo-1506794778202-cad84cf45f1d",
    "photo-1531123897727-8f129e1688ce",
    "photo-1507003211169-0a1dd7228f2d",
    "photo-1544005313-94ddf0286df2",
  ];
  const portraitFor = (index: number) =>
    `https://images.unsplash.com/${portraitReferences[index % portraitReferences.length]}?auto=format&fit=crop&w=120&h=120&q=75`;

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

      <div className="suspect-dossier-strip" aria-label="Persons of interest">
        <div className="suspect-dossier-heading">
          <span className="toolbar-kicker">PERSONS OF INTEREST</span>
          <span className="toolbar-count">{suspects.length} DOSSIERS</span>
        </div>
        <div className="suspect-dossier-list">
          {suspects.map((suspect, index) => (
            <div className="suspect-dossier" key={suspect.id}>
              <img
                className="suspect-dossier-portrait"
                src={portraitFor(index)}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
              />
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
                          <img className="suspect-chip-portrait" src={portraitFor(suspects.findIndex((person) => person.id === suspect.id))} alt="" loading="lazy" />
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
