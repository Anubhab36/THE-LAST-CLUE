import { useEffect, useMemo, useState } from "react";
import { getDailyMystery, type CaseCatalogItem } from "../services/api";
import type { Difficulty } from "../types/case";

interface DailyRecord {
  date: string;
  caseId: string;
  score: number;
  grade: string;
  correct: boolean;
}
interface CachedDailyCase {
  date: string;
  caseId: string;
  title: string;
  difficulty: Difficulty;
  target_minutes: number;
}
const STORAGE_KEY = "the-last-clue-daily-mystery-history";
const DAILY_CASE_KEY = "the-last-clue-daily-generated-case";

function localDateKey(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function readHistory(): DailyRecord[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value as DailyRecord[] : [];
  } catch { return []; }
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

export default function DailyMysteryChallenge({ busy, onStart }: Props) {
  const today = localDateKey();
  const [history, setHistory] = useState<DailyRecord[]>(readHistory);
  const [challenge, setChallenge] = useState<CachedDailyCase | null>(null);
  const [generating, setGenerating] = useState(true);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const completedToday = history.find((item) => item.date === today);
  const attemptedToday = (() => {
    try { return localStorage.getItem(`the-last-clue-daily-attempt:${today}`) === "1"; } catch { return false; }
  })();
  const streak = useMemo(() => {
    const dates = new Set(history.filter((item) => item.correct).map((item) => item.date));
    const cursor = new Date();
    if (!dates.has(localDateKey(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
    let count = 0;
    while (dates.has(localDateKey(cursor))) { count += 1; cursor.setUTCDate(cursor.getUTCDate() - 1); }
    return count;
  }, [history]);

  useEffect(() => {
    let cancelled = false;
    // Always ask the server for the canonical case. A date-matched browser
    // cache can outlive a backend repair and keep showing a duplicate mystery.
    setGenerating(true);
    setGenerationError(null);
    void getDailyMystery().then((response) => {
      if (cancelled) return;
      const generated = response.case;
      const next: CachedDailyCase = {
        date: response.daily_date,
        caseId: generated.case_id,
        title: generated.title,
        difficulty: generated.difficulty,
        target_minutes: generated.target_minutes,
      };
      localStorage.setItem(DAILY_CASE_KEY, JSON.stringify(next));
      setChallenge(next);
    }).catch((error: unknown) => {
      if (!cancelled) setGenerationError(error instanceof Error ? error.message : "Unable to generate today's mystery. Please try again.");
    }).finally(() => {
      if (!cancelled) setGenerating(false);
    });
    return () => { cancelled = true; };
  }, [today, retryKey]);

  useEffect(() => {
    const refreshHistory = () => setHistory(readHistory());
    window.addEventListener("focus", refreshHistory);
    return () => window.removeEventListener("focus", refreshHistory);
  }, []);

  return (
    <section className="daily-mystery-panel" aria-labelledby="daily-mystery-title">
      <div className="daily-mystery-topline"><span className="eyebrow">DAILY FIELD ASSIGNMENT</span><span className="daily-date">{today}</span></div>
      <div className="daily-mystery-layout">
        <div className="daily-mystery-emblem" aria-hidden="true"><span>LC</span><i>24</i></div>
        <div className="daily-mystery-copy">
          <h2 id="daily-mystery-title">The Daily Mystery</h2>
          <p>A fresh AI-generated case every day. Examine the evidence, interrogate suspects, and identify the culprit before filing your report.</p>
          {challenge ? <div className="daily-case-meta"><span>ORIGINAL DAILY CASE</span><strong>{challenge.title}</strong><span>{challenge.difficulty.toUpperCase()} · {challenge.target_minutes} MIN</span></div> : generating ? <p className="muted">Building today's original case…</p> : <p className="daily-mystery-error" role="alert">{generationError || "Today's case could not be generated."}</p>}
        </div>
        <div className="daily-mystery-stats">
          <div><strong>{streak}</strong><span>DAY STREAK</span></div>
          <div><strong>{history.length}</strong><span>CASES LOGGED</span></div>
        </div>
      </div>
      {completedToday ? (
        <div className="daily-mystery-status" role="status"><strong>Today's report is filed.</strong><span>{completedToday.score}/100 · Grade {completedToday.grade} · {completedToday.correct ? "Case solved" : "Case unsolved"}</span></div>
      ) : attemptedToday ? (
        <div className="daily-mystery-status" role="status"><strong>Today's attempt has been used.</strong><span>Return tomorrow for a new assignment.</span></div>
      ) : challenge ? (
        <button className="daily-mystery-start" type="button" disabled={busy || generating || !challenge} onClick={() => {
          if (!challenge || busy) return;
          try {
            if (localStorage.getItem(`the-last-clue-daily-attempt:${today}`) === "1") return;
            localStorage.setItem(`the-last-clue-daily-attempt:${today}`, "1");
          } catch { /* attempt guard is best-effort */ }
          onStart(challenge.caseId);
        }}>ACCEPT TODAY'S CASE <span>→</span></button>
      ) : (
        <button className="daily-mystery-start" type="button" disabled={generating || busy} onClick={() => setRetryKey((value) => value + 1)}>RETRY CASE GENERATION <span>↻</span></button>
      )}
      <p className="daily-mystery-footnote">The generated case and results are saved in this browser for today's assignment. Your regular case library remains unchanged.</p>
    </section>
  );
}
