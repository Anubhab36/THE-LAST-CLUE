import { useState } from "react";
import type { CaseCatalogItem } from "../../services/api";

export interface CaseProgressRecord {
  attempts: number;
  bestScore: number;
  bestGrade: string;
  solved: boolean;
}

type Props = {
  cases: CaseCatalogItem[];
  progress: Record<string, CaseProgressRecord>;
  onResetProgress: () => void;
};

type Achievement = { id: string; title: string; description: string; icon: string; unlocked: (solved: number, totalAttempts: number, bestScore: number, caseCount: number, attempted: number) => boolean };

const achievements: Achievement[] = [
  { id: "first-case", title: "First Steps", description: "Complete your first investigation.", icon: "01", unlocked: (_solved, totalAttempts) => totalAttempts > 0 },
  { id: "case-closed", title: "Case Closed", description: "Solve at least one case.", icon: "02", unlocked: (solved) => solved > 0 },
  { id: "sharp-eye", title: "Sharp Eye", description: "Collect a score of 80 or higher.", icon: "03", unlocked: (_solved, _attempts, best) => best >= 80 },
  { id: "full-portfolio", title: "Full Portfolio", description: "Attempt every case in the archive.", icon: "04", unlocked: (_solved, _attempts, _best, caseCount, attempted) => caseCount > 0 && attempted >= caseCount },
  { id: "master-detective", title: "Master Detective", description: "Solve three different cases.", icon: "05", unlocked: (solved) => solved >= 3 },
];

export default function CaseArchiveAchievements({ cases, progress, onResetProgress }: Props) {
  const [confirmReset, setConfirmReset] = useState(false);
  const attempted = cases.filter((item) => (progress[item.case_id]?.attempts ?? 0) > 0);
  const solved = cases.filter((item) => progress[item.case_id]?.solved);
  const totalAttempts = Object.values(progress).reduce((sum, item) => sum + item.attempts, 0);
  const bestScore = Object.values(progress).reduce((best, item) => Math.max(best, item.bestScore), 0);
  const unlockedCount = achievements.filter((item) => item.unlocked(solved.length, totalAttempts, bestScore, cases.length, attempted.length)).length;

  return (
    <section className="archive-achievements" aria-labelledby="archive-achievements-title">
      <div className="archive-heading">
        <div><span className="archive-kicker">INVESTIGATOR RECORDS</span><h2 id="archive-achievements-title">Case Archive & Achievements</h2><p>Your investigation history and milestones, saved in this browser.</p></div>
        <div className="archive-completion"><strong>{unlockedCount}/{achievements.length}</strong><span>ACHIEVEMENTS</span></div>
      </div>
      <div className="archive-stats">
        <div><strong>{attempted.length}</strong><span>CASES ATTEMPTED</span></div>
        <div><strong>{solved.length}</strong><span>CASES SOLVED</span></div>
        <div><strong>{totalAttempts}</strong><span>TOTAL ATTEMPTS</span></div>
        <div><strong>{bestScore}</strong><span>PERSONAL BEST</span></div>
      </div>

      <div className="archive-section-head"><h3>Achievement board</h3><span>{unlockedCount} UNLOCKED</span></div>
      <div className="achievement-grid">
        {achievements.map((achievement) => {
          const unlocked = achievement.unlocked(solved.length, totalAttempts, bestScore, cases.length, attempted.length);
          return <article key={achievement.id} className={unlocked ? "achievement-card unlocked" : "achievement-card locked"}>
            <span className="achievement-icon">{unlocked ? "✓" : achievement.icon}</span>
            <div><strong>{achievement.title}</strong><p>{achievement.description}</p></div>
            <small>{unlocked ? "UNLOCKED" : "LOCKED"}</small>
          </article>;
        })}
      </div>

      <div className="archive-section-head"><h3>Investigation archive</h3><span>{cases.length} CASE FILES</span></div>
      {cases.length === 0 ? <p className="archive-empty">Case records will appear here when the case catalog is available.</p> : (
        <div className="archive-case-list">
          {cases.map((item) => {
            const record = progress[item.case_id];
            return <article key={item.case_id} className="archive-case-row">
              <div className="archive-case-main"><span className="archive-case-code">{item.difficulty.toUpperCase()}</span><div><strong>{item.title}</strong><p>{item.description}</p></div></div>
              <div className="archive-case-record">
                <span className={record?.solved ? "archive-status solved" : record?.attempts ? "archive-status attempted" : "archive-status new"}>{record?.solved ? "SOLVED" : record?.attempts ? "ATTEMPTED" : "NOT STARTED"}</span>
                <span>{record?.attempts ?? 0} attempts</span>
                <span>Best: {record?.bestScore ?? 0}/100{record?.bestGrade ? ` · ${record.bestGrade}` : ""}</span>
              </div>
            </article>;
          })}
        </div>
      )}
      <div className="archive-reset">
        {confirmReset ? (
          <div className="archive-reset-confirm" role="alert">
            <div>
              <strong>Reset all saved case progress?</strong>
              <p>This clears case attempts, best scores, solved status, and achievement unlocks saved in this browser. It does not delete browser history or active investigation notes.</p>
            </div>
            <div className="archive-reset-actions">
              <button type="button" className="archive-reset-cancel" onClick={() => setConfirmReset(false)}>CANCEL</button>
              <button type="button" className="archive-reset-confirm-button" onClick={() => { onResetProgress(); setConfirmReset(false); }}>CONFIRM RESET</button>
            </div>
          </div>
        ) : (
          <button type="button" className="archive-reset-trigger" onClick={() => setConfirmReset(true)}>RESET SAVED CASE PROGRESS</button>
        )}
      </div>
      <p className="archive-footnote">Achievements are calculated from saved case progress. Clearing this browser's site data may reset this record.</p>
    </section>
  );
}
