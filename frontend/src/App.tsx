
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AccusationResult,
  Case,
  Difficulty,
  Evidence,
  InvestigationAction,
  Suspect,
} from "./types/case";
import {
  accuseSession,
  createSession,
  discoverEvidence,
  completeAction as completeActionOnServer,
  recordAnalysis,
  getCase,
  getCaseById,
  getSession,
  generateCase,
  getCaseCatalog,
  refineSessionScore,
  type CaseCatalogItem,
} from "./services/api";
import Timer from "./components/Timer/Timer";
import ImmersiveCrimeScene from "./components/CrimeScene/ImmersiveCrimeScene";
import EvidenceBoard from "./components/EvidenceBoard/EvidenceBoard";
import EvidenceLaboratory from "./components/EvidenceLaboratory/EvidenceLaboratory";
import Timeline from "./components/Timeline/Timeline";
import Interrogation, { type InterviewEntry } from "./components/Interrogation/Interrogation";
import Accusation from "./components/Accusation/Accusation";
import Results from "./components/Results/Results";
import Notebook, { type NotebookNotes } from "./components/Notebook/Notebook";
import InvestigationActions from "./components/InvestigationActions/InvestigationActions";
import WelcomeScreen from "./components/WelcomeScreen";
import DeveloperFooter from "./components/DeveloperFooter";
import HintSystem from "./components/HintSystem/HintSystem";
import SuspectDossiers from "./components/SuspectDossiers/SuspectDossiers";
import { recordDailyMysteryResult } from "./components/DailyMysteryChallenge";

type Screen = "welcome" | "loading" | "game" | "results";

const ACTIVE_SESSION_KEY = "the-last-clue-active-session";
const PAUSED_DAILY_KEY = "the-last-clue-paused-daily";
const SESSION_LOCAL_KEY_PREFIX = "the-last-clue-session-local:";

const CASE_PROGRESS_KEY = "the-last-clue-case-progress";

const suspectInitials = (name: string): string =>
  name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");

interface CaseProgressRecord {
  attempts: number;
  bestScore: number;
  bestGrade: string;
  solved: boolean;
}


interface SessionLocalState {
  notes: NotebookNotes;
  interviewTranscripts: Record<string, InterviewEntry[]>;
}

const emptyNotes: NotebookNotes = {
  findings: "",
  theories: "",
  questions: "",
};

/**
 * Converts Gemini quota errors into a player-friendly message.
 * Prefer the backend's friendly message if it has already formatted one.
 */
