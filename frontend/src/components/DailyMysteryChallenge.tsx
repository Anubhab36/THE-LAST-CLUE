import { useMemo, useState } from "react";
import type { CaseCatalogItem } from "../services/api";

interface DailyRecord {
  date: string;
  caseId: string;
  score: number;
  grade: string;
  correct: boolean;
}

const STORAGE_KEY = "the-last-clue-daily-mystery-history";

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readHistory(): DailyRecord[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value as DailyRecord[] : [];
  } catch {
    return [];
  }
}

function challengeForDate(cases: CaseCatalogItem[], dateKey: string): CaseCatalogItem | null {
  if (!cases.length) return null;
  const stableCases = [...cases].sort((a, b) => a.case_id.localeCompare(b.case_id));
  const dayNumber = Math.floor(new Date(`${dateKey}T12:00:00`).getTime() / 86400000);
  return stableCases[((dayNumber % stableCases.length) + stableCases.length) % stableCases.length];
}

interface Props {
  cases: CaseCatalogItem[];
  busy: boolean;
  onStart: (caseId: string) => void;
}

export function recordDailyMysteryResult(record: DailyRecord): void {
  const history = readHistory().filter((item) => item.date !== record.date);
  history.push(record);
  history.sort((a, b) => a.date.localeCompare(b.date));
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-365))); } catch { /* optional progress */ }
}

export default function DailyMysteryChallenge({ cases, busy, onStart }: Props) {
  const today = localDateKey();
  const challenge = useMemo(() => challengeForDate(cases, today), [cases, today]);
  const [history] = useState<DailyRecord[]>(readHistory);
  const completedToday = history.find((item) => item.date === today);
  const attemptedToday = (() => {
    try { return localStorage.getItem(`the-last-clue-daily-attempt:${today}`) === "1"; } catch { return false; }
  })();
  const streak = useMemo(() => {
    const dates = new Set(history.filter((item) => item.correct).map((item) => item.date));
    let cursor = new Date();
    if (!dates.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    let count = 0;
    while (dates.has(localDateKey(cursor))) { count += 1; cursor.setDate(cursor.getDate() - 1); }
    return count;
  }, [history]);

  return (
    <section className="daily-mystery-panel" aria-labelledby="daily-mystery-title">
      <div className="daily-mystery-topline"><span className="eyebrow">DAILY FIELD ASSIGNMENT</span><span className="daily-date">{today}</span></div>
      <div className="daily-mystery-layout">
        <div className="daily-mystery-emblem" aria-hidden="true"><span>LC</span><i>24</i></div>
        <div className="daily-mystery-copy">
          <h2 id="daily-mystery-title">The Daily Mystery</h2>
          <p>One featured case, refreshed every day. Investigate carefully, make your final accusation, and build your detective streak.</p>
          {challenge ? <div className="daily-case-meta"><span>FEATURED CASE</span><strong>{challenge.title}</strong><span>{challenge.difficulty.toUpperCase()} · {challenge.target_minutes} MIN</span></div> : <p className="muted">Loading today's case assignment…</p>}
        </div>
        <div className="daily-mystery-stats">
          <div><strong>{streak}</strong><span>DAY STREAK</span></div>
          <div><strong>{history.length}</strong><span>CASES LOGGED</span></div>
        </div>
      </div>
      {completedToday ? (
        <div className="daily-mystery-status" role="status">
          <strong>Today's report is filed.</strong><span>{completedToday.score}/100 · Grade {completedToday.grade} · {completedToday.correct ? "Case solved" : "Case unsolved"}</span>
        </div>
      ) : attemptedToday ? (
        <div className="daily-mystery-status" role="status"><strong>Today's attempt has been used.</strong><span>Return tomorrow for a new assignment.</span></div>
      ) : (
        <button className="daily-mystery-start" type="button" disabled={busy || !challenge} onClick={() => {
          if (!challenge || busy) return;
          try {
            if (localStorage.getItem(`the-last-clue-daily-attempt:${today}`) === "1") return;
            localStorage.setItem(`the-last-clue-daily-attempt:${today}`, "1"); } catch { /* attempt guard is best-effort */ }
          onStart(challenge.case_id);
        }}>ACCEPT TODAY'S CASE <span>→</span></button>
      )}
      <p className="daily-mystery-footnote">Daily rotation and results are saved in this browser. Your regular case library remains unchanged.</p>
    </section>
  );
}
