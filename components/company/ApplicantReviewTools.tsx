"use client";
import {useEffect,useState} from "react";
import {emptyEvaluation,type ApplicantEvaluation} from "@/lib/company/applicant-tools-types";

export function ApplicantReviewTools({id,status,updatedAt,evaluation,disabled,onSaved,onDirtyChange,onBusyChange}:{id:string;status:string;updatedAt:string;evaluation:ApplicantEvaluation;disabled:boolean;onSaved:(result:{updatedAt:string;evaluation?:ApplicantEvaluation})=>void;onDirtyChange:(dirty:boolean)=>void;onBusyChange:(busy:boolean)=>void}) {
  const [draft,setDraft]=useState(evaluation || emptyEvaluation),[message,setMessage]=useState(""),[confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const dirty=JSON.stringify(draft)!==JSON.stringify(evaluation || emptyEvaluation);
  useEffect(()=>{onDirtyChange(dirty || !!message.trim());},[dirty,message,onDirtyChange]);
  const change=(key:keyof ApplicantEvaluation,value:string)=>{setDraft(p=>({...p,[key]:value}));setNotice("");};
  async function save(action:"evaluation"|"candidateUpdate") {
    setBusy(true);onBusyChange(true);setError("");setNotice("");
    try {
      const response=await fetch(`/api/company/applications/${id}/review`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,expectedUpdatedAt:updatedAt,...(action==="evaluation" ? {evaluation:draft} : {message})})});
      const result=await response.json();if(!response.ok || !result.success)throw new Error(result.error || "Could not save this update.");
      onSaved({updatedAt:result.updatedAt,...(action==="evaluation" ? {evaluation:result.evaluation} : {})});
      if(action==="evaluation")setDraft(result.evaluation);
      if(action==="candidateUpdate"){setMessage("");setConfirm(false);setNotice("Update published to the candidate's application timeline. No email was sent.");}else setNotice("Private evaluation saved. Application status is unchanged.");
    }catch(e){setError(e instanceof Error ? e.message : "Could not save this update.");}finally{setBusy(false);onBusyChange(false);}
  }
  const blocked=disabled || busy;
  return <section className="space-y-6" aria-label="Evaluation and candidate updates">
    <fieldset disabled={blocked} className="border p-4 rounded-xl space-y-3">
      <legend className="font-bold">Private evaluation</legend>
      <p>Only your hiring account can view this evaluation. Recommendations and outcomes do not change the application status or interview schedule.</p>
      {([['strengths','Evidence and strengths'],['concerns','Concerns and gaps'],['nextStep','Next hiring step']] as const).map(([key,label])=><label className="block" key={key}>{label}<textarea className="block w-full border rounded p-2" rows={2} maxLength={2000} value={draft[key]} onChange={e=>change(key,e.target.value)}/></label>)}
      <label className="block">Private recommendation<select className="block border rounded p-2" value={draft.recommendation} onChange={e=>change('recommendation',e.target.value)}><option value="UNDECIDED">Undecided</option><option value="PROCEED">Proceed</option><option value="HOLD">Hold</option><option value="DO_NOT_PROCEED">Do not proceed</option></select></label>
      <label className="block">Recorded interview outcome<select className="block border rounded p-2" value={draft.interviewOutcome} onChange={e=>change('interviewOutcome',e.target.value)}><option value="NOT_RECORDED">Not recorded</option><option value="COMPLETED">Completed</option><option value="NO_SHOW">No show</option><option value="CANCELLED">Cancelled</option></select></label>
      <button type="button" disabled={blocked || !dirty} onClick={()=>save('evaluation')} className="bg-neutral-950 text-white rounded px-3 py-2 disabled:opacity-40">Save private evaluation</button>
      <p role="status">{dirty ? 'Unsaved evaluation' : 'Evaluation saved'}</p>
    </fieldset>
    <fieldset disabled={blocked || status==='WITHDRAWN'} className="border p-4 rounded-xl space-y-3">
      <legend className="font-bold">Candidate-visible update</legend>
      <p>This message appears in the application timeline for the candidate. Keep private hiring notes in the evaluation above. No email is sent.</p>
      {status==='WITHDRAWN' && <p>The candidate withdrew; further updates are unavailable.</p>}
      <label className="block">Update for candidate<textarea className="block w-full border rounded p-2" rows={3} maxLength={2000} value={message} onChange={e=>{setMessage(e.target.value);setConfirm(false);setNotice('');}}/></label>
      <button type="button" disabled={blocked || !message.trim() || dirty} onClick={()=>setConfirm(true)} className="border rounded px-3 py-2 disabled:opacity-40">Preview candidate update</button>
      {dirty && <p>Save your private evaluation before publishing an update.</p>}
      {confirm && <div role="group" aria-label="Confirm candidate update" className="border p-3 rounded space-y-2"><p>Publish this message to the application history for this candidate?</p><p className="whitespace-pre-wrap">{message.trim()}</p><button type="button" disabled={blocked} onClick={()=>save('candidateUpdate')} className="bg-neutral-950 text-white rounded px-3 py-2">Publish candidate update</button><button type="button" disabled={blocked} onClick={()=>setConfirm(false)} className="border rounded px-3 py-2 ml-2">Keep editing</button></div>}
    </fieldset>
    {error && <p role="alert">{error}</p>}<p role="status">{notice}</p>
  </section>;
}
