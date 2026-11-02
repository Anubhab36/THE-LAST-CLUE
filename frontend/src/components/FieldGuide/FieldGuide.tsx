import { useEffect } from "react";

interface FieldGuideProps {
  onClose: () => void;
}

const guideSections = [
  {
    number: "01",
    title: "Start at the crime scene",
    description: "Inspect the scene and select clickable evidence markers. Read each item carefully; discovered evidence is added to your investigation and can unlock new actions.",
    tip: "Not every clue is immediately available. Some require earlier evidence or completed actions.",
  },
  {
    number: "02",
    title: "Examine and connect evidence",
    description: "Use the Evidence Laboratory for deeper examination, then use the Evidence Board to connect discovered items with suspects and record deductions. The Timeline helps reconstruct the sequence of events and link clues to moments.",
    tip: "A strong theory is supported by multiple independent clues—not just one suspicious detail.",
  },
  {
    number: "03",
    title: "Investigate leads",
    description: "The Investigation Actions section contains tasks you can perform when their requirements are met. The Detective's Notebook → Open Questions also has Lead Discovery, which surfaces available actions and suspect questions as you unlock them.",
    tip: "If a lead is missing, look for its prerequisites: undiscovered evidence, another action, or an unanswered question.",
  },
  {
    number: "04",
    title: "Question the suspects",
    description: "Open a suspect profile or dossier and start an interrogation. Ask available questions, compare answers with the evidence, and review the transcript. New evidence and completed actions can unlock further questions.",
    tip: "Treat statements as claims to verify. A contradiction is useful only when you can point to evidence that challenges it.",
  },
  {
    number: "05",
    title: "Build your case in the notebook",
    description: "Findings are for observations; Theories is for your proposed suspect, motive, method, timeline, and supporting or contradicting evidence; Open Questions tracks unresolved questions and leads; Suspect Tracker records your assessment. You can also record and challenge conflicting evidence-backed statements.",
    tip: "Keep facts separate from assumptions. Update your theory when new evidence changes the picture.",
  },
  {
    number: "06",
    title: "Use hints when needed",
    description: "The Detective's Help Desk offers three levels: Nudge, Direction, and Specific Lead. Choose a level and reveal a hint when you need help moving forward.",
    tip: "Hints guide your next step; they do not reveal the culprit or final solution.",
  },
  {
    number: "07",
    title: "Make your final accusation",
    description: "When you are ready, select Make Final Accusation and submit your conclusion. Your investigation is evaluated using the case's scoring criteria. The timer and investigation progress are shown throughout the case.",
    tip: "Before submitting, make sure your suspect, motive, and method are backed by the evidence you collected.",
  },
];

export default function FieldGuide({ onClose }: FieldGuideProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="field-guide-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="field-guide-dialog" role="dialog" aria-modal="true" aria-labelledby="field-guide-title">
        <header className="field-guide-header">
          <div>
            <span className="eyebrow">DIGITAL INVESTIGATION UNIT · FIELD MANUAL</span>
            <h2 id="field-guide-title">How to play</h2>
            <p>A practical guide to the tools available during an investigation.</p>
          </div>
          <button type="button" className="field-guide-close" onClick={onClose} aria-label="Close help guide">×</button>
        </header>
        <div className="field-guide-content">
          <div className="field-guide-callout">
            <strong>THE BASIC LOOP</strong>
            <span>Inspect → Collect → Examine → Connect → Question → Deduce → Accuse</span>
          </div>
          <div className="field-guide-grid">
            {guideSections.map((section) => (
              <article className="field-guide-card" key={section.number}>
                <span className="field-guide-number">{section.number}</span>
                <div>
                  <h3>{section.title}</h3>
                  <p>{section.description}</p>
                  <div className="field-guide-tip"><strong>FIELD TIP</strong>{section.tip}</div>
                </div>
              </article>
            ))}
          </div>
          <footer className="field-guide-footer">
            <span>YOUR PROGRESS IS NOT AFFECTED BY OPENING THIS GUIDE.</span>
            <button type="button" className="primary" onClick={onClose}>BACK TO INVESTIGATION</button>
          </footer>
        </div>
      </section>
    </div>
  );
}
