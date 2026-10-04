"use client";
import {useEffect,useState} from "react";
import {ResumeWorkspace} from "@/components/resume/ResumeWorkspace";
import {ResumeData} from "@/lib/resume/types";
type Item={id:string;title:string;updatedAt:string;data:ResumeData};
export default function ResumeBuilderPage(){
 const [items,setItems]=useState<Item[]>([]);const [selected,setSelected]=useState("");const [error,setError]=useState("");const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);
 async function load(){try{const r=await fetch("/api/resumes");const j=await r.json();if(!r.ok)throw new Error(j.error);setItems(j.resumes);setSelected(new URLSearchParams(window.location.search).get("resumeId") || j.resumes[0]?.id || "");}catch(e){setError(e instanceof Error?e.message:"Unable to load resumes.");}finally{setLoading(false);}}
 useEffect(()=>{load();},[]);
 async function create(duplicate=false){setBusy(true);try{const r=await fetch("/api/resumes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:duplicate?"duplicate":"create",sourceResumeId:duplicate?selected:undefined})});const j=await r.json();if(!r.ok)throw new Error(j.error);setItems(v=>[j.resume,...v]);setSelected(j.resume.id);setError("");}catch(e){setError(e instanceof Error?e.message:"Unable to create resume.");}finally{setBusy(false);}}
 const item=items.find(r=>r.id===selected);
 return <div className="space-y-4"><div className="p-4 bg-white border rounded-xl flex gap-4 flex-wrap"><label>Resume <select className="border rounded p-2" value={selected} onChange={async e=>{const id=e.target.value;try{const r=await fetch("/api/resumes");const j=await r.json();if(!r.ok)throw new Error(j.error);setItems(j.resumes);setSelected(id);history.replaceState(null,"",`/resume?resumeId=${id}`);}catch(e){setError(e instanceof Error?e.message:"Could not load resume.");}}}>{items.map(r=><option key={r.id} value={r.id}>{r.title} ({new Date(r.updatedAt).toLocaleDateString()})</option>)}</select></label><button disabled={busy} className="underline" onClick={()=>create()}>New resume</button><button disabled={busy || !item} className="underline" onClick={()=>create(true)}>Duplicate selected resume</button></div>{error && <p role="alert">{error} <button className="underline" onClick={load}>Retry</button></p>}{loading?<p>Loading resumes…</p>:item?<ResumeWorkspace key={item.id} initialResume={{...item.data,id:item.id,updatedAt:item.updatedAt}}/>:<p>Create a resume to start preparing. Your profile will fill in the details you have supplied.</p>}</div>;
}
