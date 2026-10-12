import type { Evidence } from "../../types/case";

interface CrimeSceneProps {
  evidence: Evidence[];
  found: string[];
  completedActions: string[];
  onInspect: (evidence: Evidence) => void;
}

export default function CrimeScene({ evidence, found, completedActions, onInspect }: CrimeSceneProps) {
  const isUnlocked = (item: Evidence) =>
    (item.requires_evidence_ids ?? []).every((id) => found.includes(id)) &&
    (item.requires_action_ids ?? []).every((id) => completedActions.includes(id));

  return (
    <div className="scene-grid v2-scene-grid">
      {evidence.map((item, index) => {
        const unlocked = isUnlocked(item);
        const discovered = found.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            className={`scene-object v2-evidence-object ${discovered ? "investigated" : ""} ${!unlocked ? "locked" : ""}`}
            disabled={!unlocked}
            onClick={() => onInspect(item)}
            aria-label={unlocked ? `Inspect ${item.name}` : `Locked clue: ${item.name}`}
          >
            <span className="v2-object-index">{String(index + 1).padStart(2, "0")}</span>
            <strong>{unlocked ? item.name : "Unresolved lead"}</strong>
            <small>
              {!unlocked ? "LOCKED · FOLLOW THE LEAD" : discovered ? "EXAMINED" : "INSPECT"}
            </small>
            {!unlocked && item.unlock_hint && <span className="v2-unlock-hint">{item.unlock_hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
