"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {Sidebar} from "@/components/shell/sidebar";
import {Header} from "@/components/shell/header";
interface Invitation {id:string;name:string;email:string;status:string;expiresAt:string;updatedAt:string}
export default function InstituteInvitationsPage() {
  const [rows,setRows]=useState<Invitation[]>([]),[status,setStatus]=useState("ALL"),[search,setSearch]=useState(""),[query,setQuery]=useState(""),[page,setPage]=useState(1),[total,setTotal]=useState(0),[notice,setNotice]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const load=useCallback(async()=>{setLoading(true);try {const params=new URLSearchParams({status,search:query,page:String(page)});const res=await fetch(`/api/institute/invitations?${params}`,{cache:"no-store"});const result=await res.json();if(!res.ok)throw new Error(result.error || "Could not load invitations.");setRows(result.invitations);setTotal(result.total);} finally {setLoading(false);}},[status,query,page]);
  useEffect(()=>{load().catch(error=>{setRows([]);setNotice(error.message);});},[load]);
  async function change(row:Invitation,action:"renew"|"revoke") {
    if(!window.confirm(action === "renew" ? `Renew ${row.email}'s invitation for 30 days? No email will be sent automatically.` : `Revoke ${row.email}'s pending invitation? They will no longer be able to accept it.`))return;
    setBusy(true);setNotice("");
    try {const res=await fetch("/api/institute/invitations",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:row.id,action,expectedUpdatedAt:row.updatedAt})});const result=await res.json();if(!res.ok)throw new Error(result.error || "Could not update invitation.");await load();setNotice(action === "renew" ? "Invitation renewed for 30 days. No email was sent." : "Invitation revoked.");}
    catch(error){setNotice(error instanceof Error ? error.message : "Could not update invitation.");}finally{setBusy(false);}
  }
  return <div className="flex h-screen bg-neutral-50 overflow-hidden"><Sidebar/><div className="flex-1 min-w-0 overflow-y-auto" data-lenis-prevent="true"><Header/><main className="p-6 sm:p-10 max-w-7xl mx-auto space-y-6">
    <div className="flex flex-wrap justify-between gap-4"><div><h1 className="text-2xl font-bold">Student invitations</h1><p className="text-sm text-neutral-600 mt-2">Track acceptance, expiry and revoked invitations. Renewal makes an invitation available in the candidate&apos;s Profile; it does not send email or change sharing consent.</p></div><Link className="underline" href="/institute/students/import">Invite students with CSV</Link></div>
    <p role="status" className="text-sm">{notice}</p>
    <form className="flex flex-wrap gap-3" onSubmit={e=>{e.preventDefault();setPage(1);setQuery(search);}}>
      <label>Search name or email<input maxLength={150} value={search} onChange={e=>setSearch(e.target.value)} className="block border rounded-lg p-2"/></label>
      <label>Invitation status<select value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}} className="block border rounded-lg p-2">{["ALL","PENDING","EXPIRED","ACCEPTED","DECLINED","REVOKED","LEFT"].map(value=><option key={value} value={value}>{value === "ALL" ? "All statuses" : value}</option>)}</select></label>
      <button disabled={busy || loading} className="border rounded-lg px-4 self-end py-2">Search invitations</button><button type="button" disabled={busy || loading} onClick={()=>load().catch(error=>setNotice(error.message))} className="underline self-end py-2">Refresh invitations</button>
    </form>
    {loading ? <p>Loading invitations…</p> : <><p className="text-sm">{total} invitations matching these filters</p><div className="overflow-x-auto bg-white border rounded-xl"><table className="w-full text-left text-sm"><thead><tr>{["Student","Status","Expires","Actions"].map(text=><th className="p-4" key={text}>{text}</th>)}</tr></thead><tbody>
      {rows.map(row=><tr key={row.id} className="border-t"><td className="p-4"><strong>{row.name}</strong><p>{row.email}</p></td><td className="p-4">{row.status}</td><td className="p-4">{new Date(row.expiresAt).toLocaleString()}</td><td className="p-4 space-x-3">{row.status !== "ACCEPTED" && <button disabled={busy} onClick={()=>change(row,"renew")} className="underline">Renew for 30 days</button>}{["PENDING","EXPIRED"].includes(row.status) && <button disabled={busy} onClick={()=>change(row,"revoke")} className="underline">Revoke invitation</button>}{row.status === "ACCEPTED" && <span>Membership accepted</span>}</td></tr>)}
      {!rows.length && <tr><td colSpan={4} className="p-6">No invitations match these filters.</td></tr>}
    </tbody></table></div><div className="flex items-center gap-4"><button disabled={busy || page === 1} onClick={()=>setPage(value=>value-1)} className="underline disabled:opacity-40">Previous page</button><span>Page {page} of {Math.max(1,Math.ceil(total/25))}</span><button disabled={busy || page*25 >= total} onClick={()=>setPage(value=>value+1)} className="underline disabled:opacity-40">Next page</button></div></>}
  </main></div></div>;
}
