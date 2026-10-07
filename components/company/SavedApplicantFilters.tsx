"use client";
import {useEffect,useState,useCallback} from "react";
import type {PipelineFilters} from "@/lib/company/pipeline-filters";
import type {SavedApplicantFilter,SavedFilterResponse} from "@/lib/company/saved-filters-types";
export function SavedApplicantFilters({filters,onApply}:{filters:PipelineFilters;onApply:(filters:PipelineFilters)=>void}){
 const [data,setData]=useState<SavedFilterResponse|null>(null),[selected,setSelected]=useState(""),[name,setName]=useState(""),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 const load=useCallback(async()=>{setBusy(true);try{const r=await fetch("/api/company/applicant-filters",{cache:"no-store"}),j=await r.json();if(!r.ok)throw new Error(j.error);setData(j);}catch(e){setNotice(e instanceof Error?e.message:"Could not load saved filters.");}finally{setBusy(false);}},[]);
 useEffect(()=>{load();},[load]);
 async function change(action:string,item?:SavedApplicantFilter){
  if(!data)return;setBusy(true);setNotice("");
  try{const r=await fetch("/api/company/applicant-filters",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,name,filters,id:item?.id,expectedRevision:data.revision})}),j=await r.json();if(!r.ok)throw new Error(j.error);setData(j);setNotice(action==="save"?"Current filters saved.":action==="archive"?"Filter archived. You can restore it below.":"Filter restored.");if(action==="save")setSelected(j.items.find((i:SavedApplicantFilter)=>!i.archivedAt && i.name.toLowerCase()===name.trim().toLowerCase())?.id || "");if(action==="archive")setSelected("");}
  catch(e){setNotice(e instanceof Error?e.message:"Could not change saved filters.");}finally{setBusy(false);}
 }
 const active=data?.items.filter(i=>!i.archivedAt) || [],archived=data?.items.filter(i=>i.archivedAt) || [],item=active.find(i=>i.id===selected);
 const cls="border rounded-lg px-3 py-2 disabled:opacity-50";
 return <section aria-label="Saved applicant filters" className="border bg-white rounded-xl p-4 space-y-3 text-sm">
  <h2 className="font-semibold">Saved applicant filters</h2><p className="text-xs text-neutral-600">Saved to your employer account. Dates follow the device time zone used when applying the filter.</p>
  <div className="flex flex-wrap items-end gap-3">
   <label>Saved filter<select className="block border rounded p-2" value={selected} disabled={busy} onChange={e=>{setSelected(e.target.value);setName(active.find(i=>i.id===e.target.value)?.name || "");}}><option value="">Choose a saved filter</option>{active.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label>
   <button className={cls} disabled={busy || !item} onClick={()=>item && onApply(item.filters)}>Apply saved filter</button>
   <label>Filter name<input className="block border rounded p-2" value={name} maxLength={60} disabled={busy} onChange={e=>setName(e.target.value)}/></label>
   <button className={cls} disabled={busy || !data || !name.trim()} onClick={()=>change("save")}>Save current filters</button>
   <button className={cls} disabled={busy || !item} onClick={()=>item && change("archive",item)}>Archive saved filter</button>
   <button className={cls} disabled={busy} onClick={load}>Reload saved filters</button>
  </div>
  <p role="status">{notice}</p>
  {archived.length>0 && <details><summary>Archived filters ({archived.length})</summary><ul className="space-y-2 mt-2">{archived.map(i=><li key={i.id} className="flex items-center gap-3"><span>{i.name}</span><button className={cls} disabled={busy} onClick={()=>change("restore",i)}>Restore {i.name}</button></li>)}</ul></details>}
 </section>;
}
