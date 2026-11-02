import { useEffect, useMemo, useState } from "react";
import type { Evidence } from "../../types/case";

interface Props {
  caseId: string;
  evidence: Evidence[];
  found: string[];
  completedActions: string[];
}

type Filter = "all" | "critical" | "supporting" | "red_herring";
type ExaminationLevel = "observation" | "crossReference" | "assessment";
type ExaminationRecord = Record<string, Partial<Record<ExaminationLevel, string>>>;

export default function EvidenceLaboratory({ caseId, evidence, found, completedActions }: Props) {
  const discovered = useMemo(() => evidence.filter((item) => found.includes(item.id)), [evidence, found]);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [examinations, setExaminations] = useState<ExaminationRecord>({});

  const storageKey = `the-last-clue-lab-notes:${caseId}`;
  const examinationStorageKey = `the-last-clue-examinations:${caseId}`;
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      setNotes(raw ? JSON.parse(raw) as Record<string, string> : {});
      const examinationRaw = window.localStorage.getItem(examinationStorageKey);
      setExaminations(examinationRaw ? JSON.parse(examinationRaw) as ExaminationRecord : {});
    } catch {
      setNotes({});
      setExaminations({});
    }
  }, [storageKey, examinationStorageKey]);

  const visible = discovered.filter((item) => {
    const matchesFilter = filter === "all" || item.importance === filter;
    const text = `${item.name} ${item.description}`.toLowerCase();
    return matchesFilter && text.includes(query.trim().toLowerCase());
  });
  const selected = discovered.find((item) => item.id === selectedId) ?? visible[0] ?? discovered[0] ?? null;
  const unlocked = (item: Evidence) =>
    (item.requires_evidence_ids ?? []).every((id) => found.includes(id)) &&
    (item.requires_action_ids ?? []).every((id) => completedActions.includes(id));

  function saveNote(value: string) {
    if (!selected) return;
    const next = { ...notes, [selected.id]: value };
    setNotes(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1200);
    } catch {
      setSaved(false);
    }
  }

  function saveExamination(level: ExaminationLevel, value: string) {
    if (!selected) return;
    const next: ExaminationRecord = {
      ...examinations,
      [selected.id]: { ...(examinations[selected.id] ?? {}), [level]: value },
    };
    setExaminations(next);
    try {
      window.localStorage.setItem(examinationStorageKey, JSON.stringify(next));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1200);
    } catch {
      setSaved(false);
    }
  }

  const selectedExamination = selected ? examinations[selected.id] ?? {} : {};
  const examinationStages: { key: ExaminationLevel; number: string; title: string; prompt: string }[] = [
    { key: "observation", number: "01", title: "Initial Observation", prompt: "Describe only what is directly observable. Note condition, material, markings, and anything unusual without jumping to conclusions." },
    { key: "crossReference", number: "02", title: "Cross-Reference", prompt: "Compare this clue with other recovered evidence, statements, or timeline events. Record connections and inconsistencies." },
    { key: "assessment", number: "03", title: "Forensic Assessment", prompt: "Write your current interpretation, explain the reasoning, and identify what remains uncertain or needs verification." },
  ];

  return (
    <section className="board evidence-lab" aria-labelledby="evidence-lab-title">
      <div className="section-head evidence-lab-heading">
        <div>
          <span className="eyebrow">FORENSIC REVIEW / LAB 05</span>
          <h2 id="evidence-lab-title">Evidence Laboratory</h2>
          <p className="muted">Review recovered evidence, compare its significance, and record your own forensic interpretation.</p>
        </div>
        <span className="count">{discovered.length} / {evidence.length} RECOVERED</span>
      </div>
      <div className="evidence-lab-toolbar">
        <label className="evidence-lab-search">SEARCH EVIDENCE
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search recovered clues…" />
        </label>
        <div className="evidence-lab-filters" role="group" aria-label="Filter evidence">
          {(["all", "critical", "supporting", "red_herring"] as Filter[]).map((item) => (
            <button type="button" key={item} className={filter === item ? "selected" : ""} onClick={() => setFilter(item)}>
              {item === "red_herring" ? "RED HERRING" : item.replace("_", " ").toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      {discovered.length === 0 ? (
        <div className="evidence-lab-empty"><strong>No evidence recovered yet.</strong><p>Inspect the crime scene and collect clues before bringing them to the laboratory.</p></div>
      ) : (
        <div className="evidence-lab-layout">
          <div className="evidence-lab-list" aria-label="Recovered evidence">
            {visible.map((item) => (
              <button type="button" key={item.id} className={selected?.id === item.id ? "evidence-lab-item active" : "evidence-lab-item"} onClick={() => setSelectedId(item.id)}>
                <span className={`evidence-lab-type ${item.importance}`}>{item.importance.replace("_", " ")}</span>
                <strong>{item.name}</strong>
                <small>{unlocked(item) ? "AVAILABLE FOR REVIEW" : "RECOVERED · FOLLOW-UP PENDING"}</small>
              </button>
            ))}
            {visible.length === 0 && <p className="muted">No recovered evidence matches this filter.</p>}
          </div>
          {selected && (
            <article className="evidence-lab-detail">
              <span className="eyebrow">SPECIMEN / {selected.id.toUpperCase()}</span>
              <h3>{selected.name}</h3>
              <p>{selected.description}</p>
              <div className="evidence-lab-meta"><span>CLASSIFICATION</span><strong>{selected.importance.replace("_", " ").toUpperCase()}</strong></div>
              <div className="evidence-lab-meta"><span>STATUS</span><strong>{unlocked(selected) ? "AVAILABLE FOR REVIEW" : "FOLLOW-UP REQUIRED"}</strong></div>
              <label className="evidence-lab-notes">DETECTIVE'S LAB NOTES
                <textarea value={notes[selected.id] ?? ""} onChange={(event) => saveNote(event.target.value)} placeholder="Record what this clue might mean, what it supports, and what remains uncertain…" rows={5} maxLength={2000} />
              </label>
              <div className="evidence-lab-note-footer"><span>Notes save in this browser for this case.</span><span role="status">{saved ? "SAVED" : `${(notes[selected.id] ?? "").length}/2000`}</span></div>
              <section className="evidence-examination" aria-labelledby="evidence-examination-title">
                <div className="evidence-examination-heading">
                  <div><span className="eyebrow">THREE-STAGE REVIEW</span><h4 id="evidence-examination-title">Examination Levels</h4>
                    <p>Build your analysis progressively. Each stage is a detective-authored note, not an automated forensic result.</p></div>
                  <span className="evidence-examination-progress">{examinationStages.filter((stage) => (selectedExamination[stage.key] ?? "").trim()).length}/3 COMPLETE</span>
                </div>
                <div className="evidence-examination-stages">
                  {examinationStages.map((stage, index) => {
                    const value = selectedExamination[stage.key] ?? "";
                    const priorComplete = index === 0 || examinationStages.slice(0, index).every((previous) => (selectedExamination[previous.key] ?? "").trim().length > 0);
                    return <article className={value.trim() ? "evidence-examination-stage complete" : "evidence-examination-stage"} key={stage.key}>
                      <div className="evidence-examination-stage-title"><span>{stage.number}</span><strong>{stage.title}</strong><small>{value.trim() ? "NOTE RECORDED" : priorComplete ? "READY FOR REVIEW" : "COMPLETE THE PREVIOUS LEVEL FIRST"}</small></div>
                      <p>{stage.prompt}</p>
                      <textarea value={value} disabled={!priorComplete} onChange={(event) => saveExamination(stage.key, event.target.value)} rows={3} maxLength={1500}
                        placeholder={priorComplete ? "Record your findings for this examination level…" : "Complete the previous level to unlock this stage."} />
                      <div className="evidence-examination-stage-footer"><span>{value.length}/1500 characters</span>{value.trim() && <span>✓ LEVEL RECORDED</span>}</div>
                    </article>;
                  })}
                </div>
                <p className="evidence-examination-disclaimer">Completing examination levels does not reveal hidden case facts, alter evidence classifications, or affect scoring. Your notes are saved in this browser for this case.</p>
              </section>
            </article>
          )}
        </div>
      )}
    </section>
  );
}
