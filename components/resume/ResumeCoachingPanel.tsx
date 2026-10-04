"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import type {ResumeData} from "@/lib/resume/types";
import type {BulletAnchor} from "@/lib/resume/coaching";
import {assessBullet} from "@/lib/resume/bullet-feedback";
import {visibleResume} from "@/lib/resume/visible-content";
type Change={id:string;beforeText:string;afterText:string;createdAt:string;checks:{before:ReturnType<typeof assessBullet>;after:ReturnType<typeof assessBullet>}};
export function ResumeCoachingPanel({data,busy,onApply}:{data:ResumeData;busy:boolean;onApply:(anchor:BulletAnchor,before:string,after:string)=>Promise<void>}){
  const [selected,setSelected]=useState<{anchor:BulletAnchor;text:string}|null>(null);
  const [draft,setDraft]=useState("");const [confirmed,setConfirmed]=useState(false);const [notice,setNotice]=useState("");const [changes,setChanges]=useState<Change[]>([]);
  const visible=visibleResume(data);
  const bullets=(["experience","projects"] as const).flatMap(section=>visible[section].flatMap(item=>item.bullets.map((text,bulletIndex)=>({anchor:{section,itemId:item.id,bulletIndex},text,title:section==="experience"?("role" in item?item.role:""):("title" in item?item.title:""),feedback:assessBullet(text)}))));
  const load=useCallback(async()=>{if(!data.id)return;const r=await fetch(`/api/candidate/resume-coaching?resumeId=${data.id}`);const j=await r.json();if(!r.ok)throw new Error(j.error);setChanges(j.changes);},[data.id]);
  useEffect(()=>{load().catch(e=>setNotice(e.message));},[load]);
  const active=selected?bullets.find(b=>b.anchor.section===selected.anchor.section && b.anchor.itemId===selected.anchor.itemId && b.anchor.bulletIndex===selected.anchor.bulletIndex):null;
  const stale=!!selected && active?.text!==selected.text;
  const preview=draft.trim()?assessBullet(draft):null;
  return <section className="bg-white border rounded-2xl p-5 space-y-4" aria-labelledby="resume-coaching-title">
    <div><h2 id="resume-coaching-title" className="font-bold text-lg">Improve your project and experience bullets</h2><p className="text-sm text-neutral-600 mt-1">Review your contribution, scope, approach and checks. These are writing checks; a strong result does not verify your skills or achievements.</p></div>
    {!bullets.length && <p className="text-sm">Add a real project or experience to receive specific feedback. Coursework is welcome.</p>}
    <div className="grid sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto">{bullets.map(b=><button disabled={busy} key={`${b.anchor.section}-${b.anchor.itemId}-${b.anchor.bulletIndex}`} className="text-left border rounded-xl p-3 hover:border-neutral-700 disabled:opacity-50" onClick={()=>{setSelected({anchor:b.anchor,text:b.text});setDraft(b.text);setConfirmed(false);setNotice("");}}><span className="text-xs text-neutral-500">{b.title} · {b.feedback.verdict.toLowerCase()}</span><p className="text-sm mt-1">{b.text}</p><p className="text-xs mt-2 text-neutral-600">{b.feedback.issues[0] || "Review the accuracy of your claims."}</p></button>)}</div>
    {selected && <fieldset disabled={busy} className="space-y-3 border-t pt-4"><legend className="font-semibold">Revise selected bullet</legend><p className="text-sm"><strong>Original:</strong> {selected.text}</p><ul className="text-sm list-disc pl-5">{assessBullet(selected.text).issues.map(issue=><li key={issue}>{issue}</li>)}</ul><label className="block text-sm">Your factual revision<textarea className="block w-full border rounded-lg p-3 mt-1" rows={4} maxLength={1500} value={draft} onChange={e=>{setDraft(e.target.value);setConfirmed(false);}}/></label>{preview && <p className="text-sm">Current checks: {preview.verdict.toLowerCase()}. {preview.suggestion}</p>}<label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>This accurately describes my own work, tools and result.</label>{stale && <p role="alert" className="text-amber-800 text-sm">The original bullet changed while you were editing. Select it again to review the latest text.</p>}<button disabled={busy || stale || !confirmed || !draft.trim() || draft.trim()===selected.text} className="bg-neutral-950 text-white px-4 py-2 rounded-lg disabled:opacity-40" onClick={async()=>{try{setNotice("");await onApply(selected.anchor,selected.text,draft);setSelected(null);setConfirmed(false);await load();setNotice("Revision saved and writing checks updated. Rescan against your job to refresh the match report.");}catch(e){setNotice(e instanceof Error?e.message:"Could not apply the revision. Your proposed text is preserved.");}}}>{busy?"Saving revision…":"Save revision and check again"}</button></fieldset>}
    <p role="status" className="text-sm">{notice}</p>
    {!!changes.length && <details><summary className="cursor-pointer text-sm font-semibold">Recent saved revisions</summary><div className="space-y-3 mt-3">{changes.slice(0,8).map(c=><div key={c.id} className="border rounded-lg p-3 text-sm"><p className="text-xs text-neutral-500">{new Date(c.createdAt).toLocaleString()}</p><p className="mt-1">Before: {c.beforeText}</p><p className="mt-1">After: {c.afterText}</p><p className="mt-2 text-neutral-600">Writing checks: {c.checks.before.verdict.toLowerCase()} → {c.checks.after.verdict.toLowerCase()}. Claims remain candidate supplied.</p></div>)}</div></details>}
    <Link href={`/ats-checker?resumeId=${data.id || ""}`} className="text-sm underline">Reassess against a target job</Link>
  </section>;
}
