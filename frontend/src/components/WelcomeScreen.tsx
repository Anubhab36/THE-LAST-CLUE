import type { CaseCatalogItem } from "../services/api";
import type { Difficulty } from "../types/case";
import CaseArchiveAchievements from "./CaseArchiveAchievements/CaseArchiveAchievements";
import lockedStudy from "../assets/case-covers/The_Locked_Study_Room.webp";
import lastTrain from "../assets/case-covers/The_Last_Train.webp";
import deathRoom12 from "../assets/case-covers/Death_at_Room_12.webp";
import galleryMidnight from "../assets/case-covers/The_Gallery_After_Midnight.webp";
import midnightBroadcast from "../assets/case-covers/The_Midnight_Broadcast.webp";
import missingBlueprint from "../assets/case-covers/The_Missing_Blueprint.webp";
import vanishingHour from "../assets/case-covers/The_Vanishing_Hour.webp";
import blackoutProtocol from "../assets/case-covers/The_Blackout_Protocol.webp";
import researchVessel from "../assets/case-covers/Murder_on_the_Research_Vessel.webp";
import silentArchive from "../assets/case-covers/The_Silent_Archive.webp";
import glasshouseParadox from "../assets/case-covers/The_Glasshouse_Paradox.webp";
import seventhWitness from "../assets/case-covers/The_Seventh_Witness.webp";

interface CaseProgressRecord {
  attempts: number;
  bestScore: number;
  bestGrade: string;
  solved: boolean;
}

const caseArtworkByTitle: Record<string, string> = {
  "the locked study": lockedStudy,
  "the locked study room": lockedStudy,
  "the last train": lastTrain,
  "death at room 12": deathRoom12,
  "the gallery after midnight": galleryMidnight,
  "the midnight broadcast": midnightBroadcast,
  "the missing blueprint": missingBlueprint,
  "the vanishing hour": vanishingHour,
  "the blackout protocol": blackoutProtocol,
  "murder on the research vessel": researchVessel,
  "the silent archive": silentArchive,
  "the glasshouse paradox": glasshouseParadox,
  "the seventh witness": seventhWitness,
};

const caseArtwork = (title: string): string => {
  return caseArtworkByTitle[title.trim().toLowerCase()] ?? lockedStudy;
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
  archiveCases: CaseCatalogItem[];
  archiveProgress: Record<string, CaseProgressRecord>;
  onResetCaseProgress: () => void;
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
  difficulty, onDifficulty, cases, caseProgress, archiveCases, archiveProgress, onResetCaseProgress, catalogLoading, catalogError,
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
              <div className="case-library-grid case-library-grid-with-play">
                {levelCases.map((item) => (
  <div className="case-library-item" key={item.case_id}>
    <button
      type="button"
      className={`case-library-card ${selectedCaseId === item.case_id ? "selected" : ""}`}
      onClick={() => onSelectCase(item.case_id)}
      aria-pressed={selectedCaseId === item.case_id}
      disabled={busy}
    >
      <span className="case-library-art" aria-hidden="true">
        <img
          src={caseArtwork(item.title)}
          alt=""
          loading="lazy"
          onError={(event) => {
            const image = event.currentTarget;
            image.style.display = "none";
            image.parentElement?.classList.add("case-library-art-fallback");
          }}
        />
      </span>

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

    {selectedCaseId === item.case_id && (
      <button
        className="primary start-investigation case-play-button"
        type="button"
        onClick={onStart}
        disabled={
          busy ||
          catalogLoading ||
          !!catalogError ||
          !cases.length ||
          !selectedCaseId
        }
      >
        {busy
          ? "PREPARING CASE…"
          : catalogLoading
            ? "LOADING CASE FILES…"
            : "PLAY SELECTED CASE →"}
      </button>
    )}
  </div>
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

      <CaseArchiveAchievements cases={archiveCases} progress={archiveProgress} onResetProgress={onResetCaseProgress} />
    </main>
  );
}
