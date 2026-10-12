import type { AccusationResult, Case } from "../../types/case";
import DeveloperFooter from "../DeveloperFooter";

export default function Results({result, gameCase, found, timedOut, onRestart}:{result:AccusationResult;gameCase:Case;found:string[];timedOut:boolean;onRestart:()=>void}) {
  const missed = gameCase.evidence.filter((item) => !found.includes(item.id));
  return <div className="results results-page"><div className="results-card">
    <span className="eyebrow">{timedOut ? "TIME EXPIRED · CASE CLOSED" : "CASE CLOSED"}</span>
    <div className="grade">{result.score.grade}</div>
    <h1>{result.correct ? "Case Solved" : timedOut ? "Time Is Up" : "Investigation Incomplete"}</h1>
    <p>{result.solution.explanation}</p>
    <div className="score">{result.score.total}<small>/100</small></div>
    <div className="verdict-grid"><div><span>KILLER</span><b>{result.correct_killer ? "CORRECT" : "MISSED"}</b></div><div><span>MOTIVE</span><b>{result.correct_motive ? "CORRECT" : "MISSED"}</b></div><div><span>METHOD</span><b>{result.correct_method ? "CORRECT" : "MISSED"}</b></div></div>
    <div className="breakdown"><span>KILLER <b>{result.score.killer}</b></span><span>MOTIVE <b>{result.score.motive}</b></span><span>METHOD <b>{result.score.method}</b></span><span>EVIDENCE <b>{result.score.evidence}</b></span><span>DEDUCTIONS <b>{result.score.deductions}</b></span><span>INTERROGATION <b>{result.score.interrogation}</b></span><span>TIME <b>{result.score.time_bonus}</b></span></div>
    <section className="results-review"><h2>Investigation review</h2><p><strong>{found.length} of {gameCase.evidence.length}</strong> evidence items discovered.</p><div className="results-evidence-list">{gameCase.evidence.map(item=><div key={item.id} className={found.includes(item.id) ? "review-found" : "review-missed"}><span>{found.includes(item.id) ? "✓" : "—"}</span><div><strong>{item.name}</strong><small>{found.includes(item.id) ? "Discovered" : "Not discovered"} · {item.importance.replace("_", " ")}</small></div></div>)}</div>{missed.length > 0 && <p className="muted results-hint">Missed leads are shown for review. On your next attempt, use the evidence dependencies and follow-up actions to uncover them.</p>}</section>
    <button className="primary" onClick={onRestart}>RETURN TO START SCREEN</button>
    <DeveloperFooter social />
  </div></div>;
}
