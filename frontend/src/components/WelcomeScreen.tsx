
import type { Difficulty } from "../types/case";

const levels: {
  id: Difficulty;
  title: string;
  minutes: string;
  description: string;
}[] = [
  {
    id: "easy",
    title: "Easy",
    minutes: "5–8 min",
    description: "A compact case with direct clues and clear deductions.",
  },
  {
    id: "medium",
    title: "Medium",
    minutes: "12–18 min",
    description: "Multiple leads, supporting records, and contradictions.",
  },
  {
    id: "hard",
    title: "Hard",
    minutes: "25–35 min",
    description: "Interconnected evidence, forensic work, and competing alibis.",
  },
  {
    id: "expert",
    title: "Expert",
    minutes: "40–55 min",
    description: "A layered case with multi-step leads and a dense timeline.",
  },
];

interface WelcomeScreenProps {
  difficulty: Difficulty;
  onDifficulty: (difficulty: Difficulty) => void;
  onStart: () => void;
  onGenerate: () => void;
  busy: boolean;
  error: string | null;
}

export default function WelcomeScreen({
  difficulty,
  onDifficulty,
  onStart,
  onGenerate,
  busy,
  error,
}: WelcomeScreenProps) {
  return (
    <main className="welcome-screen">
      <header className="welcome-kicker">
        <span className="brand-mark" aria-label="The Last Clue">
          LC
        </span>
        <div className="welcome-brand-copy">
          <strong className="welcome-brand-name">THE LAST CLUE</strong>
          <span className="welcome-brand-subtitle">
            DIGITAL INVESTIGATION UNIT · CASE SYSTEM V3
          </span>
        </div>
      </header>

      <section className="welcome-hero">
        <span className="eyebrow">
          THE CASE IS NEVER WHAT IT FIRST SEEMS
        </span>

        <h1 className="welcome-title">
          THE LAST
          <br />
          <em>CLUE.</em>
        </h1>

        <p>
          Investigate crime scenes, challenge suspect statements, follow
          emerging leads, and build a case from evidence—not assumptions.
        </p>

        <div className="welcome-features">
          <span>PROGRESSIVE CLUES</span>
          <span>BRANCHING LEADS</span>
          <span>YOUR OWN NOTES</span>
        </div>
      </section>

      <section className="difficulty-panel">
        <div className="section-head">
          <div>
            <h2>Select your investigation</h2>
            <p className="muted">
              Choose a case difficulty before the clock starts.
            </p>
          </div>
          <span>01 / PREPARE</span>
        </div>

        <div className="difficulty-cards">
          {levels.map((level) => (
            <button
              key={level.id}
              type="button"
              className={`difficulty-card ${
                difficulty === level.id ? "selected" : ""
              }`}
              onClick={() => onDifficulty(level.id)}
              aria-pressed={difficulty === level.id}
            >
              <span className="difficulty-card-top">
                <strong>{level.title}</strong>
                <small>{level.minutes}</small>
              </span>

              <span>{level.description}</span>

              <span className="difficulty-radio">
                {difficulty === level.id ? "● SELECTED" : "○ SELECT"}
              </span>
            </button>
          ))}
        </div>

        {error && (
          <p className="welcome-error" role="alert" aria-live="polite">
            {error}
          </p>
        )}

        <button
          className="primary start-investigation"
          type="button"
          onClick={onStart}
          disabled={busy}
        >
          {busy ? "PREPARING CASE…" : "PLAY PREBUILT CASE →"}
        </button>

        <button
          className="secondary start-investigation"
          type="button"
          onClick={onGenerate}
          disabled={busy}
        >
          {busy ? "GENERATING & VALIDATING…" : "GENERATE A NEW AI CASE ✦"}
        </button>

        <p className="welcome-note">
          The investigation timer begins only after the case is loaded.
        </p>
      </section>

      <div className="welcome-disclaimer">
        AI-generated cases are validated before play. The canonical solution
        is kept server-side; generated cases are temporary until database
        persistence is added in Phase 2.
      </div>
    </main>
  );
}
