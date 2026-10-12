
import { useCallback, useState } from "react";
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
  generateCase,
} from "./services/api";
import Timer from "./components/Timer/Timer";
import CrimeScene from "./components/CrimeScene/CrimeScene";
import EvidenceBoard from "./components/EvidenceBoard/EvidenceBoard";
import Timeline from "./components/Timeline/Timeline";
import Interrogation from "./components/Interrogation/Interrogation";
import Accusation from "./components/Accusation/Accusation";
import Results from "./components/Results/Results";
import Notebook, { type NotebookNotes } from "./components/Notebook/Notebook";
import InvestigationActions from "./components/InvestigationActions/InvestigationActions";
import WelcomeScreen from "./components/WelcomeScreen";
import DeveloperFooter from "./components/DeveloperFooter";

type Screen = "welcome" | "loading" | "game" | "results";

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
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
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
  const [elapsed, setElapsed] = useState(0);
  const [timePenalty, setTimePenalty] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const [notes, setNotes] = useState<NotebookNotes>(emptyNotes);

  const resetGameState = () => {
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
    setScreen("loading");
    resetGameState();

    try {
      const nextCase = await getCase(difficulty);
      const session = await createSession(nextCase.case_id);

      setSessionId(session.session_id);
      setGameCase(nextCase);
      setScreen("game");
    } catch (caught) {
      setError(
        getDisplayError(caught, "Unable to load a case. Please try again."),
      );
      setScreen("welcome");
    }
  }, [difficulty]);

  const loadGenerated = useCallback(async () => {
    setScreen("loading");
    resetGameState();

    try {
      const nextCase = await generateCase(difficulty);
      const session = await createSession(nextCase.case_id);

      setSessionId(session.session_id);
      setGameCase(nextCase);
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
  }, [difficulty]);

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

  const leaveToWelcome = () => {
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

    setSubmittingAccusation(true);
    setError(null);

    try {
      await recordAnalysis(
        sessionId,
        connections,
        important,
        timedOut
          ? gameCase.target_minutes * 60
          : Math.min(gameCase.target_minutes * 60, elapsed),
      );

      const response = await accuseSession(sessionId, {
        killer_id: killerId,
        motive,
        method,
      });

      setResult(response);
      setAccusing(false);
      setScreen("results");
    } catch (caught) {
      setError(
        getDisplayError(caught, "Could not submit accusation."),
      );
    } finally {
      setSubmittingAccusation(false);
    }
  };

  if (screen === "loading") {
    return (
      <>
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
        <WelcomeScreen
          difficulty={difficulty}
          onDifficulty={setDifficulty}
          onStart={load}
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
      <Results
        result={result}
        gameCase={gameCase}
        found={found}
        timedOut={timedOut}
        onRestart={leaveToWelcome}
      />
    );
  }

  return (
    <div className="app">
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
              className="quiet-button"
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
              <CrimeScene
                evidence={gameCase.evidence}
                found={found}
                completedActions={completedActions}
                onInspect={inspect}
              />
              <div className="scene-caption">
                <span>ACTIVE LOCATION</span>
                <strong>{gameCase.locations[0]?.name}</strong>
              </div>
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

        <Notebook
          notes={notes}
          onChange={setNotes}
          discoveredCount={found.length}
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
            <span className="eyebrow">ABANDON INVESTIGATION?</span>
            <h2>Leave this case?</h2>
            <p>
              Your current progress and notebook will be cleared if you return
              to the start screen. The case can be started again, but the timer
              will reset.
            </p>
            <div className="modal-actions leave-actions">
              <button
                className="secondary"
                onClick={() => setConfirmLeave(false)}
              >
                CONTINUE INVESTIGATING
              </button>
              <button className="primary" onClick={leaveToWelcome}>
                LEAVE CASE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

