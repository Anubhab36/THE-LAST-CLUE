import { useState } from "react";

export type NotebookNotes = {
  findings: string;
  theories: string;
  questions: string;
};

interface NotebookProps {
  notes: NotebookNotes;
  onChange: (notes: NotebookNotes) => void;
  discoveredCount: number;
}

const tabs: { key: keyof NotebookNotes; label: string; hint: string }[] = [
  { key: "findings", label: "Findings", hint: "Record observations and evidence." },
  { key: "theories", label: "Theories", hint: "Track hypotheses without treating them as proven facts." },
  { key: "questions", label: "Open questions", hint: "Keep track of leads you still need to pursue." },
];

export default function Notebook({ notes, onChange, discoveredCount }: NotebookProps) {
  const [active, setActive] = useState<keyof NotebookNotes>("findings");
  const current = tabs.find((tab) => tab.key === active)!;

  return (
    <section className="board notebook-panel">
      <div className="section-head">
        <div>
          <h2>Detective's Notebook</h2>
          <p className="muted">Your private working notes · {discoveredCount} evidence items discovered</p>
        </div>
        <span className="notebook-status">CASE WORKSPACE</span>
      </div>
      <div className="notebook-tabs" role="tablist" aria-label="Notebook sections">
        {tabs.map((tab) => (
          <button key={tab.key} type="button" role="tab" aria-selected={active === tab.key}
            className={active === tab.key ? "notebook-tab active" : "notebook-tab"}
            onClick={() => setActive(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>
      <label className="notebook-label" htmlFor={`notebook-${active}`}>{current.hint}</label>
      <textarea id={`notebook-${active}`} className="notebook-textarea"
        value={notes[active]} onChange={(event) => onChange({ ...notes, [active]: event.target.value })}
        placeholder={`Write your ${current.label.toLowerCase()} here...`} rows={6} />
      <div className="notebook-footer">
        <span>Notes stay with this case while you investigate.</span>
        <span>{notes[active].trim().length} characters</span>
      </div>
    </section>
  );
}
