import type { CaseCatalogItem } from "../services/api";
import type { Difficulty } from "../types/case";

interface CaseProgressRecord {
  attempts: number;
  bestScore: number;
  bestGrade: string;
  solved: boolean;
}

const caseArtworks = [
  "photo-1518709268805-4e9042af9f23",
  "photo-1600210492486-724fe5c67fb0",
  "photo-1577083552431-6e5fd01aa342",
  "photo-1474487548417-781cb71495f3",
  "photo-1590602847861-f357a9332bbc",
  "photo-1503387762-592deb58ef4e",
  "photo-1544551763-46a013bb70d5",
  "photo-1519608487953-e999c86e7455",
  "photo-1518837695005-2083093ee35b",
  "photo-1519608487953-e999c86e7455",
  "photo-1518709268805-4e9042af9f23",
  "photo-1497366754035-f200968a6e72",
  "photo-1511818966892-d7d671e672a2",
  "photo-1518837695005-2083093ee35b",
];

const caseArtwork = (caseId: string, index: number): string => {
  // Stable case-id hash spreads the catalog across the artwork pool, avoiding
  // the same fallback image appearing on adjacent cards.
  const hash = [...caseId].reduce((value, char) => value + char.charCodeAt(0), 0);
  const image = caseArtworks[(hash + index * 7) % caseArtworks.length];
  return `https://images.unsplash.com/${image}?auto=format&fit=crop&w=900&q=85`;
};

const levels: {
  id: Difficulty;
  title: string;
  minutes: string;
  description: string;
}[] = [
  { id: "easy", title: "Easy", minutes: "5–8 min", description: "A compact case with direct clues and clear deductions." },
  { id: "medium", title: "Medium", minutes: "12–18 min", description: "Multiple leads, supporting records, and contradictions." },
  { id: "hard", title: "Hard", minutes: "25–35 min", description: "Interconnected evidence, forensic work, and competing alibis." },
  { id: "expert", title: "Expert", minutes: "40–55 min", description: "A layered case with multi-step leads and a dense timeline." },
];

interface WelcomeScreenProps {
  difficulty: Difficulty;
  onDifficulty: (difficulty: Difficulty) => void;
  cases: CaseCatalogItem[];
  caseProgress: Record<string, CaseProgressRecord>;
  catalogLoading: boolean;
  catalogError: string | null;
  onRetryCatalog: () => void;
  selectedCaseId: string;
  onSelectCase: (caseId: string) => void;
  onStart: () => void;
  onGenerate: () => void;
  busy: boolean;
  error: string | null;
}

