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
        const connected = connections.some(
          ([evidenceId]) => evidenceId === item.id,
        );

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
    setFeedback(
      `Linked "${getEvidenceName(evidenceId)}" to ${getSuspectName(suspectId)}.`,
    );
  };

  const handleDisconnect = (evidenceId: string, suspectId: string) => {
    onDisconnect(evidenceId, suspectId);
    setFeedback(
      `Removed the link between "${getEvidenceName(evidenceId)}" and ${getSuspectName(suspectId)}.`,
    );
  };

  return (
    <section className="board" aria-labelledby="evidence-board-title">
      <div className="section-head evidence-board-heading">
        <div>
          <h2 id="evidence-board-title">Evidence Board</h2>
          <p className="muted evidence-board-subtitle">
            Build and review your own investigative theories.
          </p>
        </div>
        <span>PLAYER HYPOTHESES</span>
      </div>

      <div className="evidence-board-stats" aria-live="polite">
        <div>
          <strong>{discoveredEvidence.length}</strong>
          <span>CLUES DISCOVERED</span>
        </div>
        <div>
          <strong>{connections.length}</strong>
          <span>LINKS RECORDED</span>
        </div>
      </div>

      <div className="evidence-board-toolbar">
        <div className="evidence-board-filters" aria-label="Filter evidence">
          {(
            [
              ["all", "All clues"],
              ["connected", "Linked"],
              ["unconnected", "Unlinked"],
            ] as const
          ).map(([value, label]) => (
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

      {feedback && (
        <p className="evidence-board-feedback" role="status" aria-live="polite">
          {feedback}
        </p>
      )}

      {discoveredEvidence.length === 0 ? (
        <div className="evidence-board-empty">
          <strong>No evidence discovered yet.</strong>
          <p>Investigate the crime scene to collect clues for your board.</p>
        </div>
      ) : visibleEvidence.length === 0 ? (
        <div className="evidence-board-empty">
          <strong>
            {filter === "connected"
              ? "No linked clues yet."
              : "All discovered clues are linked."}
          </strong>
          <p>Choose another filter to review your evidence.</p>
        </div>
      ) : (
        <div className="board-grid">
          {visibleEvidence.map((item) => {
            const itemConnections = connections.filter(
              ([evidenceId]) => evidenceId === item.id,
            );

            return (
              <article className="e-card" key={item.id}>
                <div className="evidence-card-top">
                  <span className="evidence-importance">
                    {item.importance.replace(/_/g, " ")}
                  </span>
                  <span className="evidence-link-count">
                    {itemConnections.length}{" "}
                    {itemConnections.length === 1 ? "LINK" : "LINKS"}
                  </span>
                </div>

                <h3>{item.name}</h3>
                <p>{item.description}</p>

                <div className="evidence-card-connections">
                  <h4>Recorded connections</h4>
                  {itemConnections.length === 0 ? (
                    <p className="evidence-no-links">No suspect linked yet.</p>
                  ) : (
                    <ul>
                      {itemConnections.map(([, suspectId]) => (
                        <li key={`${item.id}-${suspectId}`}>
                          <span>{getSuspectName(suspectId)}</span>
                          <button
                            type="button"
                            className="evidence-remove-link"
                            onClick={() =>
                              handleDisconnect(item.id, suspectId)
                            }
                            aria-label={`Remove link from ${item.name} to ${getSuspectName(suspectId)}`}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="evidence-card-link-actions">
                  <h4>Link this clue to a suspect</h4>
                  <div className="chips">
                    {suspects.map((suspect) => {
                      const active = itemConnections.some(
                        ([, suspectId]) => suspectId === suspect.id,
                      );

                      return (
                        <button
                          key={suspect.id}
                          type="button"
                          disabled={active}
                          className={`chip ${active ? "active" : ""}`}
                          onClick={() => handleConnect(item.id, suspect.id)}
                        >
                          {active ? "✓ " : "+ "}
                          {suspect.name}
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

      <p className="evidence-board-note">
        Connections are your hypotheses, not confirmed proof of guilt. Review
        the full evidence before making an accusation.
      </p>
    </section>
  );
}
