import { useEffect, useMemo, useState } from "react";
import { generateCase, type CaseCatalogItem } from "../services/api";
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
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function readHistory(): DailyRecord[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value as DailyRecord[] : [];
  } catch { return []; }
}
function readCachedCase(date: string): CachedDailyCase | null {
  try {
    const value = JSON.parse(localStorage.getItem(DAILY_CASE_KEY) || "null") as CachedDailyCase | null;
    return value?.date === date && value.caseId ? value : null;
  } catch { return null; }
}
function isBuiltInFallback(caseId: string): boolean {
  return /^case_00[1-9]$/.test(caseId) || /^case_0\d+$/.test(caseId);
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
  const [challenge, setChallenge] = useState<CachedDailyCase | null>(() => readCachedCase(today));
  const [generating, setGenerating] = useState(!readCachedCase(today));
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const completedToday = history.find((item) => item.date === today);
  const attemptedToday = (() => {
    try { return localStorage.getItem(`the-last-clue-daily-attempt:${today}`) === "1"; } catch { return false; }
  })();
  const streak = useMemo(() => {
    const dates = new Set(history.filter((item) => item.correct).map((item) => item.date));
    const cursor = new Date();
    if (!dates.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    let count = 0;
    while (dates.has(localDateKey(cursor))) { count += 1; cursor.setDate(cursor.getDate() - 1); }
    return count;
  }, [history]);

  useEffect(() => {
    let cancelled = false;
    const cached = readCachedCase(today);
    if (cached) {
      setChallenge(cached);
      setGenerating(false);
      return () => { cancelled = true; };
    }
    setGenerating(true);
    setGenerationError(null);
    const theme = `Original daily case for ${today}: unique setting, suspects, clues, timeline, culprit. Do not reuse existing cases.`;
    void generateCase("hard", theme).then((generated) => {
      if (cancelled) return;
      if (isBuiltInFallback(generated.case_id)) {
        throw new Error("The AI service returned a built-in case instead of generating a new daily mystery. Please retry shortly.");
      }
      const next: CachedDailyCase = {
        date: today,
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
