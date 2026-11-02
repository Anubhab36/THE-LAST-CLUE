import { useMemo, useState } from "react";
import type { Evidence, Suspect, TimelineEvent, InterrogationProfile } from "../../types/case";

type Props = {
  suspects: Suspect[];
  evidence: Evidence[];
  found: string[];
  connections: [string, string][];
  timeline: TimelineEvent[];
  interrogation: InterrogationProfile[];
  onInterrogate: (suspect: Suspect) => void;
};

export default function SuspectDossiers({ suspects, evidence, found, connections, timeline, interrogation, onInterrogate }: Props) {
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
  const [compareFirstId, setCompareFirstId] = useState<string>("");
  const [compareSecondId, setCompareSecondId] = useState<string>("");
  const firstSuspect = suspects.find((item) => item.id === compareFirstId) ?? suspects[0];
  const secondSuspect = suspects.find((item) => item.id === compareSecondId && item.id !== firstSuspect?.id)
    ?? suspects.find((item) => item.id !== firstSuspect?.id);

  const linkedEvidenceFor = (suspectId: string) => {
    const linkedIds = new Set(connections.filter(([, linkedSuspectId]) => linkedSuspectId === suspectId).map(([evidenceId]) => evidenceId));
    return discovered.filter((item) => linkedIds.has(item.id));
  };
  const firstLinked = firstSuspect ? linkedEvidenceFor(firstSuspect.id) : [];
  const secondLinked = secondSuspect ? linkedEvidenceFor(secondSuspect.id) : [];
  const firstLinkedIds = new Set(firstLinked.map((item) => item.id));
  const secondLinkedIds = new Set(secondLinked.map((item) => item.id));
  const sharedEvidence = firstLinked.filter((item) => secondLinkedIds.has(item.id));
  const firstUnique = firstLinked.filter((item) => !secondLinkedIds.has(item.id));
  const secondUnique = secondLinked.filter((item) => !firstLinkedIds.has(item.id));
  const firstEvents = firstSuspect ? timeline.filter((event) => event.suspect_ids.includes(firstSuspect.id)) : [];
  const secondEvents = secondSuspect ? timeline.filter((event) => event.suspect_ids.includes(secondSuspect.id)) : [];
  const sharedEvents = firstEvents.filter((event) => event.suspect_ids.includes(secondSuspect?.id ?? ""));
  const firstOnlyEvents = firstEvents.filter((event) => !event.suspect_ids.includes(secondSuspect?.id ?? ""));
  const secondOnlyEvents = secondEvents.filter((event) => !event.suspect_ids.includes(firstSuspect?.id ?? ""));
  const unlinkedEvidence = discovered.filter((item) => !firstLinkedIds.has(item.id) && !secondLinkedIds.has(item.id));


  return (
    <section className="suspect-dossiers panel" aria-labelledby="dossiers-title">
      <div className="panel-heading">
        <div><span className="panel-number">04</span><h2 id="dossiers-title">Suspect Dossiers</h2></div>
        <span className="count">{suspects.length} PROFILES</span>
      </div>
      <div className="dossiers-body">
        <p className="dossiers-intro">Review each person's known background, timeline appearances, and evidence you have explicitly connected on the evidence board. Unverified suspicions remain unproven.</p>

        <section className="suspect-comparison" aria-labelledby="suspect-comparison-title">
          <div className="suspect-comparison-heading">
            <div>
              <span className="dossier-label">INVESTIGATIVE ANALYSIS · 01</span>
              <h3 id="suspect-comparison-title">Suspect–Evidence Comparison</h3>
              <p>Compare your recorded evidence links and the case timeline. This analysis does not establish guilt.</p>
            </div>
            <span className="suspect-comparison-count">{suspects.length} SUSPECTS</span>
          </div>
          {suspects.length < 2 ? (
            <p className="dossier-muted">At least two suspects are required for a comparison.</p>
          ) : (
            <>
              <div className="suspect-comparison-selectors">
                <label>FIRST SUSPECT
                  <select value={firstSuspect?.id ?? ""} onChange={(event) => setCompareFirstId(event.target.value)}>
                    {suspects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <span className="suspect-comparison-vs">VS</span>
                <label>SECOND SUSPECT
                  <select value={secondSuspect?.id ?? ""} onChange={(event) => setCompareSecondId(event.target.value)}>
                    {suspects.filter((item) => item.id !== firstSuspect?.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
              </div>
              {firstSuspect && secondSuspect && (
                <>
                  <div className="suspect-comparison-stats">
                    <div><strong>{sharedEvidence.length}</strong><span>SHARED CLUES</span></div>
                    <div><strong>{firstUnique.length}</strong><span>{firstSuspect.name.toUpperCase()} ONLY</span></div>
                    <div><strong>{secondUnique.length}</strong><span>{secondSuspect.name.toUpperCase()} ONLY</span></div>
                    <div><strong>{unlinkedEvidence.length}</strong><span>UNLINKED CLUES</span></div>
                  </div>
                  <div className="suspect-comparison-grid">
                    <section className="suspect-comparison-column">
                      <h4>SHARED EVIDENCE</h4>
                      {sharedEvidence.length ? <ul>{sharedEvidence.map((item) => <li key={item.id}><strong>{item.name}</strong><span>{item.description}</span></li>)}</ul> : <p className="dossier-muted">No discovered clues are currently linked to both suspects.</p>}
                    </section>
                    <section className="suspect-comparison-column">
                      <h4>{firstSuspect.name.toUpperCase()} · UNIQUE</h4>
                      {firstUnique.length ? <ul>{firstUnique.map((item) => <li key={item.id}><strong>{item.name}</strong><span>{item.description}</span></li>)}</ul> : <p className="dossier-muted">No unique evidence links recorded.</p>}
                    </section>
                    <section className="suspect-comparison-column">
                      <h4>{secondSuspect.name.toUpperCase()} · UNIQUE</h4>
                      {secondUnique.length ? <ul>{secondUnique.map((item) => <li key={item.id}><strong>{item.name}</strong><span>{item.description}</span></li>)}</ul> : <p className="dossier-muted">No unique evidence links recorded.</p>}
                    </section>
                  </div>
                  <div className="suspect-comparison-timeline">
                    <h4>TIMELINE APPEARANCES</h4>
                    <div className="suspect-comparison-grid">
                      <section className="suspect-comparison-column">
                        <h5>SHARED EVENTS</h5>
                        {sharedEvents.length ? <ul>{sharedEvents.map((event) => <li key={event.id}><strong>{event.time}</strong><span>{event.description}</span></li>)}</ul> : <p className="dossier-muted">No timeline events currently name both suspects.</p>}
                      </section>
                      <section className="suspect-comparison-column">
                        <h5>{firstSuspect.name.toUpperCase()} ONLY</h5>
                        {firstOnlyEvents.length ? <ul>{firstOnlyEvents.map((event) => <li key={event.id}><strong>{event.time}</strong><span>{event.description}</span></li>)}</ul> : <p className="dossier-muted">No exclusive timeline appearances.</p>}
                      </section>
                      <section className="suspect-comparison-column">
                        <h5>{secondSuspect.name.toUpperCase()} ONLY</h5>
                        {secondOnlyEvents.length ? <ul>{secondOnlyEvents.map((event) => <li key={event.id}><strong>{event.time}</strong><span>{event.description}</span></li>)}</ul> : <p className="dossier-muted">No exclusive timeline appearances.</p>}
                      </section>
                    </div>
                  </div>
                  <div className="suspect-comparison-unlinked">
                    <h4>DISCOVERED EVIDENCE NOT LINKED TO EITHER SUSPECT</h4>
                    {unlinkedEvidence.length ? <div className="suspect-comparison-unlinked-list">{unlinkedEvidence.map((item) => <span key={item.id}>{item.name}</span>)}</div> : <p className="dossier-muted">Every discovered clue is currently linked to at least one of these two suspects.</p>}
                  </div>
                  <p className="suspect-comparison-caution">Comparison reflects only evidence-board links you recorded and timeline data supplied by this case. Shared or unique associations are investigative leads, not proof of involvement.</p>
                </>
              )}
            </>
          )}
        </section>

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
                    <button type="button" className="primary dossier-interrogate-button" onClick={() => onInterrogate(suspect)}>INTERROGATE THIS SUSPECT</button>
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
