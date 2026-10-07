"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, RefreshCw, AlertCircle, Building2, CheckCircle2 } from "lucide-react";
import { localDeadline } from "@/lib/jobs/availability";
import { useBodyScrollLock } from "@/lib/hooks/useBodyScrollLock";

export interface EditJobModalProps {
  jobId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onJobUpdated?: (successMsg?: string) => void;
}

export function EditJobModal({ jobId, isOpen, onClose, onJobUpdated }: EditJobModalProps) {
  useBodyScrollLock(isOpen);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("Remote");
  const [workMode, setWorkMode] = useState("Remote");
  const [type, setType] = useState("Full-time");
  const [experienceMin, setExperienceMin] = useState<number>(0);
  const [experienceMax, setExperienceMax] = useState<number>(3);
  const [salaryMin, setSalaryMin] = useState<string>("");
  const [salaryMax, setSalaryMax] = useState<string>("");
  const [salaryPeriod, setSalaryPeriod] = useState<string>("month");
  const [skills, setSkills] = useState("");
  const [description, setDescription] = useState("");
  const [aboutCompany, setAboutCompany] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [requirements, setRequirements] = useState("");
  const [preferredRequirements, setPreferredRequirements] = useState("");
  const [eligibilityText,setEligibilityText]=useState("");
  const [expectedUpdatedAt,setExpectedUpdatedAt]=useState("");
  const [originalStatus,setOriginalStatus]=useState("ACTIVE");
  const [status, setStatus] = useState("ACTIVE");

  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isSubmitting]);

  useEffect(() => {
    if (!isOpen || !jobId) return;

    async function loadJobDetails() {
      setIsLoadingDetails(true);
      setExpectedUpdatedAt("");
      setError("");
      try {
        const res = await fetch(`/api/company/jobs/${jobId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.job) {
            const j = json.job;
            setTitle(j.title || "");
            setLocation(j.location || "Remote");
            setWorkMode(j.workMode || "Remote");
            setType(j.type || "Full-time");
            setExperienceMin(j.experienceMin ?? 0);
            setExperienceMax(j.experienceMax ?? 3);
            setSalaryMin(j.salaryMin ? String(j.salaryMin) : "");
            setSalaryMax(j.salaryMax ? String(j.salaryMax) : "");
            setSalaryPeriod(j.salaryPeriod || "month");
            setSkills(j.skills || "");
            setDescription(j.description || "");
            setAboutCompany(j.aboutCompany || "");
            setCompanyUrl(j.companyUrl || "");
            setResponsibilities(j.responsibilities || "");
            setRequirements(j.requirements || "");
            setPreferredRequirements(j.preferredRequirements || "");
            setStatus(j.status || "ACTIVE");
            setOriginalStatus(j.status || "ACTIVE");
            setExpectedUpdatedAt(j.updatedAt);
            setExpiresAt(localDeadline(j.expiresAt));
            setEligibilityText(j.eligibility ? JSON.stringify(j.eligibility) : "");
          } else {
            setError(json.error || "Failed to load job details.");
          }
        } else {setError("Failed to load this opening. Close and reopen the editor to retry.");}
      } catch {
        setError("Error connecting to server to load job details.");
      } finally {
        setIsLoadingDetails(false);
      }
    }

    loadJobDetails();
  }, [isOpen, jobId]);

  if (!isOpen || !jobId) return null;

  const handleSave = async (shouldRepublish: boolean) => {
    if(isSubmitting || !expectedUpdatedAt) return;
    let eligibility; try {eligibility=eligibilityText.trim()?JSON.parse(eligibilityText):null;} catch {setError("Eligibility must be valid JSON.");return;}
    if (!title.trim()) {
      setError("Job Title is required.");
      return;
    }
    if ((shouldRepublish ? "ACTIVE" : status) === "ACTIVE" && !description.trim()) {
      setError("Job Description is required.");
      return;
    }
    if ((shouldRepublish ? "ACTIVE" : status) === "ACTIVE" && !requirements.trim()) {
      setError("Job Requirements are required.");
      return;
    }
    if (experienceMin > experienceMax) {
      setError("Minimum experience cannot exceed maximum experience.");
      return;
    }

    const salMin = salaryMin ? parseInt(salaryMin, 10) : undefined;
    const salMax = salaryMax ? parseInt(salaryMax, 10) : undefined;

    if (salMin && salMax && salMin > salMax) {
      setError("Minimum salary cannot exceed maximum salary.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch(`/api/company/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          eligibility, expectedUpdatedAt,
          title,
          location,
          workMode,
          type,
          experienceMin,
          experienceMax,
          experience: `${experienceMin}-${experienceMax} Years`,
          salaryMin: salMin,
          salaryMax: salMax,
          salaryPeriod,
          skills,
          description,
          aboutCompany,
          companyUrl,
          responsibilities,
          requirements,
          preferredRequirements,
          status: shouldRepublish ? "ACTIVE" : status,
          republish: shouldRepublish,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update job posting.");
      }

      const msg = shouldRepublish ? "Opening published. Applications are accepted until its deadline." : "Opening saved.";
      if (onJobUpdated) onJobUpdated(msg);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update job.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-neutral-950/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto selection:bg-neutral-900 selection:text-white"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl bg-white border border-neutral-200 rounded-3xl shadow-2xl overflow-hidden text-neutral-950 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 border-b border-neutral-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-950 text-white flex items-center justify-center font-bold shadow-md">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-neutral-950">Edit opening</h2>
              <p className="text-xs text-neutral-500 font-medium">Save changes, keep a draft, or publish when ready.</p>
            </div>
          </div>

          <button
            aria-label="Close job editor"
            onClick={() => !isSubmitting && onClose()}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-950 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar text-xs font-sans">
          {isLoadingDetails ? (
            <div className="p-12 text-center space-y-3 animate-pulse">
              <div className="w-8 h-8 rounded-full border-2 border-neutral-950 border-t-transparent animate-spin mx-auto" />
              <p className="text-xs text-neutral-500 font-mono">Loading job posting data...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-900 p-3.5 rounded-xl flex items-center gap-2 font-mono font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-700" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-3.5 rounded-xl flex items-center gap-2 font-mono font-bold animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

<label className="block space-y-2">Application deadline (optional)<input aria-label="Application deadline" type="datetime-local" value={expiresAt} onChange={e=>setExpiresAt(e.target.value)} className="block w-full border rounded-xl p-3"/><span className="block text-xs text-neutral-500">Your device time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Applications close automatically at this time. Leave blank for no expiry.</span></label>
<label className="block">Structured eligibility (optional)<textarea aria-label="Structured eligibility" className="block w-full border rounded-xl p-3" value={eligibilityText} onChange={e=>setEligibilityText(e.target.value)}/><span>Leave blank to remove fixed eligibility rules.</span></label>
              {/* Title & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="font-mono text-neutral-500 uppercase block font-semibold">Job Title *</label>
                  <input
                    type="text"
                        aria-label="Job title" value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Senior Fullstack Engineer"
                    className="w-full bg-white border border-neutral-300 rounded-xl p-2.5 text-neutral-950 font-mono font-bold focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-neutral-500 uppercase block font-semibold">Posting Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-xl p-2.5 text-neutral-950 font-bold focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 cursor-pointer"
                  >
                    {originalStatus === "DRAFT" && <option value="DRAFT">DRAFT (Private)</option>}
                    {originalStatus !== "DRAFT" && <option value="PAUSED">PAUSED</option>}
                    <option value="ACTIVE">ACTIVE (Published)</option>
                    {originalStatus !== "DRAFT" && <option value="CLOSED">CLOSED (Archived)</option>}
                  </select>
                </div>
              </div>

              {/* Location, Work Mode & Job Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="font-mono text-neutral-500 uppercase block font-semibold">Location *</label>
                  <input
                    type="text"
                        value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Bengaluru, KA / Remote"
                    className="w-full bg-white border border-neutral-300 rounded-xl p-2.5 text-neutral-950 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-neutral-500 uppercase block font-semibold">Work Mode</label>
                  <select
                    value={workMode}
                    onChange={(e) => setWorkMode(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-xl p-2.5 text-neutral-950 font-medium cursor-pointer"
                  >
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-neutral-500 uppercase block font-semibold">Job Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-xl p-2.5 text-neutral-950 font-medium cursor-pointer"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                    <option value="Part-time">Part-time</option>
                  </select>
                </div>
              </div>

              {/* Experience Min & Max */}
              <div className="space-y-1.5">
                <label className="font-mono text-neutral-500 uppercase block font-semibold">Experience Required (Years)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={experienceMin}
                    onChange={(e) => setExperienceMin(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-white border border-neutral-300 rounded-xl p-2.5 text-neutral-950 font-mono font-medium"
                  />
                  <span className="font-mono text-neutral-400 font-bold">to</span>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={experienceMax}
                    onChange={(e) => setExperienceMax(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-white border border-neutral-300 rounded-xl p-2.5 text-neutral-950 font-mono font-medium"
                  />
                </div>
              </div>

              {/* Salary Min, Max & Period */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="font-mono text-neutral-500 uppercase block font-semibold">Min Salary (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 50000"
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-xl p-2.5 text-neutral-950 font-mono font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-neutral-500 uppercase block font-semibold">Max Salary (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 100000"
                    value={salaryMax}
                    onChange={(e) => setSalaryMax(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-xl p-2.5 text-neutral-950 font-mono font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-neutral-500 uppercase block font-semibold">Salary Period</label>
                  <select
                    value={salaryPeriod}
                    onChange={(e) => setSalaryPeriod(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-xl p-2.5 text-neutral-950 font-medium cursor-pointer"
                  >
                    <option value="month">per month (₹/mo)</option>
                    <option value="year">per year (₹/yr)</option>
                    <option value="hour">per hour (₹/hr)</option>
                  </select>
                </div>
              </div>

              {/* Skills */}
              <div className="space-y-1.5">
                <label className="font-mono text-neutral-500 uppercase block font-semibold">Required Technologies & Skills</label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="Comma separated (e.g. React, TypeScript, Node.js, Next.js, PostgreSQL)"
                  className="w-full bg-white border border-neutral-300 rounded-xl p-2.5 text-neutral-950 font-mono font-medium"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="font-mono text-neutral-500 uppercase block font-semibold">Job Overview & Description *</label>
                <textarea
                    rows={4}
                  aria-label="Job description" value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the engineering role, team culture, and business impact..."
                  className="w-full bg-white border border-neutral-300 rounded-xl p-3 text-neutral-950 font-mono"
                />
              </div>

              {/* About Company */}
              <div className="space-y-1.5">
                <label className="font-mono text-neutral-500 uppercase block font-semibold">About the Company (Optional)</label>
                <textarea
                  rows={3}
                  value={aboutCompany}
                  onChange={(e) => setAboutCompany(e.target.value)}
                  placeholder="Describe company culture, products, and vision..."
                  className="w-full bg-white border border-neutral-300 rounded-xl p-3 text-neutral-950 font-mono"
                />
              </div>

              {/* Company Website URL */}
              <div className="space-y-1.5">
                <label className="font-mono text-neutral-500 uppercase block font-semibold">Company Website / URL (Optional)</label>
                <input
                  type="url"
                  value={companyUrl}
                  onChange={(e) => setCompanyUrl(e.target.value)}
                  placeholder="https://company.example.com"
                  className="w-full bg-white border border-neutral-300 rounded-xl p-2.5 text-neutral-950 font-mono font-medium"
                />
              </div>

              {/* Mandatory Requirements */}
              <div className="space-y-1.5">
                <label className="font-mono text-neutral-500 uppercase block font-semibold">Mandatory Requirements *</label>
                <textarea
                    rows={3}
                  aria-label="Job requirements" value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="List mandatory qualifications and degree requirements..."
                  className="w-full bg-white border border-neutral-300 rounded-xl p-3 text-neutral-950 font-mono"
                />
              </div>

              {/* Responsibilities & Preferred Requirements */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-mono text-neutral-500 uppercase block font-semibold">Key Responsibilities (Optional)</label>
                  <textarea
                    rows={3}
                    value={responsibilities}
                    onChange={(e) => setResponsibilities(e.target.value)}
                    placeholder="List core daily engineering duties..."
                    className="w-full bg-white border border-neutral-300 rounded-xl p-3 text-neutral-950 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-neutral-500 uppercase block font-semibold">Preferred Qualifications (Optional)</label>
                  <textarea
                    rows={3}
                    value={preferredRequirements}
                    onChange={(e) => setPreferredRequirements(e.target.value)}
                    placeholder="Nice to have qualifications..."
                    className="w-full bg-white border border-neutral-300 rounded-xl p-3 text-neutral-950 font-mono"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-neutral-200 bg-neutral-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => !isSubmitting && onClose()}
            className="w-full sm:w-auto px-4 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-all cursor-pointer"
          >
            Cancel
          </button>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
            <button type="button" disabled={isSubmitting || isLoadingDetails || !expectedUpdatedAt} onClick={()=>handleSave(false)} className="border rounded-xl p-3 disabled:opacity-40">Save changes</button>
            <button
              type="button"
              disabled={isSubmitting || isLoadingDetails || !expectedUpdatedAt}
              onClick={() => handleSave(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-neutral-950 text-white font-extrabold text-xs rounded-xl hover:bg-neutral-800 disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-white ${isSubmitting ? "animate-spin" : ""}`} />
              <span>{originalStatus === "DRAFT" ? "Publish draft" : "Republish opening"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
