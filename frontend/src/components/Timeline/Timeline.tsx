import { useState } from "react";
import type { TimelineEvent, Suspect, Evidence } from "../../types/case";
interface TimelineProps {
  events: TimelineEvent[]; suspects: Suspect[]; important: string[];
  onImportant: (id: string) => void; evidence: Evidence[]; found: string[];
  evidenceLinks: Record<string, string[]>;
  onToggleEvidenceLink: (eventId: string, evidenceId: string) => void;
}
export default function Timeline({events,suspects,important,onImportant,evidence,found,evidenceLinks,onToggleEvidenceLink}:TimelineProps) {
  const [selected,setSelected]=useState<string|null>(null);
  const discoveredEvidence=evidence.filter(item=>found.includes(item.id));
  return <section className="timeline-panel">
    <div className="section-head"><h2>Timeline</h2><span>RECONSTRUCT THE NIGHT</span></div>
    <p className="timeline-link-intro">Link discovered evidence to events to build your own chronological theory.</p>
    <div className="timeline">{events.map((e,i)=>{
      const linkedIds=evidenceLinks[e.id]??[];
      return <div className={`timeline-event ${e.victim_involved?"victim-event":""}`} key={e.id}>
        <div className="marker">{i+1}</div><div className="time">{e.time}</div>
        <div className="event-body">
          <button className="event-button" onClick={()=>setSelected(selected===e.id?null:e.id)} aria-expanded={selected===e.id}>
            <p>{e.description}</p><div className="chips">{e.suspect_ids.map(id=><span className="tag" key={id}>{suspects.find(s=>s.id===id)?.name}</span>)}{e.victim_involved&&<span className="tag">VICTIM</span>}{linkedIds.map(id=><span className="tag timeline-evidence-tag" key={id}>EVIDENCE: {evidence.find(item=>item.id===id)?.name??"Unknown clue"}</span>)}</div>
          </button>
          {selected===e.id&&<div className="event-detail"><p>{e.description}</p><button onClick={()=>onImportant(e.id)}>{important.includes(e.id)?"✓ IMPORTANT":"☆ MARK IMPORTANT"}</button>
            <div className="timeline-evidence-linker"><span className="timeline-link-label">LINK DISCOVERED EVIDENCE</span>
              {discoveredEvidence.length===0?<p className="timeline-link-empty">Discover evidence in the crime scene before linking it to timeline events.</p>:<div className="timeline-evidence-options">{discoveredEvidence.map(item=>{const linked=linkedIds.includes(item.id);return <button type="button" key={item.id} className={`timeline-evidence-option ${linked?"is-linked":""}`} aria-pressed={linked} onClick={()=>onToggleEvidenceLink(e.id,item.id)}><span>{linked?"✓":"+"}</span>{item.name}</button>})}</div>}
              {linkedIds.length>0&&<p className="timeline-link-footnote">{linkedIds.length} clue{linkedIds.length===1?"":"s"} linked to this event. These are your associations, not confirmed chronology.</p>}
            </div>
          </div>}
        </div>
      </div>;
    })}</div>
  </section>;
}