export default function WelcomeScreen({
  difficulty, onDifficulty, cases, caseProgress, catalogLoading, catalogError,
  onRetryCatalog, selectedCaseId, onSelectCase,
  onStart, onGenerate, busy, error,
}: WelcomeScreenProps) {
  return (
    <main className="welcome-screen">
      <header className="welcome-kicker">
        <span className="brand-mark" aria-label="The Last Clue">LC</span>
        <div className="welcome-brand-copy">
          <strong className="welcome-brand-name">THE LAST CLUE</strong>
          <span className="welcome-brand-subtitle">DIGITAL INVESTIGATION UNIT · CASE SYSTEM V3</span>
        </div>
      </header>

      <section className="welcome-hero">
        <div className="welcome-hero-copy">
          <span className="eyebrow">THE CASE IS NEVER WHAT IT FIRST SEEMS</span>
          <h1 className="welcome-title">THE LAST<br /><em>CLUE.</em></h1>
          <p>Every detail matters. Every statement can crack. Build your case from evidence—not assumptions.</p>
          <div className="welcome-features">
            <span>PROGRESSIVE CLUES</span>
            <span>BRANCHING LEADS</span>
            <span>YOUR OWN NOTES</span>
          </div>
        </div>
        <div className="welcome-hero-visual" role="img" aria-label="Atmospheric noir crime-scene investigation">
          <div className="hero-visual-vignette" />
          <div className="hero-file-stamp"><span>CONFIDENTIAL</span><strong>CASE FILE</strong><small>INVESTIGATION UNIT / 03</small></div>
          <div className="hero-visual-caption"><span>THE DETAILS NEVER LIE</span><span>EST. 2026</span></div>
        </div>
      </section>

      <section className="difficulty-panel case-library-panel">
        <div className="section-head">
          <div>
            <h2>Choose your case</h2>
            <p className="muted">Select a specific investigation. Your timer starts when you enter the case.</p>
          </div>
          <span>01 / CASE FILES</span>
        </div>

        {levels.map((level) => {
          const levelCases = cases.filter((item) => item.difficulty === level.id);
          return (
            <section className="case-level" key={level.id} aria-labelledby={`case-level-${level.id}`}>
              <div className="case-level-heading">
                <h3 id={`case-level-${level.id}`}>{level.title}</h3>
                <span>{level.minutes} · {levelCases.length} CASES</span>
              </div>
              <div className="case-library-grid">
                {levelCases.map((item) => (
                  <button
                    key={item.case_id}
                    type="button"
                    className={`case-library-card ${selectedCaseId === item.case_id ? "selected" : ""}`}
                    onClick={() => onSelectCase(item.case_id)}
                    aria-pressed={selectedCaseId === item.case_id}
                    disabled={busy}
                  >
                    <span
                      className="case-library-art"
                      style={{ backgroundImage: `linear-gradient(180deg, rgba(8,8,9,.04) 0%, rgba(8,8,9,.82) 100%), url("${caseArtwork(item.case_id, cases.findIndex((entry) => entry.case_id === item.case_id))}")` }}
                      aria-hidden="true"
                    />
                    <span className="case-library-card-top">
                      <strong>{item.title}</strong>
                      <small>{item.target_minutes} MIN</small>
                    </span>
                    <span className="case-library-description">{item.description}</span>
                    <span className="case-progress-summary">
                      {caseProgress[item.case_id] ? (
                        <>
                          <span className="case-progress-status">
                            {caseProgress[item.case_id].solved ? "COMPLETED" : "ATTEMPTED"}
                          </span>
                          <span>
                            {caseProgress[item.case_id].attempts} completed attempt
                            {caseProgress[item.case_id].attempts === 1 ? "" : "s"}
                          </span>
                          <span>
                            Best: {caseProgress[item.case_id].bestScore}/100
                            {caseProgress[item.case_id].bestGrade
                              ? ` · Grade ${caseProgress[item.case_id].bestGrade}`
                              : ""}
                          </span>
                        </>
                      ) : (
                        <span className="case-progress-status">NEW CASE</span>
                      )}
                    </span>
                    <span className="difficulty-radio">
                      {selectedCaseId === item.case_id ? "● SELECTED" : "○ SELECT CASE"}
                    </span>
                  </button>
                ))}
                {levelCases.length === 0 && catalogLoading && (
                  <p className="muted">Loading case files…</p>
                )}
              </div>
            </section>
          );
        })}

        {catalogError && (
          <div className="welcome-error" role="alert" aria-live="polite">
            <p>{catalogError}</p>
            <button
              className="secondary"
              type="button"
              onClick={onRetryCatalog}
              disabled={catalogLoading || busy}
            >
              {catalogLoading ? "LOADING CASES…" : "RETRY LOADING CASES"}
            </button>
          </div>
        )}

        {error && <p className="welcome-error" role="alert" aria-live="polite">{error}</p>}

        <button
          className="primary start-investigation"
          type="button"
          onClick={onStart}
          disabled={busy || catalogLoading || !!catalogError || !cases.length || !selectedCaseId}
        >
          {busy ? "PREPARING CASE…" : catalogLoading ? "LOADING CASE FILES…" : "PLAY SELECTED CASE →"}
        </button>
      </section>

      <section className="difficulty-panel ai-case-panel">
        <div className="section-head">
          <div>
            <h2>Or generate a new case</h2>
            <p className="muted">Choose a difficulty and generate a different investigation.</p>
          </div>
          <span>02 / AI GENERATION</span>
        </div>
        <div className="difficulty-cards">
          {levels.map((level) => (
            <button
              key={level.id}
              type="button"
              className={`difficulty-card ${difficulty === level.id ? "selected" : ""}`}
              onClick={() => onDifficulty(level.id)}
              aria-pressed={difficulty === level.id}
              disabled={busy}
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
        <button className="secondary start-investigation" type="button" onClick={onGenerate} disabled={busy}>
          {busy ? "GENERATING & VALIDATING…" : "GENERATE A NEW AI CASE ✦"}
        </button>
        <p className="welcome-note">
          If AI generation is temporarily unavailable, a built-in case of the selected difficulty is used instead.
        </p>
      </section>

      <div className="welcome-disclaimer">
        Your active investigation progress is saved so you can resume after refreshing the page.
      </div>
    </main>
  );
}
