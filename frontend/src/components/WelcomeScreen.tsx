import type { CaseCatalogItem } from "../services/api";
import type { Difficulty } from "../types/case";

interface CaseProgressRecord {
  attempts: number;
  bestScore: number;
  bestGrade: string;
  solved: boolean;
}

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
        <span className="eyebrow">THE CASE IS NEVER WHAT IT FIRST SEEMS</span>
        <h1 className="welcome-title">THE LAST<br /><em>CLUE.</em></h1>
        <p>Investigate crime scenes, challenge suspect statements, follow emerging leads, and build a case from evidence—not assumptions.</p>
        <div className="welcome-features">
          <span>PROGRESSIVE CLUES</span>
          <span>BRANCHING LEADS</span>
          <span>YOUR OWN NOTES</span>
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
