"use client";
import {useCallback,useEffect,useState} from "react";
interface Membership {institute:{id:string;name:string;verificationStatus:string;acceptedAt:string|null}|null;updatedAt:string;mentorConsent:boolean;instituteAnalyticsConsent:boolean}
export function InstituteMembership() {
  const [membership,setMembership]=useState<Membership|null>(null),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false);
  const load=useCallback(async()=>{const res=await fetch("/api/candidate/membership",{cache:"no-store"});const result=await res.json();if(!res.ok)throw new Error(result.error || "Could not load institute membership.");setMembership(result);},[]);
  useEffect(()=>{const refresh=()=>load().catch(error=>setNotice(error.message));refresh();window.addEventListener("institute-membership-changed",refresh);window.addEventListener("candidate-profile-changed",refresh);return()=>{window.removeEventListener("institute-membership-changed",refresh);window.removeEventListener("candidate-profile-changed",refresh);};},[load]);
  async function leave() {
    if (!membership?.institute) return;
    setBusy(true);setNotice("");
    try {const res=await fetch("/api/candidate/membership",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({confirm:true,instituteId:membership.institute.id,expectedUpdatedAt:membership.updatedAt})});const result=await res.json();if(!res.ok)throw new Error(result.error);setConfirm(false);await load();setNotice("You left the institute. Sharing is off and active institute reviews are revoked.");window.dispatchEvent(new Event("institute-membership-changed"));}
    catch(error){setNotice(error instanceof Error ? error.message : "Could not leave the institute.");}finally{setBusy(false);}
  }
  return <section className="border rounded-xl p-4 space-y-3"><h2 className="font-bold text-lg">Institute membership</h2><p role="status" className="text-sm">{notice}</p>
    {!membership ? <p>Loading membership…</p> : membership.institute ? <>
      <p className="font-semibold">{membership.institute.name} · {membership.institute.verificationStatus}</p>
      {membership.institute.acceptedAt && <p className="text-sm">Invitation accepted {new Date(membership.institute.acceptedAt).toLocaleDateString()}</p>}
      <p className="text-sm">Mentor access: {membership.mentorConsent ? "On" : "Off"}. Analytics sharing: {membership.instituteAnalyticsConsent ? "On" : "Off"}.</p>
      <p className="text-sm">Use the sharing controls below to change access. Save changes, then refresh membership to see the saved state.</p>
      <div className="flex gap-4"><button disabled={busy} onClick={()=>load().catch(error=>setNotice(error.message))} className="underline text-sm">Refresh membership</button><button disabled={busy} onClick={()=>setConfirm(true)} className="underline text-sm">Leave institute</button></div>
      {confirm && <div className="border rounded-lg p-3 space-y-3 text-sm"><p>Leave {membership.institute.name}? Mentor access and analytics sharing will turn off, and active resume reviews will be revoked. Your resumes, applications and academic details remain. To join again or transfer, accept a new invitation.</p><button disabled={busy} onClick={leave} className="bg-neutral-950 text-white rounded-lg px-3 py-2">Confirm leaving institute</button><button disabled={busy} onClick={()=>setConfirm(false)} className="underline ml-4">Keep membership</button></div>}
    </> : <p className="text-sm">You have not joined an institute. Ask your placement office for an invitation, then accept it below. Joining does not enable sharing automatically.</p>}
  </section>;
}
