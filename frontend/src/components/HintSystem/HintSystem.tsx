import { useMemo, useState } from "react";
import type { Case } from "../../types/case";
type HintLevel = 1 | 2 | 3;
export default function HintSystem({ gameCase, found, completedActions }: { gameCase: Case; found: string[]; completedActions: string[] }) {
 const [level,setLevel]=useState<HintLevel>(1); const [revealed,setRevealed]=useState(false);
 const target=useMemo(()=>gameCase.evidence.find(e=>!found.includes(e.id))??null,[gameCase,found]);
 const hint=useMemo(()=>{
  if(!target) return level===1?"Revisit recovered clues and look for a detail that supports or contradicts an alibi.":level===2?"Compare the timeline with statements you collected. Record any contradiction in your notebook.":"Review each suspect's opportunity and compare it with physical evidence. Strong deductions use more than one clue.";
  if(level===1) return target.unlock_hint?.trim() || "Revisit locations and investigation leads you have not fully explored. Some clues depend on earlier discoveries.";
  if(level===2) return `Focus on “${target.name}”. Check its location and any prerequisites in the case.`;
  const location=gameCase.locations.find(l=>l.id===target.location_id)?.name??"location not specified";
  return `Your next concrete lead is “${target.name}” at ${location}. ${target.unlock_hint?.trim()||"Inspect related evidence and complete listed prerequisites."}`;
 },[target,level,gameCase]);
 return <section className="hint-system panel" aria-labelledby="hint-system-title">
  <div className="panel-heading"><div><span className="panel-number">04</span><h2 id="hint-system-title">Detective's help desk</h2></div><span className="count">OPTIONAL ASSISTANCE</span></div>
  <div className="hint-system-body"><p className="hint-intro">Stuck on the case? Choose how direct your hint should be. Hints will not reveal the culprit or final solution.</p>
   <div className="hint-levels" role="group" aria-label="Hint strength">{([{id:1,label:"NUDGE"},{id:2,label:"DIRECTION"},{id:3,label:"SPECIFIC LEAD"}] as const).map(item=><button type="button" key={item.id} className={`hint-level-button ${level===item.id?"active":""}`} aria-pressed={level===item.id} onClick={()=>{setLevel(item.id);setRevealed(false)}}><span>0{item.id}</span><strong>{item.label}</strong></button>)}</div>
   <div className="hint-reveal-row"><div><span className="hint-status">EVIDENCE RECOVERED · {found.length}/{gameCase.evidence.length} · LEADS {completedActions.length}/{gameCase.investigation_actions.length}</span><p>{revealed?hint:"Hint sealed. Select a strength and reveal it when you're ready."}</p></div><button className="hint-reveal-button" type="button" onClick={()=>setRevealed(true)}>{revealed?"HINT REVEALED":"REVEAL HINT"}</button></div>
   <p className="hint-disclaimer">Hints are guidance only. They do not change your score or contact the server.</p>
  </div></section>;
}
