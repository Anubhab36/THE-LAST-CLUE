import type { AccusationResult, Case } from "../../types/case";
import DeveloperFooter from "../DeveloperFooter";

interface ResultsProps {
  result: AccusationResult;
  gameCase: Case;
  found: string[];
  timedOut: boolean;
  onRestart: () => void;
}

export default function Results({
  result,
  gameCase,
  found,
  timedOut,
  onRestart,
}: ResultsProps) {
  const missed = gameCase.evidence.filter((item) => !found.includes(item.id));
  const discoveredCritical = gameCase.evidence.filter(
    (item) => found.includes(item.id) && item.importance === "critical",
  ).length;
  const missedCritical = gameCase.evidence.filter(
    (item) => !found.includes(item.id) && item.importance === "critical",
  ).length;

  const scoreItems = [
    { label: "Killer identified", value: result.score.killer, kind: "positive" },
    { label: "Motive established", value: result.score.motive, kind: "positive" },
    { label: "Method established", value: result.score.method, kind: "positive" },
    { label: "Evidence collected", value: result.score.evidence, kind: "positive" },
    { label: "Deductions", value: result.score.deductions, kind: "neutral" },
    { label: "Interrogation", value: result.score.interrogation, kind: "positive" },
    { label: "Time bonus", value: result.score.time_bonus, kind: "positive" },
  ];

  const verdictItems = [
    { label: "Killer", correct: result.correct_killer },
    { label: "Motive", correct: result.correct_motive },
    { label: "Method", correct: result.correct_method },
  ];

  const formatImportance = (importance: string) =>
    importance.replace(/_/g, " ");

  return (
    <div className="results results-page">
      <div className="results-card results-card-enhanced">
        <span className="eyebrow">
          {timedOut ? "TIME EXPIRED · CASE CLOSED" : "CASE CLOSED · INVESTIGATION REPORT"}
        </span>

        <div className="results-score-hero">
          <div className="grade">{result.score.grade}</div>
          <h1>
            {result.correct
              ? "Case Solved"
              : timedOut
                ? "Time Is Up"
                : "Investigation Incomplete"}
          </h1>
          <p className="results-summary">
            {result.correct
              ? "Your accusation identified the killer. Review the report to see how your investigation performed."
              : "Compare your accusation with the solution and review the evidence you uncovered."}
          </p>
          <div className="score results-total-score">
            {result.score.total}
            <small> / 100</small>
          </div>
          <div
            className="results-score-track"
            role="progressbar"
            aria-label="Final score"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.max(0, Math.min(100, result.score.total))}
          >
            <span
              style={{
                width: `${Math.max(0, Math.min(100, result.score.total))}%`,
              }}
            />
          </div>
          <span className="results-score-caption">FINAL INVESTIGATION SCORE</span>
        </div>

        <section className="results-section">
          <div className="results-section-heading">
            <span className="panel-number">01</span>
            <h2>Accusation verdict</h2>
          </div>
          <div className="verdict-grid">
            {verdictItems.map((item) => (
              <div
                key={item.label}
                className={item.correct ? "verdict-correct" : "verdict-incorrect"}
              >
                <span>{item.label}</span>
                <b>{item.correct ? "CORRECT" : "INCORRECT"}</b>
              </div>
            ))}
          </div>
        </section>

        <section className="results-section">
          <div className="results-section-heading">
            <span className="panel-number">02</span>
            <h2>Score breakdown</h2>
          </div>
          <p className="results-section-description">
            Your final score is made up of the following components. Deductions
            are displayed as returned by the scoring engine.
          </p>
          <div className="results-score-breakdown">
            {scoreItems.map((item) => (
              <div className="results-score-row" key={item.label}>
                <div className="results-score-row-label">
                  <span>{item.label}</span>
                  <strong className={`score-value score-${item.kind}`}>
                    {item.kind === "neutral" && item.value > 0
                      ? `−${item.value}`
                      : item.value > 0
                        ? `+${item.value}`
                        : item.value}
                  </strong>
                </div>
                <div className="results-component-track">
                  <span
                    style={{
                      width: `${Math.min(
                        100,
                        Math.abs(item.value),
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="results-section results-solution">
          <div className="results-section-heading">
            <span className="panel-number">03</span>
            <h2>Official case solution</h2>
          </div>
          <div className="results-solution-grid">
            <div>
              <span>IDENTIFIED KILLER</span>
              <strong>
                {gameCase.suspects.find(
                  (suspect) => suspect.id === result.solution.killer_id,
                )?.name ?? "Unknown suspect"}
              </strong>
            </div>
            <div>
              <span>MOTIVE</span>
              <strong>{result.solution.motive}</strong>
            </div>
            <div>
              <span>METHOD</span>
              <strong>{result.solution.method}</strong>
            </div>
            <div>
              <span>MURDER TIME</span>
              <strong>{result.solution.murder_time}</strong>
            </div>
          </div>
          <p className="results-explanation">{result.solution.explanation}</p>
        </section>

        <section className="results-section results-review">
          <div className="results-section-heading">
            <span className="panel-number">04</span>
            <h2>Investigation review</h2>
          </div>
          <p className="results-section-description">
            You discovered <strong>{found.length} of {gameCase.evidence.length}</strong>{" "}
            evidence items, including <strong>{discoveredCritical}</strong>{" "}
            critical clues.
          </p>

          <div className="results-investigation-stats">
            <div>
              <strong>{found.length}/{gameCase.evidence.length}</strong>
              <span>CLUES FOUND</span>
            </div>
            <div>
              <strong>{discoveredCritical}</strong>
              <span>CRITICAL FOUND</span>
            </div>
            <div>
              <strong>{missedCritical}</strong>
              <span>CRITICAL MISSED</span>
            </div>
          </div>

          <div className="results-evidence-list">
            {gameCase.evidence.map((item) => {
              const discovered = found.includes(item.id);

              return (
                <div
                  key={item.id}
                  className={`${discovered ? "review-found" : "review-missed"} ${
                    item.importance === "critical" ? "review-critical" : ""
                  }`}
                >
                  <span className="review-status" aria-hidden="true">
                    {discovered ? "✓" : "—"}
                  </span>
                  <div>
                    <strong>{item.name}</strong>
                    <small>
                      {discovered ? "Discovered" : "Not discovered"} ·{" "}
                      {formatImportance(item.importance)}
                    </small>
                  </div>
                </div>
              );
            })}
          </div>

          {missed.length > 0 && (
            <p className="muted results-hint">
              Missed leads are included for post-case review. On another attempt,
              inspect evidence dependencies and complete follow-up investigation
              actions to uncover additional clues.
            </p>
          )}
        </section>

        <button className="primary results-restart" onClick={onRestart}>
          RETURN TO CASE SELECTION
        </button>

        <DeveloperFooter social />
      </div>
    </div>
  );
}
