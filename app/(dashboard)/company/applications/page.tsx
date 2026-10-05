"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Users,
  Search,
  Eye,
  X,
  FileText,
  AlertCircle,
  FileCheck,
  RefreshCw,
  Download,
  Phone,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { ResumeData } from "@/lib/resume/types";
import { APPLICATION_TRANSITIONS } from "@/lib/application-state";
import { useBodyScrollLock } from "@/lib/hooks/useBodyScrollLock";

interface CompanyJobItem {
  id: string;
  title: string;
}

interface CandidateApplicationItem {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidateHeadline?: string;
  candidateAvatar?: string;
  candidateLocation?: string;
  candidateSkills?: string;
  jobId: string;
  jobTitle: string;
  appliedAt: string;
  updatedAt: string;
  status: string;
  coverNote?: string;
  employerNotes?: string;
  resume?: {
    id: string;
    title: string;
    templateId: string;
    contentJson: string;
    updatedAt: string;
  } | null;
}

export default function CompanyApplicationsPage() {
  const [applications, setApplications] = useState<CandidateApplicationItem[]>([]);
  const [jobs, setJobs] = useState<CompanyJobItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [appSearchQuery, setAppSearchQuery] = useState<string>("");
  const [appJobFilter, setAppJobFilter] = useState<string>("ALL");
  const [appStatusFilter, setAppStatusFilter] = useState<string>("ALL");

  // Selected Application Review Modal State
  const [selectedApplication, setSelectedApplication] = useState<CandidateApplicationItem | null>(null);
  const [employerNoteInput, setEmployerNoteInput] = useState<string>("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [statusUpdateError, setStatusUpdateError] = useState<string>("");
  const [topBannerMsg, setTopBannerMsg] = useState<string | null>(null);

  // Full Screen Resume Preview Modal State
  const [activeResumePreviewData, setActiveResumePreviewData] = useState<ResumeData | null>(null);
  const [activeResumeId, setActiveResumeId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [mounted, setMounted] = useState<boolean>(false);
  const notesDirty = Boolean(selectedApplication && employerNoteInput !== (selectedApplication.employerNotes || ""));
  const closeReview = useCallback(() => {
    if (!isUpdatingStatus && (!notesDirty || window.confirm("Discard unsaved private notes?"))) setSelectedApplication(null);
  }, [notesDirty, isUpdatingStatus]);
  useEffect(() => {
    if (!notesDirty) return;
    const warn = (event: BeforeUnloadEvent) => {event.preventDefault();};
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [notesDirty]);
  const saveNotes = async () => {
    if (!selectedApplication) return;
    setIsUpdatingStatus(true); setStatusUpdateError("");
    try {
      const res = await fetch(`/api/company/applications/${selectedApplication.id}`, {method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({note:employerNoteInput,expectedUpdatedAt:selectedApplication.updatedAt})});
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || "Could not save notes.");
      const saved = { ...selectedApplication, employerNotes: result.application.notes || "", updatedAt: result.application.updatedAt };
      setSelectedApplication(saved); setEmployerNoteInput(saved.employerNotes);
      setApplications(items => items.map(item => item.id === saved.id ? saved : item));
      setTopBannerMsg("Private notes saved.");
    } catch (error) {setStatusUpdateError(error instanceof Error ? error.message : "Could not save notes.");}
    finally {setIsUpdatingStatus(false);}
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background body scroll when any modal is open
  useBodyScrollLock(Boolean(selectedApplication || activeResumePreviewData));

  // Handle Escape key press for modal dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeResumePreviewData) {
          setActiveResumePreviewData(null);
          setActiveResumeId(null);
        } else if (selectedApplication) {
          closeReview();
        }
      }
    };
    if (selectedApplication || activeResumePreviewData) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedApplication, activeResumePreviewData, closeReview]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [jobsRes, appsRes] = await Promise.all([
        fetch("/api/company/jobs"),
        fetch("/api/company/applications"),
      ]);

      if (jobsRes.ok) {
        const jJson = await jobsRes.json();
        if (jJson.success && Array.isArray(jJson.jobs)) setJobs(jJson.jobs);
      }

      if (appsRes.ok) {
        const aJson = await appsRes.json();
        if (aJson.success && Array.isArray(aJson.applications)) setApplications(aJson.applications);
      }
    } catch {
      // Handle silently
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const parseResumeData = (app: CandidateApplicationItem): ResumeData | null => {
    if (app.resume?.contentJson) {
      try {
        const parsed = JSON.parse(app.resume.contentJson);
        if (parsed && typeof parsed === "object") return parsed as ResumeData;
      } catch {
        // Fallback below
      }
    }

    return null;
  };

  const handleStatusChange = async (applicationId: string, newStatus: string) => {
    setIsUpdatingStatus(true);
    setStatusUpdateError("");

    try {
      const res = await fetch(`/api/company/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          note: employerNoteInput,
          expectedUpdatedAt: selectedApplication?.updatedAt,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update application status.");
      }

      const statusLabels: Record<string, string> = {
        UNDER_REVIEW: "Under Review",
        SHORTLISTED: "Shortlisted",
        INTERVIEW: "Interviewing",
        SELECTED: "Selected",
        OFFERED: "Job Offer Extended",
        REJECTED: "Rejected",
      };

      const statusName = statusLabels[newStatus] || newStatus;
      setTopBannerMsg(`🎉 Candidate application status successfully updated to ${statusName}!`);

      if (selectedApplication && selectedApplication.id === applicationId) {
        setSelectedApplication((prev) => (prev ? { ...prev, status: newStatus, employerNotes: json.application.notes || "", updatedAt: json.application.updatedAt } : null));
        setEmployerNoteInput(json.application.notes || "");
      }

      setApplications((prev) =>
        prev.map((app) => (app.id === applicationId ? { ...app, status: newStatus, employerNotes: employerNoteInput } : app))
      );

      setTimeout(() => {
        setTopBannerMsg(null);
      }, 5000);

      await loadData();
    } catch (err: unknown) {
      setStatusUpdateError(err instanceof Error ? err.message : "Error updating status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPLIED":
        return <span className="px-2.5 py-0.5 rounded font-mono text-[10px] font-bold bg-neutral-950 text-white">APPLIED</span>;
      case "UNDER_REVIEW":
        return <span className="px-2.5 py-0.5 rounded font-mono text-[10px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-300">UNDER REVIEW</span>;
      case "SHORTLISTED":
        return <span className="px-2.5 py-0.5 rounded font-mono text-[10px] font-bold bg-neutral-950 text-white">SHORTLISTED</span>;
      case "INTERVIEW":
        return <span className="px-2.5 py-0.5 rounded font-mono text-[10px] font-bold bg-neutral-950 text-white">INTERVIEWING</span>;
      case "SELECTED":
        return <span className="px-2.5 py-0.5 rounded font-mono text-[10px] font-bold bg-neutral-950 text-white">SELECTED</span>;
      case "OFFERED":
        return <span className="px-2.5 py-0.5 rounded font-mono text-[10px] font-bold bg-neutral-950 text-white">OFFERED</span>;
      case "WITHDRAWN":
        return <span className="px-2.5 py-0.5 rounded font-mono text-[10px] font-bold bg-neutral-100 text-neutral-500 border border-neutral-200">WITHDRAWN</span>;
      case "REJECTED":
        return <span className="px-2.5 py-0.5 rounded font-mono text-[10px] font-bold bg-neutral-100 text-neutral-500 border border-neutral-200">REJECTED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded font-mono text-[10px] font-bold bg-neutral-100 text-neutral-800">{status}</span>;
    }
  };

  const filteredApplications = applications.filter((app) => {
    if (appJobFilter !== "ALL" && app.jobId !== appJobFilter) return false;
    if (appStatusFilter !== "ALL" && app.status !== appStatusFilter) return false;
    if (appSearchQuery.trim()) {
      const q = appSearchQuery.trim().toLowerCase();
      return (
        app.candidateName.toLowerCase().includes(q) ||
        app.candidateEmail.toLowerCase().includes(q) ||
        app.jobTitle.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 selection:bg-neutral-950 selection:text-white font-sans relative">
      {topBannerMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[999999] bg-neutral-950 text-white px-6 py-3 rounded-2xl shadow-2xl border border-neutral-800 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-mono font-bold">{topBannerMsg}</span>
          <button onClick={() => setTopBannerMsg(null)} className="ml-2 text-neutral-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-950 tracking-tight">Candidate Applications Pipeline</h1>
          <p className="text-xs text-neutral-500 font-mono">Inspect candidate resumes, evaluate technical qualifications, and advance hiring pipeline</p>
        </div>

        <button
          onClick={() => loadData()}
          className="px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs font-mono text-neutral-700 hover:bg-neutral-50 transition-all flex items-center gap-2 cursor-pointer shadow-xs shrink-0 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh Applications</span>
        </button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 border border-neutral-200 rounded-2xl shadow-xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-3" />
          <input
            type="text"
            value={appSearchQuery}
            onChange={(e) => setAppSearchQuery(e.target.value)}
            placeholder="Search candidate name or title..."
            className="w-full bg-white border border-neutral-300 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-neutral-950 focus:outline-none focus:border-neutral-950"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={appJobFilter}
            onChange={(e) => setAppJobFilter(e.target.value)}
            className="bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs font-mono text-neutral-950 focus:outline-none"
          >
            <option value="ALL">All Job Openings</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>

          <select
            value={appStatusFilter}
            onChange={(e) => setAppStatusFilter(e.target.value)}
            className="bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs font-mono text-neutral-950 focus:outline-none"
          >
            <option value="ALL">All Application Statuses</option>
            <option value="APPLIED">APPLIED</option>
            <option value="UNDER_REVIEW">UNDER REVIEW</option>
            <option value="SHORTLISTED">SHORTLISTED</option>
            <option value="INTERVIEW">INTERVIEW</option>
            <option value="SELECTED">SELECTED</option>
            <option value="OFFERED">OFFERED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="WITHDRAWN">WITHDRAWN</option>
          </select>
        </div>
      </div>

      {/* Applications List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-neutral-100 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-12 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto">
            <Users className="w-7 h-7 text-neutral-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-neutral-950">No candidate applications found</h3>
            <p className="text-xs text-neutral-500">
              Applications submitted by candidates using their Vantory Resumes will appear here in real-time.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((app) => {
            const parsedData = parseResumeData(app);
            return (
              <div
                key={app.id}
                className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-neutral-300 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-neutral-950 text-white font-extrabold flex items-center justify-center text-sm shrink-0 shadow-md">
                    {app.candidateAvatar || app.candidateName.charAt(0)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-base font-bold text-neutral-950">{app.candidateName}</h3>
                      {getStatusBadge(app.status)}
                    </div>

                    <div className="text-xs text-neutral-600 font-medium">
                      Applied for: <strong className="text-neutral-950 font-bold">{app.jobTitle}</strong>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs font-mono text-neutral-500">
                      <span>{app.candidateEmail}</span>
                      <span>•</span>
                      <span>Applied {new Date(app.appliedAt).toLocaleDateString()}</span>
                      {app.resume && (
                        <>
                          <span>•</span>
                          <span className="text-neutral-950 font-bold flex items-center gap-1">
                            <FileCheck className="w-3.5 h-3.5 inline" />
                            <span>{app.resume.title}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-200">
                  <button
                    onClick={() => {
                      if (parsedData) {
                        setActiveResumePreviewData(parsedData);
                        setActiveResumeId(app.id);
                      }
                    }}
                    className="px-3.5 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-bold text-neutral-950 hover:bg-neutral-50 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-neutral-950" />
                    <span>View Resume</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedApplication(app);
                      setEmployerNoteInput(app.employerNotes || "");
                      setStatusUpdateError("");
                    }}
                    className="px-4 py-2.5 bg-neutral-950 text-white font-bold text-xs rounded-xl hover:bg-neutral-800 transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-white" />
                    <span>Review Application</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REVIEW CANDIDATE APPLICATION MODAL */}
      {selectedApplication && mounted && createPortal(
        (() => {
          const parsedData = parseResumeData(selectedApplication);
          return (
            <div
              className="fixed inset-0 z-[99999] bg-neutral-950/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 selection:bg-neutral-900 selection:text-white"
              onClick={(e) => {
                if (e.target === e.currentTarget) closeReview();
              }}
            >
            {/* Bounded Fixed Viewport Modal Card */}
            <div className="relative w-full max-w-3xl bg-white border border-neutral-200 rounded-2xl sm:rounded-3xl shadow-2xl z-10 text-neutral-950 font-sans flex flex-col max-h-[85vh] overflow-hidden">
              {/* Modal Fixed Top Header */}
              <div className="p-4 sm:p-6 border-b border-neutral-200 flex items-center justify-between bg-neutral-50 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-neutral-200 text-neutral-900 border border-neutral-300">
                      CANDIDATE APPLICATION REVIEW
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-extrabold text-neutral-950 mt-1">{selectedApplication.candidateName}</h2>
                  <p className="text-xs text-neutral-500 font-mono">
                    Applied for {selectedApplication.jobTitle} • {new Date(selectedApplication.appliedAt).toLocaleDateString()}
                  </p>
                </div>

                <button
                  onClick={closeReview}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-950 hover:bg-neutral-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Middle Content Body with Visible Scrollbar */}
              <div
                className="p-4 sm:p-6 space-y-6 text-xs flex-1 overflow-y-auto min-h-0 custom-scrollbar"
                data-lenis-prevent="true"
                data-lenis-prevent-wheel="true"
                data-lenis-prevent-touch="true"
              >
                {statusUpdateError && (
                  <div className="p-3 bg-neutral-100 border border-neutral-300 rounded-xl font-mono text-neutral-900 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-neutral-950 shrink-0" />
                    <span>{statusUpdateError}</span>
                  </div>
                )}

                {/* Candidate Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
                    <span className="text-[10px] text-neutral-500 uppercase block font-semibold">Email Contact</span>
                    <div className="font-bold text-neutral-950">{selectedApplication.candidateEmail}</div>
                  </div>

                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
                    <span className="text-[10px] text-neutral-500 uppercase block font-semibold">Current Application Status</span>
                    <div className="flex items-center gap-2 pt-0.5">
                      {getStatusBadge(selectedApplication.status)}
                    </div>
                  </div>
                </div>

                {/* Cover Note */}
                {selectedApplication.coverNote && (
                  <div className="space-y-2">
                    <h4 className="font-mono font-bold text-neutral-950 uppercase tracking-wider">Candidate Cover Note</h4>
                    <p className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl leading-relaxed font-mono whitespace-pre-line text-neutral-800">
                      {selectedApplication.coverNote}
                    </p>
                  </div>
                )}

                {/* Attached Vantory Formatted Resume Summary Card */}
                {parsedData && (
                  <div className="p-5 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-neutral-950" />
                        <span className="font-bold text-neutral-950 text-sm">
                          {selectedApplication.resume?.title || `${parsedData.personalInfo.fullName} Resume`}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-neutral-200 rounded text-neutral-900 font-bold">
                        Template: {parsedData.settings?.templateId || "classic-monochrome"}
                      </span>
                    </div>

                    {/* Candidate Details */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <h5 className="font-bold text-neutral-950 text-sm">{parsedData.personalInfo.fullName}</h5>
                          <p className="text-xs font-mono text-neutral-500">{parsedData.personalInfo.headline}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono text-neutral-500">
                          {parsedData.personalInfo.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-neutral-400" />
                              <span>{parsedData.personalInfo.location}</span>
                            </span>
                          )}
                          {parsedData.personalInfo.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-neutral-400" />
                              <span>{parsedData.personalInfo.phone}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Summary */}
                      {parsedData.summary && (
                        <p className="text-xs text-neutral-700 leading-relaxed font-mono bg-white p-3 rounded-xl border border-neutral-200">
                          {parsedData.summary}
                        </p>
                      )}

                      {/* Key Skills Tags */}
                      {parsedData.skills && parsedData.skills.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] font-mono uppercase font-bold text-neutral-500 block">Key Skills</span>
                          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-1 border border-neutral-200 rounded-lg bg-white">
                            {parsedData.skills.flatMap((s) => s.skills).map((skill, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-neutral-100 border border-neutral-200 rounded font-mono text-[10px] font-bold text-neutral-900">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Resume Action Buttons */}
                    <div className="pt-2 flex flex-wrap items-center gap-3 border-t border-neutral-200">
                      <button
                        onClick={() => {
                          setActiveResumePreviewData(parsedData);
                          setActiveResumeId(selectedApplication.id);
                        }}
                        className="px-4 py-2 bg-neutral-950 text-white font-bold text-xs rounded-xl hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-white" />
                        <span>Preview Full Formatted A4 Resume</span>
                      </button>

                      {selectedApplication.resume?.id && (
                        <a
                          href={`/api/applications/${selectedApplication.id}/resume`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 bg-white border border-neutral-300 text-neutral-950 font-bold text-xs rounded-xl hover:bg-neutral-50 transition-all flex items-center gap-2 shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5 text-neutral-950" />
                          <span>Download PDF</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Employer Internal Notes */}
                <div className="space-y-2">
                  <label className="font-mono text-neutral-500 uppercase block font-semibold">
                    Employer Internal Notes (Private to Hiring Team)
                  </label>
                  <textarea
                    rows={3}
                    maxLength={2000}
                    disabled={isUpdatingStatus}
                    value={employerNoteInput}
                    onChange={(e) => setEmployerNoteInput(e.target.value)}
                    placeholder="Add private evaluation notes for engineering leads..."
                    className="w-full bg-white border border-neutral-300 rounded-xl p-3 text-neutral-950 font-mono focus:outline-none focus:border-neutral-950"
                  />
                  <div className="flex items-center gap-3">
                    <button onClick={saveNotes} disabled={!notesDirty || isUpdatingStatus} className="bg-neutral-950 text-white px-3 py-2 rounded-lg disabled:opacity-40">{isUpdatingStatus ? "Saving…" : "Save private notes"}</button>
                    <span role="status">{notesDirty ? "Unsaved changes" : "Notes saved"}</span>
                  </div>
                </div>
              </div>

              {/* Fixed Bottom Action Footer - ALWAYS VISIBLE AT ALL TIMES */}
              <div className="p-4 sm:p-5 border-t border-neutral-200 bg-neutral-50 shrink-0 rounded-b-2xl sm:rounded-b-3xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-neutral-500 font-medium">Status:</span>
                  {getStatusBadge(selectedApplication.status)}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {APPLICATION_TRANSITIONS[selectedApplication.status]?.includes("UNDER_REVIEW") && (
                    <button
                      onClick={() => handleStatusChange(selectedApplication.id, "UNDER_REVIEW")}
                      disabled={isUpdatingStatus}
                      className="px-3.5 py-2 bg-neutral-950 text-white font-mono font-bold text-xs rounded-xl hover:bg-neutral-800 cursor-pointer shadow-xs"
                    >
                      Move to UNDER REVIEW
                    </button>
                  )}

                  {APPLICATION_TRANSITIONS[selectedApplication.status]?.includes("SHORTLISTED") && (
                    <button
                      onClick={() => handleStatusChange(selectedApplication.id, "SHORTLISTED")}
                      disabled={isUpdatingStatus}
                      className="px-3.5 py-2 bg-neutral-950 text-white font-mono font-bold text-xs rounded-xl hover:bg-neutral-800 cursor-pointer shadow-xs"
                    >
                      Shortlist Candidate
                    </button>
                  )}

                  {APPLICATION_TRANSITIONS[selectedApplication.status]?.includes("INTERVIEW") && (
                    <button
                      onClick={() => handleStatusChange(selectedApplication.id, "INTERVIEW")}
                      disabled={isUpdatingStatus}
                      className="px-3.5 py-2 bg-neutral-950 text-white font-mono font-bold text-xs rounded-xl hover:bg-neutral-800 cursor-pointer shadow-xs"
                    >
                      Move to INTERVIEWING
                    </button>
                  )}

                  {APPLICATION_TRANSITIONS[selectedApplication.status]?.includes("SELECTED") && (
                    <button
                      onClick={() => handleStatusChange(selectedApplication.id, "SELECTED")}
                      disabled={isUpdatingStatus}
                      className="px-3.5 py-2 bg-neutral-950 text-white font-mono font-bold text-xs rounded-xl hover:bg-neutral-800 cursor-pointer shadow-xs"
                    >
                      Mark as SELECTED
                    </button>
                  )}

                  {APPLICATION_TRANSITIONS[selectedApplication.status]?.includes("OFFERED") && (
                    <button
                      onClick={() => handleStatusChange(selectedApplication.id, "OFFERED")}
                      disabled={isUpdatingStatus}
                      className="px-3.5 py-2 bg-emerald-600 text-white font-mono font-bold text-xs rounded-xl hover:bg-emerald-700 cursor-pointer shadow-xs"
                    >
                      Extend Job Offer
                    </button>
                  )}

                  {APPLICATION_TRANSITIONS[selectedApplication.status]?.includes("REJECTED") && (
                    <button
                      onClick={() => handleStatusChange(selectedApplication.id, "REJECTED")}
                      disabled={isUpdatingStatus}
                      className="px-3.5 py-2 bg-white border border-neutral-300 text-neutral-800 font-mono font-bold text-xs rounded-xl hover:bg-neutral-100 cursor-pointer"
                    >
                      Reject Application
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })(),
      document.body
      )}

      {/* FULL SCREEN A4 RESUME PREVIEW MODAL */}
      {activeResumePreviewData && mounted && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-neutral-950 overflow-y-auto flex flex-col items-center selection:bg-neutral-900 selection:text-white custom-scrollbar"
          data-lenis-prevent="true"
          data-lenis-prevent-wheel="true"
          data-lenis-prevent-touch="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActiveResumePreviewData(null);
              setActiveResumeId(null);
            }
          }}
        >
          {/* Docked Top Control Header Bar — Flush at top-0 */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Full Screen A4 Resume Preview"
            className="w-full bg-white text-neutral-950 px-4 sm:px-8 py-3.5 border-b border-neutral-200 shadow-md flex items-center justify-between gap-4 z-[101] shrink-0 sticky top-0"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-neutral-950 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                CV
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-neutral-950 leading-tight">
                  {activeResumePreviewData.personalInfo.fullName} — Formatted LaTeX Resume
                </h3>
                <p className="text-[11px] text-neutral-500 font-mono">
                  Template: {activeResumePreviewData.settings?.templateId || "classic-monochrome"}
                </p>
              </div>
            </div>

            {/* Zoom & Action Controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-[11px] font-mono bg-neutral-100 p-1 rounded-xl border border-neutral-300">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.6, Number((z - 0.1).toFixed(1))))}
                  className="px-2 py-0.5 rounded text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200 font-bold transition-colors cursor-pointer"
                  title="Zoom Out (-10%)"
                >
                  -
                </button>
                <span className="px-2 font-bold text-neutral-900">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(1.4, Number((z + 0.1).toFixed(1))))}
                  className="px-2 py-0.5 rounded text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200 font-bold transition-colors cursor-pointer"
                  title="Zoom In (+10%)"
                >
                  +
                </button>
              </div>

              {activeResumeId && (
                <a
                  href={`/api/applications/${activeResumeId}/resume`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-neutral-950 text-white font-bold text-xs rounded-xl hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-md"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                  <span>Download PDF</span>
                </a>
              )}

              <button
                onClick={() => {
                  setActiveResumePreviewData(null);
                  setActiveResumeId(null);
                }}
                className="p-1.5 rounded-xl text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100 transition-colors cursor-pointer"
                aria-label="Close resume preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Formatted A4 Paper Viewport Container */}
          <div className="w-full flex-1 p-6 sm:p-10 flex justify-center items-start pb-32">
            <div
              className="shadow-2xl rounded-sm bg-white transition-all duration-200 my-2"
              style={{
                zoom: zoomLevel,
              }}
            >
              <ResumePreview data={activeResumePreviewData} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
