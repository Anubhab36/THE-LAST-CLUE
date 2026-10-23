import { useMemo, useState } from "react";
import type { Evidence, Suspect, TimelineEvent, InterrogationProfile } from "../../types/case";

type Props = {
  suspects: Suspect[];
  evidence: Evidence[];
  found: string[];
  connections: [string, string][];
  timeline: TimelineEvent[];
  interrogation: InterrogationProfile[];
};

export default function SuspectDossiers({ suspects, evidence, found, connections, timeline, interrogation }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "connected" | "unreviewed">("all");
  const discovered = useMemo(() => evidence.filter((item) => found.includes(item.id)), [evidence, found]);
  const rows = suspects.map((suspect) => {
    const linkedIds = connections.filter(([, suspectId]) => suspectId === suspect.id).map(([evidenceId]) => evidenceId);
    const linked = discovered.filter((item) => linkedIds.includes(item.id));
    const appearances = timeline.filter((event) => event.suspect_ids.includes(suspect.id));
    const interview = interrogation.find((profile) => profile.suspect_id === suspect.id);
    return { suspect, linked, appearances, questionCount: interview?.questions.length ?? 0 };
  });
  const visible = rows.filter((row) => filter === "all" || (filter === "connected" ? row.linked.length > 0 : row.linked.length === 0));

  return (
    <section className="suspect-dossiers panel" aria-labelledby="dossiers-title">
      <div className="panel-heading">
        <div><span className="panel-number">04</span><h2 id="dossiers-title">Suspect Dossiers</h2></div>
        <span className="count">{suspects.length} PROFILES</span>
      </div>
      <div className="dossiers-body">
        <p className="dossiers-intro">Review each person's known background, timeline appearances, and evidence you have explicitly connected on the evidence board. Unverified suspicions remain unproven.</p>
        <div className="dossiers-toolbar" role="group" aria-label="Filter suspect dossiers">
          {([
            ["all", "ALL SUSPECTS"],
            ["connected", "WITH LINKED EVIDENCE"],
            ["unreviewed", "NO LINKED EVIDENCE"],
          ] as const).map(([value, label]) => (
            <button type="button" key={value} className={filter === value ? "dossiers-filter active" : "dossiers-filter"} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>
          ))}
        </div>
        <div className="dossiers-grid">
          {visible.map(({ suspect, linked, appearances, questionCount }) => {
            const expanded = activeId === suspect.id;
            return (
              <article className={expanded ? "dossier-card expanded" : "dossier-card"} key={suspect.id}>
                <button type="button" className="dossier-card-toggle" aria-expanded={expanded} onClick={() => setActiveId(expanded ? null : suspect.id)}>
                  <span className="dossier-monogram" aria-hidden="true">{suspect.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("")}</span>
                  <span className="dossier-card-identity">
                    <small>PERSON OF INTEREST · {suspect.id.replace("suspect_", "").padStart(2, "0")}</small>
                    <strong>{suspect.name}</strong>
                    <span>{suspect.occupation} · {suspect.age} years old</span>
                    <span className="dossier-relationship">{suspect.relationship_to_victim}</span>
                  </span>
                  <span className="dossier-expand-icon">{expanded ? "−" : "+"}</span>
                </button>
                <div className="dossier-metrics">
                  <span><strong>{linked.length}</strong> LINKED CLUES</span>
                  <span><strong>{appearances.length}</strong> TIMELINE APPEARANCES</span>
                  <span><strong>{questionCount}</strong> INTERVIEW QUESTIONS</span>
                </div>
                {expanded && (
                  <div className="dossier-details">
                    <div className="dossier-detail-section">
                      <span className="dossier-label">KNOWN BACKGROUND</span>
                      <p>{suspect.description || "No additional background has been recorded for this suspect."}</p>
                    </div>
                    <div className="dossier-detail-section">
                      <span className="dossier-label">TIMELINE APPEARANCES</span>
                      {appearances.length ? (
                        <ul className="dossier-timeline-list">{appearances.map((event) => <li key={event.id}><time>{event.time}</time><span>{event.description}</span></li>)}</ul>
                      ) : <p className="dossier-muted">No timeline event currently names this suspect.</p>}
                    </div>
                    <div className="dossier-detail-section">
                      <span className="dossier-label">EVIDENCE LINKED BY YOU</span>
                      {linked.length ? (
                        <ul className="dossier-evidence-list">{linked.map((item) => <li key={item.id}><strong>{item.name}</strong><span>{item.description}</span><small>{item.importance.replace("_", " ").toUpperCase()}</small></li>)}</ul>
                      ) : <p className="dossier-muted">No discovered evidence is linked to this person yet. Use the evidence board to record a connection when you have a reason to do so.</p>}
                    </div>
                    <p className="dossier-caution">This dossier summarizes case records and your explicit evidence-board links. It does not determine guilt or change your score.</p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
        {visible.length === 0 && <p className="dossier-muted">No suspects match this filter yet.</p>}
      </div>
    </section>
  );
}