function getDisplayError(
  caught: unknown,
  fallback: string,
): string {
  const message =
    caught instanceof Error ? caught.message : "";

  if (!message) {
    return fallback;
  }

  // The backend may already have returned the final player-facing message.
  if (
    message.toLowerCase().includes("ai cases are not available right now")
  ) {
    return message;
  }

  const isQuotaError =
    message.includes("RESOURCE_EXHAUSTED") ||
    message.toLowerCase().includes("quota exceeded") ||
    message.includes("generate_content_free_tier_requests");

  if (isQuotaError) {
    // Example Gemini response: "Please retry in 17h33m6.94s"
    const retryMatch = message.match(
      /retry in\s+(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?/i,
    );

    let waitTime = "a little while";

    if (retryMatch) {
      const hours = Number(retryMatch[1] || 0);
      const minutes = Number(retryMatch[2] || 0);
      const seconds = Number(retryMatch[3] || 0);

      const totalMinutes = Math.max(
        1,
        Math.ceil((hours * 3600 + minutes * 60 + seconds) / 60),
      );

      const remainingHours = Math.floor(totalMinutes / 60);
      const remainingMinutes = totalMinutes % 60;

      if (remainingHours > 0 && remainingMinutes > 0) {
        waitTime = `${remainingHours} hours and ${remainingMinutes} minutes`;
      } else if (remainingHours > 0) {
        waitTime = `${remainingHours} hours`;
      } else {
        waitTime = `${remainingMinutes} minutes`;
      }
    }

    return (
      "AI Cases are not available right now. " +
      `Please try again after ${waitTime}. ` +
      "Sorry for the inconvenience."
    );
  }

  return message;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      return window.localStorage.getItem("the-last-clue-theme") === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  });


  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem("the-last-clue-theme", theme);
    } catch {
      // Keep the selected theme for the current session if storage is unavailable.
    }
  }, [theme]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [screen]);

  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [caseCatalog, setCaseCatalog] = useState<CaseCatalogItem[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("case_001");

  const [caseProgress, setCaseProgress] = useState<Record<string, CaseProgressRecord>>(() => {
    try {
      const saved = window.localStorage.getItem(CASE_PROGRESS_KEY);
      return saved ? JSON.parse(saved) as Record<string, CaseProgressRecord> : {};
    } catch {
      return {};
    }
  });
  const recordedCompletionSessionRef = useRef<string | null>(null);
  const dailyChallengeDateRef = useRef<string | null>(null);

  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [gameCase, setGameCase] = useState<Case | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<string[]>([]);
  const [connections, setConnections] = useState<[string, string][]>([]);
  const [important, setImportant] = useState<string[]>([]);
  const [completedActions, setCompletedActions] = useState<string[]>([]);
  const [actionResults, setActionResults] = useState<Record<string, string>>(
    {},
  );
  const [suspect, setSuspect] = useState<Suspect | null>(null);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [interrogating, setInterrogating] = useState<Suspect | null>(null);
  const [accusing, setAccusing] = useState(false);
  const [submittingAccusation, setSubmittingAccusation] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [result, setResult] = useState<AccusationResult | null>(null);
  const [hits, setHits] = useState(0);
  const [askedQuestions, setAskedQuestions] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [timePenalty, setTimePenalty] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const [notes, setNotes] = useState<NotebookNotes>(emptyNotes);
  const [interviewTranscripts, setInterviewTranscripts] =
    useState<Record<string, InterviewEntry[]>>({});

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);

    try {
      const items = await getCaseCatalog();
      setCaseCatalog(items);
      setSelectedCaseId((current) =>
        items.some((item) => item.case_id === current)
          ? current
          : items[0]?.case_id ?? "",
      );

      if (items.length === 0) {
        setCatalogError("No cases are currently available. Please try loading the library again.");
      }
    } catch {
      setCatalogError(
        "The case library could not be loaded. Check your connection and try again.",
      );
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CASE_PROGRESS_KEY, JSON.stringify(caseProgress));
    } catch {
      // Progress tracking must never interrupt gameplay if storage is unavailable.
    }
  }, [caseProgress]);

  // Record each completed session once. If semantic scoring later improves
  // the result, update the best score without counting a second attempt.
  useEffect(() => {
    if (screen !== "results" || !result || !gameCase || !sessionId) return;

    const isNewAttempt = recordedCompletionSessionRef.current !== sessionId;
    recordedCompletionSessionRef.current = sessionId;

    setCaseProgress((current) => {
      const previous = current[gameCase.case_id];
      const isPersonalBest = !previous || result.score.total > previous.bestScore;
      const bestScore = isPersonalBest ? result.score.total : previous.bestScore;
      const bestGrade = isPersonalBest
        ? result.score.grade
        : previous.bestGrade;

      return {
        ...current,
        [gameCase.case_id]: {
          attempts: (previous?.attempts ?? 0) + (isNewAttempt ? 1 : 0),
          bestScore,
          bestGrade,
          solved: Boolean(previous?.solved || result.correct),
        },
      };
    });
  }, [screen, result, gameCase, sessionId]);

  useEffect(() => {
    if (screen !== "results" || !result || !gameCase || !dailyChallengeDateRef.current) return;
    recordDailyMysteryResult({
      date: dailyChallengeDateRef.current,
      caseId: gameCase.case_id,
      score: result.score.total,
      grade: result.score.grade,
      correct: result.correct,
    });
    dailyChallengeDateRef.current = null;
  }, [screen, result, gameCase]);

  // Keep the interval callback current without restarting its timer on every tick.
  const progressRef = useRef({
    connections,
    important,
    elapsed,
    timedOut,
    gameCase,
  });
  progressRef.current = { connections, important, elapsed, timedOut, gameCase };

  useEffect(() => {
    const savedSessionId = window.localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!savedSessionId) return;

    let cancelled = false;

    async function restoreSession() {
      setScreen("loading");
      try {
        const session = await getSession(savedSessionId!);

        if (session.status !== "active") {
          window.localStorage.removeItem(ACTIVE_SESSION_KEY);
          if (!cancelled) setScreen("welcome");
          return;
        }

        const nextCase = await getCaseById(session.case_id);
        if (cancelled) return;

        const progress = session.progress;
        const dailyMatch = session.case_id.match(/^daily_(\d{4})(\d{2})(\d{2})$/);
        if (dailyMatch) {
          dailyChallengeDateRef.current = `${dailyMatch[1]}-${dailyMatch[2]}-${dailyMatch[3]}`;
          window.localStorage.removeItem(PAUSED_DAILY_KEY);
        }

        let localState: SessionLocalState | null = null;
        try {
          const savedLocalState = window.localStorage.getItem(
            `${SESSION_LOCAL_KEY_PREFIX}${session.session_id}`,
          );
          if (savedLocalState) {
            localState = JSON.parse(savedLocalState) as SessionLocalState;
          }
        } catch {
          // Ignore malformed local state and restore the server-side progress.
        }

        setNotes(localState?.notes ?? { ...emptyNotes });
        setInterviewTranscripts(localState?.interviewTranscripts ?? {});
        setGameCase(nextCase);
        setSessionId(session.session_id);
        setFound(progress.discovered_evidence ?? []);
        setCompletedActions(progress.completed_actions ?? []);
        setConnections(progress.evidence_connections ?? []);
        setImportant(progress.important_events ?? []);
        setHits(progress.interrogation_hits ?? 0);
        setAskedQuestions(progress.asked_questions ?? []);
        setElapsed(progress.elapsed_seconds ?? 0);
        setTimePenalty(progress.time_penalty_seconds ?? 0);
        setActionResults(
          Object.fromEntries(
            nextCase.investigation_actions
              .filter((action) =>
                (progress.completed_actions ?? []).includes(action.id)
              )
              .map((action) => [action.id, action.result_text])
          )
        );
        setScreen("game");
      } catch {
        // Preserve the saved session if a temporary network/server failure occurs.
        if (!cancelled) {
          setError(
            "Your saved investigation could not be restored right now. Refresh this page to retry, or start a new case."
          );
          setScreen("welcome");
        }
      }
    }

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (screen !== "game" || !sessionId) return;

    const localState: SessionLocalState = { notes, interviewTranscripts };
    try {
      window.localStorage.setItem(
        `${SESSION_LOCAL_KEY_PREFIX}${sessionId}`,
        JSON.stringify(localState),
      );
    } catch {
      // A full or unavailable browser storage must not interrupt gameplay.
    }
  }, [sessionId, screen, notes, interviewTranscripts]);

  // Save evidence-board and timeline changes promptly, not only every 10 seconds.
  useEffect(() => {
    if (screen !== "game" || !sessionId || !gameCase) return;

    const elapsedSeconds = timedOut
      ? gameCase.target_minutes * 60
      : Math.min(gameCase.target_minutes * 60, elapsed);

    const timeoutId = window.setTimeout(() => {
      void recordAnalysis(
        sessionId,
        connections,
        important,
        elapsedSeconds,
      ).catch(() => {
        // The periodic save remains as a fallback if this request fails.
      });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [
    connections,
    important,
    elapsed,
    timedOut,
    gameCase,
    sessionId,
    screen,
  ]);

  // Persist elapsed time and analysis progress periodically while the case is active.
  useEffect(() => {
    if (screen !== "game" || !sessionId) return;

    const saveProgress = () => {
      const current = progressRef.current;
      if (!current.gameCase) return;

      const elapsedSeconds = current.timedOut
        ? current.gameCase.target_minutes * 60
        : Math.min(
            current.gameCase.target_minutes * 60,
            current.elapsed,
          );

      void recordAnalysis(
        sessionId,
        current.connections,
        current.important,
        elapsedSeconds,
      ).catch(() => {
        // Retry on the next interval; never interrupt active gameplay.
      });
    };

    const intervalId = window.setInterval(saveProgress, 10_000);
    return () => window.clearInterval(intervalId);
  }, [sessionId, screen]);

  const resetGameState = () => {
    window.localStorage.removeItem(ACTIVE_SESSION_KEY);
    setAskedQuestions([]);
    setInterviewTranscripts({});
    setError(null);
    setGameCase(null);
    setSessionId(null);
    setFound([]);
    setConnections([]);
    setImportant([]);
    setCompletedActions([]);
    setActionResults({});
    setResult(null);
    setAccusing(false);
    setSubmittingAccusation(false);
    setInterrogating(null);
    setSuspect(null);
    setEvidence(null);
    setHits(0);
    setElapsed(0);
    setTimePenalty(0);
    setTimedOut(false);
    setNotes({ ...emptyNotes });
    setConfirmLeave(false);
  };

  const load = useCallback(async () => {
    dailyChallengeDateRef.current = null;
    setScreen("loading");
    resetGameState();

    try {
      if (!selectedCaseId) {
        throw new Error("Choose a case from the library first.");
      }
      const nextCase = await getCaseById(selectedCaseId);
      const session = await createSession(nextCase.case_id);

      setSessionId(session.session_id);
      window.localStorage.setItem(ACTIVE_SESSION_KEY, session.session_id);
      setGameCase(nextCase);
      setScreen("game");
    } catch (caught) {
      setError(
        getDisplayError(caught, "Unable to load a case. Please try again."),
      );
      setScreen("welcome");
    }
  }, [selectedCaseId]);

  const loadDailyChallenge = useCallback(async (caseId: string) => {
    const dailyDateMatch = caseId.match(/^daily_(\d{4})(\d{2})(\d{2})$/);
    dailyChallengeDateRef.current = dailyDateMatch
      ? `${dailyDateMatch[1]}-${dailyDateMatch[2]}-${dailyDateMatch[3]}`
      : null;
    setScreen("loading");
    resetGameState();
    try {
      const nextCase = await getCaseById(caseId);
      const session = await createSession(nextCase.case_id);
      setSelectedCaseId(caseId);
      setDifficulty(nextCase.difficulty);
      setSessionId(session.session_id);
      window.localStorage.setItem(ACTIVE_SESSION_KEY, session.session_id);
      setGameCase(nextCase);
      setScreen("game");
    } catch (caught) {
      dailyChallengeDateRef.current = null;
      setError(getDisplayError(caught, "Unable to load today's mystery. Please try again."));
      setScreen("welcome");
    }
  }, []);

  const loadGenerated = useCallback(async () => {
    dailyChallengeDateRef.current = null;
    setScreen("loading");
    resetGameState();

    try {
      const nextCase = await generateCase(difficulty);
      const session = await createSession(nextCase.case_id);

      setSessionId(session.session_id);
      window.localStorage.setItem(ACTIVE_SESSION_KEY, session.session_id);
      setGameCase(nextCase);

      if (caseCatalog.some((item) => item.case_id === nextCase.case_id)) {
        setError(
          "AI case generation is temporarily unavailable. A built-in case of your selected difficulty has been loaded instead.",
        );
      }

      setScreen("game");
    } catch (caught) {
      setError(
        getDisplayError(
          caught,
          "AI Cases are not available right now. Please try again later. Sorry for the inconvenience.",
        ),
      );
      setScreen("welcome");
    }
  }, [difficulty, caseCatalog]);

  const expire = useCallback(() => {
    if (screen === "game" && gameCase && !result) {
      setElapsed(gameCase.target_minutes * 60);
      setTimedOut(true);
      setAccusing(true);
    }
  }, [gameCase, result, screen]);

  const inspect = async (item: Evidence) => {
    if (!sessionId || found.includes(item.id)) {
      if (found.includes(item.id)) {
        setEvidence(item);
      }
      return;
    }

    try {
      await discoverEvidence(sessionId, item.id);
      setFound((current) =>
        current.includes(item.id) ? current : [...current, item.id],
      );
      setEvidence(item);
      setError(null);
    } catch (caught) {
      setError(
        getDisplayError(caught, "Could not inspect this evidence."),
      );
    }
  };

  const runAction = async (action: InvestigationAction) => {
    if (!sessionId || completedActions.includes(action.id)) {
      return;
    }

    try {
      const response = await completeActionOnServer(sessionId, action.id);

      setCompletedActions(response.progress.completed_actions);
      setFound(response.progress.discovered_evidence);
      setTimePenalty(response.progress.time_penalty_seconds);
      setActionResults((current) => ({
        ...current,
        [action.id]: action.result_text,
      }));
      setError(null);
    } catch (caught) {
      setError(getDisplayError(caught, "Investigation action failed."));
    }
  };

  const pauseDailyToWelcome = async () => {
    if (!sessionId || !gameCase || !dailyChallengeDateRef.current) return;
    try {
      const elapsedSeconds = timedOut
        ? gameCase.target_minutes * 60
        : Math.min(gameCase.target_minutes * 60, elapsed);
      await recordAnalysis(sessionId, connections, important, elapsedSeconds);
      window.localStorage.setItem(PAUSED_DAILY_KEY, JSON.stringify({
        date: dailyChallengeDateRef.current,
        caseId: gameCase.case_id,
        sessionId,
      }));
    } catch {
      setError("Could not save the paused challenge. Check your connection and try again.");
      return;
    }
    // Keep ACTIVE_SESSION_KEY and server session intact so Resume restores the
    // exact investigation rather than creating a replay or resetting progress.
    setAskedQuestions([]);
    setConfirmLeave(false);
    setGameCase(null);
    setSessionId(null);
    setResult(null);
    setAccusing(false);
    setError(null);
    setScreen("welcome");
  };

  const resumeDailyChallenge = () => {
    // The existing startup restoration flow rehydrates the saved server session.
    window.location.reload();
  };

  const leaveToWelcome = () => {
    window.localStorage.removeItem(ACTIVE_SESSION_KEY);
    setAskedQuestions([]);
    setConfirmLeave(false);
    setGameCase(null);
    setSessionId(null);
    setResult(null);
    setAccusing(false);
    setError(null);
    setScreen("welcome");
  };

  const submitAccusation = async (
    killerId: string,
    motive: string,
    method: string,
  ) => {
    if (!gameCase || !sessionId || submittingAccusation) {
      return;
    }

    const activeSessionId = sessionId;

    setSubmittingAccusation(true);
    setError(null);

    try {
      await recordAnalysis(
        activeSessionId,
        connections,
        important,
        timedOut
          ? gameCase.target_minutes * 60
          : Math.min(gameCase.target_minutes * 60, elapsed),
      );

      const response = await accuseSession(activeSessionId, {
        killer_id: killerId,
        motive,
        method,
      });

      setResult(response);
      setAccusing(false);
      window.localStorage.removeItem(ACTIVE_SESSION_KEY);
      window.localStorage.removeItem(PAUSED_DAILY_KEY);
      setScreen("results");

      void refineSessionScore(activeSessionId, { motive, method })
        .then((refinedResult) => {
          // The backend owns the full score, total, grade, and correctness flags.
          setResult(refinedResult);
        })
        .catch(() => {
          // AI refinement is optional. Keep the initial score on failure.
        });
    } catch (caught) {
      setError(
        getDisplayError(caught, "Could not submit accusation."),
      );
    } finally {
      setSubmittingAccusation(false);
    }
  };

  const themeToggle = (
    <button
      type="button"
      className="theme-toggle"
      style={{
        fontFamily: '"DM Mono", "Courier New", monospace',
        fontSize: "10px",
        fontWeight: 400,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
      onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={theme === "light"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span aria-hidden="true">{theme === "dark" ? "☼" : "☾"}</span>
      {theme === "dark" ? "LIGHT MODE" : "DARK MODE"}
    </button>
  );

  if (screen === "loading") {
    return (
      <>
        {themeToggle}
        <div className="loading-screen">
          <div className="loading-mark">LC</div>
          <h1>Preparing investigation...</h1>
          <p>
            Generating or validating the case file and checking evidence
            dependencies.
          </p>
        </div>
        <DeveloperFooter />
      </>
    );
  }

  if (screen === "welcome" || !gameCase) {
    return (
      <>
        {themeToggle}
        <WelcomeScreen
          difficulty={difficulty}
          onDifficulty={setDifficulty}
          cases={caseCatalog}
          caseProgress={caseProgress}
          archiveCases={caseCatalog}
          archiveProgress={caseProgress}
          onResetCaseProgress={() => setCaseProgress({})}
          catalogLoading={catalogLoading}
          catalogError={catalogError}
          onRetryCatalog={() => void loadCatalog()}
          selectedCaseId={selectedCaseId}
          onSelectCase={(caseId) => {
            setSelectedCaseId(caseId);
            const selected = caseCatalog.find((item) => item.case_id === caseId);
            if (selected) setDifficulty(selected.difficulty);
            setError(null);
          }}
          onStart={load}
          onStartDaily={loadDailyChallenge}
          onResumeDaily={resumeDailyChallenge}
          onGenerate={loadGenerated}
          busy={false}
          error={error}
        />
        <DeveloperFooter />
      </>
    );
  }

  if (screen === "results" && result) {
    return (
      <>
        {themeToggle}
        <Results
          result={result}
          gameCase={gameCase}
          found={found}
          timedOut={timedOut}
          onRestart={leaveToWelcome}
        />
      </>
    );
  }

  return (
    <div className="app">
      {themeToggle}
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">LC</span>
          <div>
            <span className="brand-title">THE LAST CLUE</span>
            <span className="brand-subtitle">DIGITAL INVESTIGATION UNIT</span>
          </div>
        </div>

        <div className="topbar-right">
          <span className="active-case-difficulty">
            {gameCase.difficulty.toUpperCase()} CASE
          </span>
          <Timer
            minutes={gameCase.target_minutes}
            initialElapsedSeconds={elapsed}
            penaltySeconds={timePenalty}
            onTick={setElapsed}
            onExpire={expire}
          />
        </div>
      </header>

      <main>
        {error && (
          <p className="welcome-error" role="alert">
            {error}
          </p>
        )}

        <section className="case-header">
          <div>
            <span className="eyebrow">
              CASE FILE · {gameCase.case_id.toUpperCase()}
            </span>
            <h1>{gameCase.title}</h1>
            <p className="case-description">{gameCase.description}</p>
          </div>

          <div className="case-header-meta">
            <div className="meta-item">
              <span>DIFFICULTY</span>
              <strong>{gameCase.difficulty.toUpperCase()}</strong>
            </div>
            <div className="meta-item">
              <span>TARGET</span>
              <strong>{gameCase.target_minutes} MIN</strong>
            </div>
            <button
              className="quiet-button leave-case-button"
              onClick={() => setConfirmLeave(true)}
            >
              LEAVE CASE
            </button>
          </div>
        </section>

        {timedOut && (
          <div className="timeout-banner" role="status">
            Time has expired. Submit your final accusation to close the case.
          </div>
        )}

        <section className="victim panel">
          <div className="panel-heading">
            <div>
              <span className="panel-number">01</span>
              <h2>Victim</h2>
            </div>
            <span className="count">DECEASED</span>
          </div>

          <div className="victim-content">
            <div className="victim-name">
              <span className="eyebrow">IDENTIFIED</span>
              <h3>{gameCase.victim.name}</h3>
            </div>
            <div className="victim-details">
              <div>
                <span>AGE</span>
                <strong>{gameCase.victim.age}</strong>
              </div>
              <div>
                <span>OCCUPATION</span>
                <strong>{gameCase.victim.occupation}</strong>
              </div>
              <div>
                <span>CAUSE</span>
                <strong>{gameCase.victim.cause_of_death}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="investigation-grid">
          <div className="crime-scene panel">
            <div className="panel-heading">
              <div>
                <span className="panel-number">02</span>
                <h2>Crime Scene</h2>
              </div>
              <span className="count">
                {found.length}/{gameCase.evidence.length} DISCOVERED
              </span>
            </div>

            <div className="scene v2-scene">
              <ImmersiveCrimeScene
                evidence={gameCase.evidence}
                found={found}
                completedActions={completedActions}
                onInspect={inspect}
                locationName={gameCase.locations[0]?.name ?? "Unknown location"}
              />
            </div>
          </div>

          <div className="suspects panel">
            <div className="panel-heading">
              <div>
                <span className="panel-number">03</span>
                <h2>Suspects</h2>
              </div>
              <span className="count">
                {gameCase.suspects.length} PERSONS
              </span>
            </div>

            <div className="suspect-list">
              {gameCase.suspects.map((item) => (
                <button
                  className="suspect-card"
                  key={item.id}
                  onClick={() => setSuspect(item)}
                >
                  <div className="suspect-card-main">
                    <span className="suspect-board-monogram" aria-hidden="true">{suspectInitials(item.name)}</span>
                    <span className="suspect-number">
                      {item.id.replace("suspect_", "").padStart(2, "0")}
                    </span>
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.relationship_to_victim}</span>
                    </div>
                  </div>
                  <span className="suspect-arrow">→</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <InvestigationActions
          actions={gameCase.investigation_actions}
          found={found}
          completed={completedActions}
          results={actionResults}
          onRun={runAction}
        />

        <EvidenceLaboratory caseId={gameCase.case_id} evidence={gameCase.evidence} found={found} completedActions={completedActions} />

        <EvidenceBoard
          evidence={gameCase.evidence}
          suspects={gameCase.suspects}
          found={found}
          connections={connections}
          onConnect={(e, s) =>
            setConnections((current) =>
              current.some(
                (connection) => connection[0] === e && connection[1] === s,
              )
                ? current
                : [...current, [e, s]],
            )
          }
          onDisconnect={(e, s) =>
            setConnections((current) =>
              current.filter(
                (connection) => !(connection[0] === e && connection[1] === s),
              ),
            )
          }
        />

        <Timeline
          events={gameCase.timeline}
          suspects={gameCase.suspects}
          important={important}
          onImportant={(id) =>
            setImportant((current) =>
              current.includes(id)
                ? current.filter((value) => value !== id)
                : [...current, id],
            )
          }
        />

        <HintSystem gameCase={gameCase} found={found} completedActions={completedActions} />

        <SuspectDossiers suspects={gameCase.suspects} evidence={gameCase.evidence} found={found} connections={connections} timeline={gameCase.timeline} interrogation={gameCase.interrogation} onInterrogate={(selectedSuspect) => setInterrogating(selectedSuspect)} />

        <Notebook
          notes={notes}
          onChange={setNotes}
          discoveredCount={found.length}
          evidence={gameCase.evidence}
          discoveredEvidenceIds={found}
          suspects={gameCase.suspects}
        />

        <section className="action-bar">
          <button
            className="secondary"
            onClick={() => setAccusing(true)}
          >
            MAKE FINAL ACCUSATION
          </button>
          <span>
            Interrogation discoveries: {hits} · Evidence: {found.length}/
            {gameCase.evidence.length} · Leads completed:{" "}
            {completedActions.length}/{gameCase.investigation_actions.length}
          </span>
        </section>
      </main>

      <DeveloperFooter />

      {suspect && (
        <div
          className="overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSuspect(null);
            }
          }}
        >
          <div
            className="modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="close"
              onClick={() => setSuspect(null)}
              aria-label="Close suspect profile"
            >
              ×
            </button>
            <span className="eyebrow">PERSON OF INTEREST</span>
            <h2>{suspect.name}</h2>
            <p className="muted">
              {suspect.occupation} · {suspect.relationship_to_victim}
            </p>
            <p>{suspect.description}</p>
            <div className="modal-actions">
              <button
                className="primary"
                onClick={() => {
                  setInterrogating(suspect);
                  setSuspect(null);
                }}
              >
                INTERROGATE
              </button>
            </div>
          </div>
        </div>
      )}

      {evidence && (
        <div
          className="overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setEvidence(null);
            }
          }}
        >
          <div
            className="modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="close"
              onClick={() => setEvidence(null)}
              aria-label="Close evidence details"
            >
              ×
            </button>
            <span className="eyebrow">EVIDENCE DISCOVERED</span>
            <h2>{evidence.name}</h2>
            <p>{evidence.description}</p>
            <p className="muted">
              CLASSIFICATION: {evidence.importance.replace("_", " ").toUpperCase()}
            </p>
            <button
              className="primary"
              onClick={() => setEvidence(null)}
            >
              ADD TO CASE BOARD
            </button>
          </div>
        </div>
      )}

      {interrogating && (
        <Interrogation
          gameCase={gameCase}
          sessionId={sessionId ?? ""}
          suspect={interrogating}
          found={found}
          completedActions={completedActions}
          previouslyAsked={askedQuestions
            .filter((key) => key.startsWith(`${interrogating.id}:`))
            .map((key) => key.slice(interrogating.id.length + 1))}
          previousTranscript={interviewTranscripts[interrogating.id] ?? []}
          onTranscriptChange={(suspectId, transcript) =>
            setInterviewTranscripts((current) => ({
              ...current,
              [suspectId]: transcript,
            }))
          }
          onQuestionAsked={(suspectId, questionId) => {
            const key = `${suspectId}:${questionId}`;
            setAskedQuestions((current) =>
              current.includes(key) ? current : [...current, key],
            );
          }}
          onClose={() => setInterrogating(null)}
          onHit={() => setHits((current) => current + 1)}
        />
      )}

      {accusing && (
        <Accusation
          gameCase={gameCase}
          canCancel={!timedOut}
          submitting={submittingAccusation}
          onCancel={() => {
            if (!timedOut && !submittingAccusation) {
              setAccusing(false);
            }
          }}
          onSubmit={submitAccusation}
        />
      )}

      {confirmLeave && (
        <div
          className="overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setConfirmLeave(false);
            }
          }}
        >
          <div
            className="modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="close"
              onClick={() => setConfirmLeave(false)}
              aria-label="Close confirmation"
            >
              ×
            </button>
            <span className="eyebrow">{dailyChallengeDateRef.current ? "PAUSE DAILY ASSIGNMENT" : "ABANDON INVESTIGATION?"}</span>
            <h2>{dailyChallengeDateRef.current ? "Pause this case?" : "Leave this case?"}</h2>
            <p>
              {dailyChallengeDateRef.current
                ? "Your investigation progress will be saved. You can resume this same daily case later today, but you cannot restart it after finishing."
                : "Your current progress and notebook will be cleared if you return to the start screen. The case can be started again, but the timer will reset."}
            </p>
            <div className="modal-actions leave-actions">
              <button
                className="secondary"
                onClick={() => setConfirmLeave(false)}
              >
                CONTINUE INVESTIGATING
              </button>
              <button className="primary" onClick={dailyChallengeDateRef.current ? pauseDailyToWelcome : leaveToWelcome}>
                {dailyChallengeDateRef.current ? "PAUSE & RETURN" : "LEAVE CASE"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
