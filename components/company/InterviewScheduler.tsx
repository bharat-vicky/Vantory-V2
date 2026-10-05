"use client";
import {useState} from "react";
import {localInterviewTime,type InterviewSchedule} from "@/lib/jobs/interview-schedule";
import {InterviewDetails} from "@/components/jobs/InterviewDetails";
export function InterviewScheduler({applicationId,status,updatedAt,interview,disabled,onSaved}:{applicationId:string;status:string;updatedAt:string;interview:InterviewSchedule|null;disabled:boolean;onSaved:(result:{status:string;updatedAt:string;interview:InterviewSchedule|null})=>void}) {
  const [timeZone,setTimeZone]=useState(interview?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [localDateTime,setDateTime]=useState(interview ? localInterviewTime(interview.startsAt,timeZone) : "");
  const [durationMinutes,setDuration]=useState(interview?.durationMinutes || 30);
  const [mode,setMode]=useState(interview?.mode || "ONLINE");
  const [joiningDetails,setJoiningDetails]=useState(interview?.joiningDetails || ""),[interviewer,setInterviewer]=useState(interview?.interviewer || ""),[message,setMessage]=useState(interview?.message || "");
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState("");
  const [confirmCancel,setConfirmCancel]=useState(false);
  const allowed=["SHORTLISTED","INTERVIEW"].includes(status);
  async function save(action:"schedule"|"cancel") {
    setBusy(true);setNotice("");
    try {
      const res=await fetch(`/api/company/applications/${applicationId}/interview`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,expectedUpdatedAt:updatedAt,interview:{localDateTime,timeZone,durationMinutes,mode,joiningDetails,interviewer,message}})});
      const result=await res.json();if (!res.ok || !result.success) throw new Error(result.error || "Could not update the interview.");
      onSaved(result);setConfirmCancel(false);setNotice(action === "cancel" ? "Interview cancelled. Candidate tracking has been updated." : "Interview saved. Candidate tracking has been updated.");
    } catch (error) {setNotice(error instanceof Error ? error.message : "Could not update the interview.");} finally {setBusy(false);}
  }
  return <section className="space-y-3 border-t pt-4"><h3 className="font-bold text-sm">Interview scheduling</h3>
    <InterviewDetails interview={interview} applicationId={applicationId}/><p role="status" className="text-sm">{notice}</p>
    {allowed ? <fieldset disabled={busy || disabled} className="space-y-3 text-sm"><p>These details are visible to the candidate. Save private notes separately.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <label>Interview date and time<input required type="datetime-local" value={localDateTime} onChange={e=>setDateTime(e.target.value)} className="block w-full border rounded-lg p-2"/></label>
        <label>Time zone<input required value={timeZone} onChange={e=>setTimeZone(e.target.value)} placeholder="Asia/Kolkata" list="interview-time-zones" className="block w-full border rounded-lg p-2"/><datalist id="interview-time-zones">{["Asia/Kolkata","UTC","Europe/London","America/New_York","America/Los_Angeles","Asia/Singapore"].map(zone=><option key={zone} value={zone}/>)}</datalist></label>
        <label>Duration (minutes)<input type="number" min={15} max={240} value={durationMinutes} onChange={e=>setDuration(Number(e.target.value))} className="block w-full border rounded-lg p-2"/></label>
        <label>Format<select value={mode} onChange={e=>{setMode(e.target.value as InterviewSchedule["mode"]);setJoiningDetails("");}} className="block w-full border rounded-lg p-2"><option value="ONLINE">Online</option><option value="ONSITE">In person</option><option value="PHONE">Phone</option></select></label>
      </div>
      <label className="block">{mode === "ONLINE" ? "HTTPS meeting link" : mode === "ONSITE" ? "Interview location" : "Phone instructions"}<input maxLength={500} type={mode === "ONLINE" ? "url" : "text"} value={joiningDetails} onChange={e=>setJoiningDetails(e.target.value)} className="block w-full border rounded-lg p-2"/></label>
      <label className="block">Interviewer (optional)<input maxLength={150} value={interviewer} onChange={e=>setInterviewer(e.target.value)} className="block w-full border rounded-lg p-2"/></label>
      <label className="block">Message to candidate (optional)<textarea maxLength={2000} rows={3} value={message} onChange={e=>setMessage(e.target.value)} className="block w-full border rounded-lg p-2"/></label>
      <div className="flex flex-wrap gap-3"><button type="button" onClick={()=>save("schedule")} className="bg-neutral-950 text-white rounded-lg px-3 py-2">{busy ? "Saving…" : interview?.state === "SCHEDULED" ? "Reschedule interview" : "Schedule interview"}</button>
        {interview?.state === "SCHEDULED" && <button type="button" onClick={()=>setConfirmCancel(true)} className="border rounded-lg px-3 py-2">Cancel interview</button>}
      </div>
      {confirmCancel && <div className="border rounded-lg p-3 space-y-3" role="group" aria-label="Confirm interview cancellation"><p>Cancel this interview? The candidate will see the cancellation.</p><div className="flex gap-3"><button type="button" onClick={()=>save("cancel")} className="bg-neutral-950 text-white rounded-lg px-3 py-2">Confirm cancellation</button><button type="button" onClick={()=>setConfirmCancel(false)} className="border rounded-lg px-3 py-2">Keep interview</button></div></div>}
    </fieldset> : !interview && <p className="text-sm text-neutral-500">Shortlist the candidate before scheduling an interview.</p>}
  </section>;
}
