import type { InvestigationAction } from "../../types/case";

interface Props {
  actions: InvestigationAction[];
  found: string[];
  completed: string[];
  results: Record<string, string>;
  onRun: (action: InvestigationAction) => void;
}

export default function InvestigationActions({ actions, found, completed, results, onRun }: Props) {
  const available = actions.filter((action) =>
    action.requires_evidence_ids.every((id) => found.includes(id)) &&
    action.requires_action_ids.every((id) => completed.includes(id))
  );
  return <section className="board investigation-actions">
    <div className="section-head"><div><h2>Forensics & Follow-up Leads</h2><p className="muted">Analysis consumes investigation time and can unlock new evidence.</p></div><span>{completed.length}/{actions.length} COMPLETED</span></div>
    {actions.length === 0 ? <p className="muted">No additional analysis actions are available for this case.</p> : <div className="board-grid">
      {actions.map((action) => {
        const done = completed.includes(action.id);
        const unlocked = available.some((item) => item.id === action.id);
        return <article className={`e-card investigation-action ${done ? "action-complete" : ""}`} key={action.id}>
          <small>{action.category.replace("_", " ").toUpperCase()} · {Math.ceil(action.time_cost_seconds / 60)} MIN</small>
          <h3>{action.title}</h3><p>{action.description}</p>
          {done && results[action.id] && <div className="action-result">{results[action.id]}</div>}
          {!done && !unlocked && <p className="muted action-locked">Locked — collect the prerequisite evidence or complete an earlier lead.</p>}
          <button className="primary" disabled={done || !unlocked} onClick={() => onRun(action)}>{done ? "ANALYSIS COMPLETE" : unlocked ? "RUN ANALYSIS" : "LEAD LOCKED"}</button>
        </article>;
      })}
    </div>}
  </section>;
}
