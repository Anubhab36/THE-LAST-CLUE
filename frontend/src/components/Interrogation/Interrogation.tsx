import { useState } from "react";

export interface InterviewEntry {
  question: string;
  answer: string;
  hasInconsistency: boolean;
}
import type { Case, Suspect } from "../../types/case";
import { interrogateSession } from "../../services/api";

interface InterrogationProps {
  gameCase: Case;
  sessionId: string;
  suspect: Suspect;
  onClose: () => void;
  onHit: () => void;
  found: string[];
  completedActions: string[];
  previouslyAsked?: string[];
  previousTranscript?: InterviewEntry[];
  onQuestionAsked: (suspectId: string, questionId: string) => void;
  onTranscriptChange: (suspectId: string, transcript: InterviewEntry[]) => void;
}

export default function Interrogation({
  gameCase, sessionId, suspect, onClose, onHit, found, completedActions,
  previouslyAsked = [],
  previousTranscript = [],
  onQuestionAsked,
  onTranscriptChange,
}: InterrogationProps) {
  const profile = gameCase.interrogation.find((p) => p.suspect_id === suspect.id);
  const [transcript, setTranscript] = useState<InterviewEntry[]>(previousTranscript);
  const [busy, setBusy] = useState(false);
  const [asked, setAsked] = useState<string[]>(previouslyAsked);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function ask(questionId: string) {
    if (busy || asked.includes(questionId)) return;
    setBusy(true);
    try {
      const result = await interrogateSession(sessionId, suspect.id, questionId);
      setErrorMessage(null);
      setAsked((current) =>
        current.includes(questionId) ? current : [...current, questionId],
      );
      onQuestionAsked(suspect.id, questionId);

      const questionText =
        profile?.questions.find((item) => item.id === questionId)?.text ?? "Question";
      const entry: InterviewEntry = {
        question: questionText,
        // Never visually distinguish a suspect based on the case truth. Dialogue is displayed uniformly.
        answer: result.answer,
        hasInconsistency: false,
      };
      setTranscript((current) => {
        const next = [...current, entry];
        onTranscriptChange(suspect.id, next);
        return next;
      });
      if (result.hit) onHit();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The interview could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay">
      <div className="modal">
        <button className="close" onClick={onClose} aria-label="Close interrogation">×</button>
        <span className="eyebrow">INTERROGATION</span>
        <h2>{suspect.name}</h2>
        <p className="muted">{suspect.occupation} · {suspect.relationship_to_victim}</p>
        {errorMessage && <p className="welcome-error" role="alert">{errorMessage}</p>}
        <div className="questions">
          {profile?.questions.map((question) => {
            const unlocked = (question.requires_evidence_ids ?? []).every((id) => found.includes(id)) &&
              (question.requires_action_ids ?? []).every((id) => completedActions.includes(id));
            return (
              <button
                disabled={busy || asked.includes(question.id) || !unlocked}
                key={question.id}
                onClick={() => ask(question.id)}
                title={!unlocked ? (question.unlock_hint ?? "Find the required evidence to unlock this question.") : undefined}
              >
                {asked.includes(question.id) ? "✓ " : !unlocked ? "🔒 " : ""}{question.text}
                {!unlocked && <small className="question-lock-hint">{question.unlock_hint ?? "Requires more evidence"}</small>}
              </button>
            );
          })}
        </div>
        {transcript.length > 0 && <div className="interrogation-transcript" aria-live="polite">
          <div className="transcript-heading">INTERVIEW RECORD · {transcript.length} EXCHANGE{transcript.length === 1 ? "" : "S"}</div>
          {transcript.map((entry, index) => <article className="transcript-entry" key={`${index}-${entry.question}`}>
            <p className="transcript-question">{entry.question}</p>
            <p className="transcript-answer">{entry.answer}</p>
          </article>)}
          <p className="transcript-note">Compare statements with independent evidence before drawing conclusions.</p>
        </div>}
      </div>
    </div>
  );
}
