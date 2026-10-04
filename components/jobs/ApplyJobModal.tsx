"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Send,
  X,
  FileCheck,
  PlusCircle,
} from "lucide-react";

import { useBodyScrollLock } from "@/lib/hooks/useBodyScrollLock";

interface DbResume {
  id: string;
  title: string;
  templateId: string;
  updatedAt: string;
}

interface ApplyJobModalProps {
  initialResumeId?:string;
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
  companyName: string;
  onApplicationSuccess?: (applicationId: string) => void;
}

export function ApplyJobModal({
  initialResumeId,
  isOpen,
  onClose,
  jobId,
  jobTitle,
  companyName,
  onApplicationSuccess,
}: ApplyJobModalProps) {
  useBodyScrollLock(isOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const [resumes, setResumes] = useState<DbResume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [coverNote, setCoverNote] = useState<string>("");
  const [isLoadingResumes, setIsLoadingResumes] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [submittedAppId, setSubmittedAppId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    async function loadCandidateResumes() {
      setIsLoadingResumes(true);
      setError("");
      setSubmittedAppId(null);

      try {
        const res = await fetch("/api/resumes");
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.resumes)) {
            setResumes(json.resumes);
            if (json.resumes.length > 0) {
              setSelectedResumeId(json.resumes.some((r:DbResume)=>r.id===initialResumeId)?initialResumeId!:json.resumes[0].id);
            }
          }
        }
      } catch {
        setError("Failed to load candidate resumes.");
      } finally {
        setIsLoadingResumes(false);
      }
    }

    loadCandidateResumes();
  }, [isOpen,initialResumeId]);

  if (!isOpen) return null;

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResumeId) {
      setError("Please select a Vantory resume.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/jobs/${jobId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId: selectedResumeId,
          expectedResumeRevision: resumes.find(r=>r.id===selectedResumeId)?.updatedAt,
          coverNote,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to submit application.");
      }

      setSubmittedAppId(json.applicationId);
      if (onApplicationSuccess) {
        onApplicationSuccess(json.applicationId);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Application submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedResume = resumes.find((r) => r.id === selectedResumeId);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-neutral-950/85 backdrop-blur-sm overflow-y-auto selection:bg-neutral-900 selection:text-white custom-scrollbar"
      data-lenis-prevent="true"
      data-lenis-prevent-wheel="true"
      data-lenis-prevent-touch="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Centered Modal Card Wrapper */}
      <div className="w-full min-h-full flex justify-center items-start p-4 sm:p-6 py-8 sm:py-12">
        <div className="relative w-full max-w-lg bg-white border border-neutral-200 rounded-2xl sm:rounded-3xl shadow-2xl z-10 text-neutral-950 font-sans space-y-0 my-auto">
          {/* Modal Header */}
          <div className="p-5 sm:p-6 border-b border-neutral-200 flex items-center justify-between bg-neutral-50 rounded-t-2xl sm:rounded-t-3xl sticky top-0 z-20">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-neutral-200 text-neutral-900 border border-neutral-300">
                  VERIFIED APPLICATION GATEWAY
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-neutral-950 mt-1">Apply to {jobTitle}</h2>
              <p className="text-xs text-neutral-500 font-medium">{companyName}</p>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-950 hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-5 sm:p-6 pb-12 space-y-6">
          {submittedAppId ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-neutral-950 text-white flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-neutral-950">Application Submitted Successfully!</h3>
                <p className="text-xs text-neutral-600">
                  Your Vantory Resume and cover note have been delivered to {companyName}.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href={`/jobs/applications/${submittedAppId}`}
                  className="px-4 py-2.5 bg-neutral-950 text-white font-bold text-xs rounded-xl hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  <span>Track Application</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </Link>
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 bg-white text-neutral-950 font-semibold text-xs border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          ) : isLoadingResumes ? (
            <div className="text-center py-10 space-y-2">
              <div className="w-6 h-6 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-mono text-neutral-500">Loading your Vantory Resumes...</p>
            </div>
          ) : resumes.length === 0 ? (
            <div className="p-6 bg-neutral-50 border border-neutral-200 rounded-xl text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-white border border-neutral-200 flex items-center justify-center mx-auto shadow-xs">
                <FileText className="w-6 h-6 text-neutral-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-neutral-950">You don&apos;t have a resume yet</h3>
                <p className="text-xs text-neutral-600">
                  Create a professional Vantory resume before applying to verified job postings.
                </p>
              </div>
              <Link
                href="/resume"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-950 text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-all shadow-md"
              >
                <PlusCircle className="w-4 h-4 text-white" />
                <span>Create Resume in Builder</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleApplySubmit} className="space-y-5">
              {/* Step 1: Select Resume */}
              <div className="space-y-3">
                <label className="text-xs font-mono text-neutral-500 uppercase tracking-wider block font-semibold">
                  1. Select Vantory Resume
                </label>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {resumes.map((r) => {
                    const isSelected = r.id === selectedResumeId;
                    return (
                      <div
                        key={r.id}
                        onClick={() => setSelectedResumeId(r.id)}
                        className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-neutral-100 border-neutral-950 text-neutral-950 font-semibold"
                            : "bg-neutral-50 border-neutral-200 text-neutral-700 hover:border-neutral-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <FileCheck className={`w-5 h-5 ${isSelected ? "text-neutral-950" : "text-neutral-400"}`} />
                          <div>
                            <div className="font-bold text-neutral-950">{r.title}</div>
                            <div className="text-[10px] text-neutral-500 font-mono">
                              Template: {r.templateId} • Updated {new Date(r.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <div className="w-4 h-4 rounded-full border border-neutral-400 flex items-center justify-center">
                          {isSelected && <div className="w-2 h-2 rounded-full bg-neutral-950"></div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resume Preview Confirmation */}
              {selectedResume && (
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs space-y-1">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase block font-semibold">Selected Resume Preview</span>
                  <div className="font-semibold text-neutral-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-neutral-950 inline" />
                    <span>{selectedResume.title}</span>
                  </div>
                </div>
              )}

              {/* Step 2: Optional Cover Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-neutral-500 uppercase tracking-wider font-semibold flex justify-between">
                  <span>2. Cover Note (Optional)</span>
                  <span className="text-[10px] text-neutral-400">{coverNote.length}/2000</span>
                </label>
                <textarea
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value.slice(0, 2000))}
                  rows={4}
                  placeholder="Introduce yourself to the hiring manager or highlight relevant projects..."
                  className="w-full text-xs bg-white border border-neutral-300 rounded-xl p-3 text-neutral-950 font-mono focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 resize-y"
                />
              </div>

              {error && (
                <div className="p-3 bg-neutral-100 border border-neutral-300 rounded-xl text-xs text-neutral-900 flex items-center gap-2 font-mono">
                  <AlertCircle className="w-4 h-4 text-neutral-950 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Step 3: Submit Action */}
              <div className="pt-2 flex justify-end gap-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-white text-neutral-950 font-semibold text-xs border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedResumeId}
                  className="px-5 py-2.5 bg-neutral-950 text-white font-bold text-xs rounded-xl hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer shadow-md"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-white" />
                      <span>Submit Application</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  </div>
  );
}
