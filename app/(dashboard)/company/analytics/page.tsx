"use client";
import {useEffect,useState,useCallback} from "react";
import Link from "next/link";
import type {getHiringAnalytics} from "@/lib/company/hiring-analytics";
type Analytics=Awaited<ReturnType<typeof getHiringAnalytics>>;
export default function CompanyAnalyticsPage(){
 const [data,setData]=useState<Analytics|null>(null),[jobId,setJobId]=useState("ALL"),[from,setFrom]=useState(""),[to,setTo]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const load=useCallback(async(scope:{jobId:string;from:string;to:string})=>{setBusy(true);setError("");try{const query=new URLSearchParams(scope);const r=await fetch("/api/company/analytics?"+query,{cache:"no-store"}),j=await r.json();if(!r.ok)throw new Error(j.error || "Could not load analytics.");setData(j.analytics);}catch(e){setError(e instanceof Error?e.message:"Could not load analytics.");}finally{setBusy(false);}},[]);
 useEffect(()=>{load({jobId:"ALL",from:"",to:""});},[load]);
 const cls="border rounded-lg px-3 py-2 disabled:opacity-50";
 const stageTable=(rows:Analytics["currentStages"])=><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr><th className="py-2">Stage</th><th>Applications</th><th>Share of received applications</th></tr></thead><tbody>{rows.map(r=><tr key={r.status} className="border-t"><th scope="row" className="py-2 font-normal">{r.label}</th><td>{r.count}</td><td>{r.share===null?"—":r.share+"%"}</td></tr>)}</tbody></table></div>;
 return <div className="max-w-6xl space-y-6">
  <header><h1 className="text-2xl font-bold">Hiring analytics</h1><p className="mt-2 text-sm">Compare your current application stages with the stages recorded in application history.</p></header>
  <section className="bg-white border rounded-2xl p-5 space-y-3">
   <div className="flex flex-wrap gap-4 items-end">
    <label className="text-sm">Analytics opening<select className="block border rounded p-2 mt-1" disabled={busy} value={jobId} onChange={e=>setJobId(e.target.value)}><option value="ALL">All openings</option>{data?.jobs.map(j=><option value={j.id} key={j.id}>{j.title}</option>)}</select></label>
    <label className="text-sm">Applications received from<input className="block border rounded p-2 mt-1" type="date" disabled={busy} value={from} onChange={e=>setFrom(e.target.value)}/></label>
    <label className="text-sm">Applications received through<input className="block border rounded p-2 mt-1" type="date" disabled={busy} value={to} onChange={e=>setTo(e.target.value)}/></label>
    <button className={cls} disabled={busy || !!(from && to && from>to)} onClick={()=>load({jobId,from,to})}>{busy?"Loading…":"Apply analytics filters"}</button>
   </div>
   <p className="text-xs text-neutral-600">Dates include whole UTC days and select applications by submission date. Later stage changes for those applications remain included.</p>
   {from && to && from>to && <p role="alert">The start date must be on or before the end date.</p>}
   {error && <p role="alert">{error}</p>}
  </section>
  {data && <>
   <section aria-label="Analytics scope" className="bg-white border rounded-2xl p-5 space-y-2"><h2 className="font-bold">{data.totalApplications} applications received</h2><p className="text-sm">Showing {data.scope.jobId==="ALL"?"all openings":data.jobs.find(j=>j.id===data.scope.jobId)?.title} · {data.scope.from || "All earlier dates"} through {data.scope.to || "now"} (UTC submission dates)</p><p className="text-xs text-neutral-600">Updated {new Date(data.generatedAt).toLocaleString()}. Offers and selections are recorded application stages; they do not confirm accepted offers or actual hires.</p></section>
   <section className="bg-white border rounded-2xl p-5 space-y-3"><h2 className="font-bold text-lg">Current stage distribution</h2><p className="text-sm">Each application occupies one current stage. Percentages use all applications received in the selected scope.</p>{stageTable(data.currentStages)}{data.unknownStatusCount>0 && <p>{data.unknownStatusCount} legacy applications have an unrecognized current stage.</p>}</section>
   <section className="bg-white border rounded-2xl p-5 space-y-3"><h2 className="font-bold text-lg">Recorded stage reach</h2><p className="text-sm">Applications recorded in a stage at least once, using history and current state. One application can appear in several rows. These are observed counts, not a sequential conversion funnel.</p>{stageTable(data.recordedStages)}<p className="text-xs text-neutral-600">{data.historyCoverage.withTimeline} applications have readable stage history; {data.historyCoverage.withoutTimeline} have none. Incomplete history can undercount earlier stages. Every received application counts as Applied.</p></section>
   <section className="bg-white border rounded-2xl p-5 space-y-3"><h2 className="font-bold text-lg">By opening</h2><p className="text-xs text-neutral-600">Active pipeline includes Applied, Under review, Shortlisted, Interview and Selected. Current offers and withdrawals are shown separately.</p><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr><th>Opening</th><th>Status</th><th>Received</th><th>Active pipeline</th><th>Current offers</th><th>Withdrawn</th></tr></thead><tbody>{data.perOpening.map(j=><tr key={j.id} className="border-t"><th scope="row" className="py-3 font-normal"><Link className="underline" href={"/company/jobs/"+j.id}>{j.title}</Link></th><td>{j.status}</td><td>{j.totalApplications}</td><td>{j.activePipeline}</td><td>{j.offers}</td><td>{j.withdrawn}</td></tr>)}</tbody></table></div></section>
   {data.totalApplications===0 && <p>No applications match this scope. Percentages are unavailable until an application is received.</p>}
  </>}
 </div>;
}
