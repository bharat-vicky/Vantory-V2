"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PlusCircle, Briefcase, RefreshCw, Eye, Pencil, Sparkles, X } from "lucide-react";
import { CreateJobModal } from "@/components/company/CreateJobModal";
import { EditJobModal } from "@/components/company/EditJobModal";

interface CompanyJobItem {
  id: string;
  title: string;
  company: string;
  location: string;
  workMode: string;
  type: string;
  experience: string;
  salary?: string;
  status: string;
  postedAt: string;
  expiresAt: string | null;
  displayStatus: string;
  updatedAt: string;
  applicationsCount: number;
}

export default function CompanyJobsPage() {
  const [jobs, setJobs] = useState<CompanyJobItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreateJobOpen, setIsCreateJobOpen] = useState<boolean>(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [topBannerMsg, setTopBannerMsg] = useState<string>("");

  const [error,setError]=useState("");
  const [busyJob,setBusyJob]=useState<string|null>(null);
  const loadJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/company/jobs");
      const json=await res.json();
      if(!res.ok || !json.success) throw new Error(json.error || "Unable to load openings.");
      setJobs(json.jobs); setError("");
    } catch(e) {setError(e instanceof Error?e.message:"Unable to load openings.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
    window.addEventListener("job-created", loadJobs);
    return () => {
      window.removeEventListener("job-created", loadJobs);
    };
  }, [loadJobs]);

  const handleJobUpdated = (msg?: string) => {
    loadJobs();
    if (msg) {
      setTopBannerMsg(msg);
      setTimeout(() => {
        setTopBannerMsg("");
      }, 6000);
    }
  };

  const handleToggleJobStatus = async (job:CompanyJobItem) => {
    if (busyJob) return;
    if(job.status!=="ACTIVE"){setEditingJobId(job.id);return;}
    setBusyJob(job.id);setError("");
    try {
      const res=await fetch(`/api/company/jobs/${job.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"CLOSED",expectedUpdatedAt:job.updatedAt})});
      const json=await res.json();if(!res.ok || !json.success)throw new Error(json.error || "Unable to close opening.");
      await loadJobs();
    }catch(e){setError(e instanceof Error?e.message:"Unable to close opening.");}finally{setBusyJob(null);}
  };
  const cloneJob=async(job:CompanyJobItem)=>{
    if(busyJob)return;setBusyJob(job.id);setError("");
    try{
      const res=await fetch(`/api/company/jobs/${job.id}/clone`,{method:"POST"});const json=await res.json();
      if(!res.ok || !json.success)throw new Error(json.error || "Unable to clone opening.");
      await loadJobs();setEditingJobId(json.job.id);setTopBannerMsg("Cloned as a private draft. Review details and choose a new deadline before publishing.");
    }catch(e){setError(e instanceof Error?e.message:"Unable to clone opening.");}finally{setBusyJob(null);}
  };

  return (
    <div className="space-y-6 selection:bg-neutral-950 selection:text-white font-sans relative">
      {/* TOP-UP SUCCESS BANNER */}
      {topBannerMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[90%] bg-neutral-950 text-white p-4 rounded-2xl shadow-2xl border border-neutral-800 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Marketplace Action Complete</h4>
              </div>
              <p className="text-xs text-neutral-300 mt-1 leading-relaxed font-medium">{topBannerMsg}</p>
            </div>
          </div>
          <button
            onClick={() => setTopBannerMsg("")}
            className="text-neutral-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-neutral-800 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-950 tracking-tight">Corporate Openings Management</h1>
          <p className="text-xs text-neutral-500 font-mono">Create, publish, inspect, and manage engineering job listings</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadJobs()}
            className="px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs font-mono text-neutral-700 hover:bg-neutral-50 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsCreateJobOpen(true)}
            className="px-4 py-2.5 bg-neutral-950 text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-md cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>Post New Job</span>
          </button>
        </div>
      </div>

      {error && <p role="alert" className="border border-red-200 bg-red-50 p-4 rounded-xl">{error}</p>}
      {/* Content Area */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-neutral-100 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-12 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto">
            <Briefcase className="w-7 h-7 text-neutral-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-neutral-950">No corporate job postings created yet</h3>
            <p className="text-xs text-neutral-500">
              Publish engineering openings for candidates to discover on Vantory marketplace.
            </p>
          </div>
          <button
            onClick={() => setIsCreateJobOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-950 text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-all shadow-md cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>Post Your First Job</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-neutral-300 transition-all"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-base font-bold text-neutral-950">
                    <Link href={`/company/jobs/${job.id}`} className="hover:underline">
                      {job.title}
                    </Link>
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      job.status === "ACTIVE"
                        ? "bg-neutral-950 text-white"
                        : "bg-neutral-100 text-neutral-500 border border-neutral-200"
                    }`}
                  >
                    {job.displayStatus}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 text-xs font-mono text-neutral-500">
                  <span>{job.location}</span>
                  <span>•</span>
                  <span>{job.workMode}</span>
                  <span>•</span>
                  <span>{job.type}</span>
                  <span>•</span>
                  <span className="text-neutral-950 font-bold">{job.salary || "Competitive"}</span>
                </div>

                <div className="text-[11px] font-mono text-neutral-400">
                  {job.status === "DRAFT" ? "Created draft" : "Published"} {new Date(job.postedAt).toLocaleDateString()} • {job.applicationsCount} Applications Received
                  {job.expiresAt && <div>Deadline: {new Date(job.expiresAt).toLocaleString()}</div>}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-200">
                <Link
                  href={`/company/jobs/${job.id}`}
                  className="px-3.5 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-bold text-neutral-950 hover:bg-neutral-50 transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Listing</span>
                </Link>

                <button disabled={Boolean(busyJob)} onClick={()=>cloneJob(job)} className="border rounded-xl px-3 py-2 text-xs">Clone as draft</button>
                <button
                  onClick={() => setEditingJobId(job.id)}
                  className="px-3.5 py-2 bg-neutral-950 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Pencil className="w-3.5 h-3.5 text-white" />
                  <span>Edit Opening</span>
                </button>

                <button
                  disabled={Boolean(busyJob)} onClick={() => handleToggleJobStatus(job)}
                  className="px-3.5 py-2 bg-neutral-100 border border-neutral-300 rounded-xl text-xs font-bold text-neutral-800 hover:bg-neutral-200 transition-all cursor-pointer"
                >
                  {job.status === "ACTIVE" ? "Close Job" : job.status === "DRAFT" ? "Review draft" : "Review & reopen"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE JOB MODAL */}
      <CreateJobModal
        isOpen={isCreateJobOpen}
        onClose={() => setIsCreateJobOpen(false)}
        onJobCreated={() => loadJobs()}
      />

      {/* EDIT & REPUBLISH JOB MODAL */}
      <EditJobModal
        jobId={editingJobId}
        isOpen={Boolean(editingJobId)}
        onClose={() => setEditingJobId(null)}
        onJobUpdated={handleJobUpdated}
      />
    </div>
  );
}
