import { useMemo, useState } from "react";
import type { Evidence } from "../../types/case";
import CrimeScene from "./CrimeScene";
import "./ImmersiveCrimeScene.css";

interface Props {
  evidence: Evidence[];
  found: string[];
  completedActions: string[];
  onInspect: (evidence: Evidence) => void;
  locationName: string;
}

const hotspotPositions = [
  { left: "16%", top: "68%" },
  { left: "31%", top: "45%" },
  { left: "48%", top: "70%" },
  { left: "68%", top: "50%" },
  { left: "82%", top: "72%" },
  { left: "23%", top: "28%" },
  { left: "42%", top: "34%" },
  { left: "59%", top: "25%" },
  { left: "76%", top: "32%" },
  { left: "91%", top: "43%" },
  { left: "36%", top: "82%" },
  { left: "64%", top: "82%" },
];

export default function ImmersiveCrimeScene({
  evidence,
  found,
  completedActions,
  onInspect,
  locationName,
}: Props) {
  const [view, setView] = useState<"immersive" | "list">("immersive");
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);

  const unlockedEvidence = useMemo(
    () => evidence.filter((item) =>
      (item.requires_evidence_ids ?? []).every((id) => found.includes(id)) &&
      (item.requires_action_ids ?? []).every((id) => completedActions.includes(id)),
    ),
    [evidence, found, completedActions],
  );
  const inspectedCount = evidence.filter((item) => found.includes(item.id)).length;
  const complete = evidence.length > 0 && inspectedCount === evidence.length;

  return (
    <div className="immersive-scene-shell">
      <div className="immersive-scene-toolbar">
        <div className="immersive-scene-location">
          <span className="immersive-live-dot" aria-hidden="true" />
          <div>
            <span className="immersive-kicker">ACTIVE INVESTIGATION ZONE</span>
            <strong>{locationName}</strong>
          </div>
        </div>
        <div className="immersive-scene-controls" role="group" aria-label="Crime scene view">
          <button type="button" className={view === "immersive" ? "active" : ""} aria-pressed={view === "immersive"} onClick={() => setView("immersive")}>SCENE VIEW</button>
          <button type="button" className={view === "list" ? "active" : ""} aria-pressed={view === "list"} onClick={() => setView("list")}>EVIDENCE LIST</button>
        </div>
      </div>

      {view === "immersive" ? (
        <div className={`immersive-room ${complete ? "scene-complete" : ""}`} aria-label={`Interactive crime scene at ${locationName}`}>
          <div className="immersive-room-backwall" />
          <div className="immersive-window"><span /><span /><span /><span /></div>
          <div className="immersive-door"><span>AUTHORIZED PERSONNEL ONLY</span></div>
          <div className="immersive-room-rug" />
          <div className="immersive-room-table"><span /><span /><span /></div>
          <div className="immersive-room-lamp" />
          <div className="immersive-tape immersive-tape-one" />
          <div className="immersive-tape immersive-tape-two" />

          <div className="immersive-room-overlay">
            <span className="immersive-scene-stamp">EVIDENCE COLLECTION / LIVE</span>
            <span className="immersive-room-gridline" aria-hidden="true" />
            {evidence.map((item, index) => {
              const unlocked = (item.requires_evidence_ids ?? []).every((id) => found.includes(id)) &&
                (item.requires_action_ids ?? []).every((id) => completedActions.includes(id));
              const discovered = found.includes(item.id);
              const position = hotspotPositions[index % hotspotPositions.length];
              const selected = selectedHotspot === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`immersive-hotspot ${discovered ? "discovered" : ""} ${!unlocked ? "locked" : ""} ${selected ? "selected" : ""}`}
                  style={position}
                  disabled={!unlocked}
                  onClick={() => { setSelectedHotspot(item.id); onInspect(item); }}
                  aria-label={unlocked ? `Examine evidence ${index + 1}: ${item.name}` : `Locked evidence lead ${index + 1}`}
                  title={unlocked ? item.name : "Follow other leads to unlock"}
                >
                  <span className="immersive-hotspot-ring"><span>{discovered ? "✓" : String(index + 1).padStart(2, "0")}</span></span>
                  <span className="immersive-hotspot-label">{unlocked ? item.name : "UNRESOLVED LEAD"}</span>
                </button>
              );
            })}
            <div className="immersive-room-footer">
              <div><span>SCENE STATUS</span><strong>{complete ? "ALL EVIDENCE EXAMINED" : "EVIDENCE SEARCH IN PROGRESS"}</strong></div>
              <div className="immersive-progress"><span style={{ width: `${evidence.length ? (inspectedCount / evidence.length) * 100 : 0}%` }} /></div>
              <strong>{inspectedCount.toString().padStart(2, "0")} / {evidence.length.toString().padStart(2, "0")}</strong>
            </div>
          </div>
        </div>
      ) : (
        <div className="immersive-evidence-list">
          <CrimeScene evidence={evidence} found={found} completedActions={completedActions} onInspect={onInspect} />
        </div>
      )}

      <div className="immersive-scene-tip">
        <span className="immersive-tip-icon" aria-hidden="true">i</span>
        <p>{complete ? "Every evidence item has been examined. Review your findings and connect the clues on the detective board." : "Select a numbered evidence marker to examine it. Some leads remain locked until you discover supporting evidence or complete an investigation action."}</p>
        <span className="immersive-tip-count">{unlockedEvidence.length} AVAILABLE LEADS</span>
      </div>
    </div>
  );
}
