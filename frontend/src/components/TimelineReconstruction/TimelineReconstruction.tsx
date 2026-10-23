import { useMemo, useState } from "react";
import type { TimelineEvent, Suspect } from "../../types/case";

type Props = {
  events: TimelineEvent[];
  suspects: Suspect[];
};

function timeValue(value: string): number {
  const match = value.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export default function TimelineReconstruction({ events, suspects }: Props) {
  const chronological = useMemo(
    () => [...events].sort((a, b) => timeValue(a.time) - timeValue(b.time)),
    [events],
  );
  const [order, setOrder] = useState<string[]>(() => chronological.map((event) => event.id));
  const [checked, setChecked] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  // If the active case changes, discard any ordering from the previous case.
  const eventKey = chronological.map((event) => event.id).join("|");
  const [orderKey, setOrderKey] = useState(eventKey);
  if (orderKey !== eventKey) {
    setOrderKey(eventKey);
    setOrder(chronological.map((event) => event.id));
    setChecked(false);
    setSelectedEvent(null);
  }

  const byId = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);
  const orderedEvents = order.map((id) => byId.get(id)).filter((event): event is TimelineEvent => Boolean(event));
  const correctOrder = chronological.map((event) => event.id);
  const correctPositions = new Map(correctOrder.map((id, index) => [id, index]));
  const placedCorrectly = order.reduce(
    (count, id, index) => count + (correctPositions.get(id) === index ? 1 : 0),
    0,
  );
  const move = (id: string, direction: -1 | 1) => {
    setOrder((current) => {
      const index = current.indexOf(id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    setChecked(false);
  };

  return (
    <section className="timeline-reconstruction panel" aria-labelledby="timeline-reconstruction-title">
      <div className="panel-heading">
        <div><span className="panel-number">05</span><h2 id="timeline-reconstruction-title">Reconstruct the timeline</h2></div>
        <span className="count">DEDUCTION WORKSHOP</span>
      </div>
      <div className="timeline-reconstruction-body">
        <p className="timeline-reconstruction-intro">
          Test your understanding of the night’s events. Move events into the order you believe they occurred, then check your reconstruction against the recorded timestamps.
        </p>
        <div className="timeline-reconstruction-stats">
          <span><strong>{events.length}</strong> EVENTS</span>
          <span><strong>{checked ? `${placedCorrectly}/${events.length}` : "—"}</strong> POSITIONS MATCHED</span>
        </div>
        {events.length === 0 ? (
          <p className="timeline-reconstruction-empty">No timeline events are available for this case.</p>
        ) : (
          <ol className="reconstruction-list">
            {orderedEvents.map((event, index) => (
              <li className="reconstruction-item" key={event.id}>
                <div className="reconstruction-rank">{String(index + 1).padStart(2, "0")}</div>
                <div className="reconstruction-card">
                  <button
                    type="button"
                    className="reconstruction-event-toggle"
                    aria-expanded={selectedEvent === event.id}
                    onClick={() => setSelectedEvent((current) => current === event.id ? null : event.id)}
                  >
                    <span className="reconstruction-time">{checked ? event.time : "TIME UNKNOWN"}</span>
                    <span className="reconstruction-description">{event.description}</span>
                    <span className="reconstruction-chevron">{selectedEvent === event.id ? "−" : "+"}</span>
                  </button>
                  {selectedEvent === event.id && (
                    <div className="reconstruction-details">
                      <div className="chips">
                        {event.suspect_ids.map((id) => {
                          const person = suspects.find((suspect) => suspect.id === id);
                          return person ? <span className="tag" key={id}>{person.name}</span> : null;
                        })}
                        {event.victim_involved && <span className="tag">VICTIM INVOLVED</span>}
                      </div>
                      <p>Compare who was present with the statements and evidence you have collected. A person’s presence is a lead, not proof of guilt.</p>
                    </div>
                  )}
                </div>
                <div className="reconstruction-controls" aria-label={`Move event ${index + 1}`}>
                  <button type="button" onClick={() => move(event.id, -1)} disabled={index === 0} aria-label="Move earlier">↑</button>
                  <button type="button" onClick={() => move(event.id, 1)} disabled={index === orderedEvents.length - 1} aria-label="Move later">↓</button>
                </div>
              </li>
            ))}
          </ol>
        )}
        <div className="reconstruction-actions">
          <button type="button" className="secondary" onClick={() => { setOrder(chronological.map((event) => event.id)); setChecked(false); }}>
            RESET ORDER
          </button>
          <button type="button" className="primary" onClick={() => setChecked(true)} disabled={events.length === 0}>
            CHECK MY RECONSTRUCTION
          </button>
        </div>
        {checked && (
          <div className={`reconstruction-feedback ${placedCorrectly === events.length ? "is-correct" : ""}`} role="status" aria-live="polite">
            <strong>{placedCorrectly === events.length ? "Sequence verified" : `${placedCorrectly} of ${events.length} events are in the correct position`}</strong>
            <p>{placedCorrectly === events.length
              ? "Your reconstruction matches the case timeline. Now compare it with suspect alibis and the clues on your evidence board."
              : "Use the recorded times as a reference, then adjust the sequence. This exercise is for deduction practice and does not change your case score."}</p>
          </div>
        )}
        <p className="reconstruction-disclaimer">This is a deduction exercise. It does not modify important-event selections, investigation progress, or your score.</p>
      </div>
    </section>
  );
}
