"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Send, AlertCircle, Building2 } from "lucide-react";
import { useBodyScrollLock } from "@/lib/hooks/useBodyScrollLock";

export interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated?: () => void;
}

export function CreateJobModal({ isOpen, onClose, onJobCreated }: CreateJobModalProps) {
  useBodyScrollLock(isOpen);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [eligibilityText,setEligibilityText]=useState("");
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
  const [responsibilities, setResponsibilities] = useState("");
  const [requirements, setRequirements] = useState("");
  const [preferredRequirements, setPreferredRequirements] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") !isSubmitting && onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isSubmitting]);

  useEffect(() => {
    if (!isOpen) return;
    async function loadCompanyProfile() {
      try {
        const res = await fetch("/api/company/profile");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.profile) {
            if (json.profile.description) setAboutCompany((prev) => (prev ? prev : json.profile.description));
            if (json.profile.website) setCompanyUrl((prev) => (prev ? prev : json.profile.website));
          }
        }
      } catch {
        // Silently ignore
      }
    }
    loadCompanyProfile();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (targetStatus: "DRAFT" | "ACTIVE") => {
    if (isSubmitting) return;
    if (!title.trim()) {
      setError("Job Title is required.");
      return;
    }
    if (targetStatus === "ACTIVE" && !description.trim()) {
      setError("Job Description is required.");
      return;
    }
    if (targetStatus === "ACTIVE" && !requirements.trim()) {
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

    let eligibility;try{eligibility=eligibilityText.trim()?JSON.parse(eligibilityText):undefined;}catch{setError("Eligibility must be valid JSON.");return;}
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/company/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eligibility,
          status: targetStatus,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
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
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create job posting.");
      }

      setTitle(""); setDescription(""); setRequirements(""); setResponsibilities(""); setPreferredRequirements(""); setSkills(""); setEligibilityText(""); setExpiresAt(""); setSalaryMin(""); setSalaryMax(""); setExperienceMin(0); setExperienceMax(3); setLocation("Remote"); setWorkMode("Remote"); setType("Full-time");
      if (onJobCreated) onJobCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating job posting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-neutral-950/85 backdrop-blur-sm overflow-y-auto selection:bg-neutral-900 selection:text-white custom-scrollbar"
      data-lenis-prevent="true"
      data-lenis-prevent-wheel="true"
      data-lenis-prevent-touch="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      {/* Centered Modal Card Wrapper */}
      <div className="w-full min-h-full flex justify-center items-start p-4 sm:p-6 py-8 sm:py-12">
        <div className="relative w-full max-w-2xl bg-white border border-neutral-200 rounded-2xl sm:rounded-3xl shadow-2xl z-10 text-neutral-950 font-sans space-y-0 my-auto">
          {/* Modal Header */}
          <div className="p-5 sm:p-6 border-b border-neutral-200 flex items-center justify-between bg-neutral-50 rounded-t-2xl sm:rounded-t-3xl sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-950 text-white flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-neutral-950">Post New Corporate Opening</h2>
                <p className="text-xs text-neutral-500 font-mono">Save privately as a draft, or publish to the candidate marketplace when ready.</p>
              </div>
            </div>

            <button
              aria-label="Close job editor"
              onClick={() => !isSubmitting && onClose()}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-950 hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form noValidate onSubmit={e => {e.preventDefault();handleSubmit("ACTIVE");}} className="p-5 sm:p-6 space-y-5 text-xs pb-12">
          {error && (
              <div className="p-3 bg-neutral-100 border border-neutral-300 rounded-xl text-neutral-900 flex items-center gap-2 font-mono">
                <AlertCircle className="w-4 h-4 text-neutral-950 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Job Title & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-mono text-neutral-500 uppercase block font-semibold">Job Title *</label>
                <input
                  type="text"
                    aria-label="Job title" value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer"
                  className="w-full bg-white border border-neutral-300 rounded-xl p-2.5 text-neutral-950 focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-neutral-500 uppercase block font-semibold">Location *</label>
                <input
                  type="text"
                    value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Remote, Bengaluru, Mumbai"
                  className="w-full bg-white border border-neutral-300 rounded-xl p-2.5 text-neutral-950 focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 font-medium"
                />
              </div>
            </div>

            {/* Work Mode, Job Type & Experience */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="font-mono text-neutral-500 uppercase block font-semibold">Work Mode</label>
                <select
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-xl p-2.5 text-neutral-950 focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 font-medium"
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
                  className="w-full bg-white border border-neutral-300 rounded-xl p-2.5 text-neutral-950 focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 font-medium"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Internship">Internship</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-neutral-500 uppercase block font-semibold">Experience (Years)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={experienceMin}
                    onChange={(e) => setExperienceMin(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-white border border-neutral-300 rounded-xl p-2.5 text-neutral-950 text-center font-mono font-medium"
                  />
                  <span className="text-neutral-400">to</span>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={experienceMax}
                    onChange={(e) => setExperienceMax(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-white border border-neutral-300 rounded-xl p-2.5 text-neutral-950 text-center font-mono font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Salary Min, Salary Max & Period */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="font-mono text-neutral-500 uppercase block font-semibold">Min Salary / Stipend (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 50000"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-xl p-2.5 text-neutral-950 font-mono font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-neutral-500 uppercase block font-semibold">Max Salary / Stipend (₹)</label>
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
                  className="w-full bg-white border border-neutral-300 rounded-xl p-2.5 text-neutral-950 focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950 font-medium"
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
                className="w-full bg-white border border-neutral-300 rounded-xl p-3 text-neutral-950 font-mono focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950"
              />
            </div>

            {/* About Company */}
            <div className="space-y-1.5">
              <label className="font-mono text-neutral-500 uppercase block font-semibold">About the Company / Company Overview (Optional)</label>
              <textarea
                rows={3}
                value={aboutCompany}
                onChange={(e) => setAboutCompany(e.target.value)}
                placeholder="Describe what your company does, products, mission, and engineering culture..."
                className="w-full bg-white border border-neutral-300 rounded-xl p-3 text-neutral-950 font-mono focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950"
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

            {/* Requirements */}
            <div className="space-y-1.5">
              <label className="font-mono text-neutral-500 uppercase block font-semibold">Mandatory Requirements *</label>
              <textarea
                rows={3}
                aria-label="Job requirements" value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="List mandatory qualifications, tech stack experience, and degree requirements..."
                className="w-full bg-white border border-neutral-300 rounded-xl p-3 text-neutral-950 font-mono focus:outline-none focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950"
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
                  placeholder="Day-to-day duties, architectural leadership, code reviews..."
                  className="w-full bg-white border border-neutral-300 rounded-xl p-3 text-neutral-950 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-neutral-500 uppercase block font-semibold">Preferred / Nice-to-Have (Optional)</label>
                <textarea
                  rows={3}
                  value={preferredRequirements}
                  onChange={(e) => setPreferredRequirements(e.target.value)}
                  placeholder="Bonus skills, cloud certifications, open source contributions..."
                  className="w-full bg-white border border-neutral-300 rounded-xl p-3 text-neutral-950 font-mono"
                />
              </div>
            </div>

<label className="block space-y-2">Application deadline (optional)<input aria-label="Application deadline" type="datetime-local" value={expiresAt} onChange={e=>setExpiresAt(e.target.value)} className="block w-full border rounded-xl p-3"/><span className="block text-xs text-neutral-500">Your device time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Applications close automatically at this time. Leave blank for no expiry.</span></label>
          {/* Action Footer */}
          <div className="pt-4 border-t border-neutral-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => !isSubmitting && onClose()}
              className="px-4 py-2.5 bg-white border border-neutral-300 text-neutral-950 font-semibold text-xs rounded-xl hover:bg-neutral-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button type="button" disabled={isSubmitting} onClick={()=>handleSubmit("DRAFT")} className="border rounded-xl p-3 disabled:opacity-40">Save draft</button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-neutral-950 text-white font-bold text-xs rounded-xl hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer shadow-md"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-white" />
                  <span>Publish Job Posting</span>
                </>
              )}
            </button>
          </div>
          <label className="block text-sm">Optional structured eligibility<textarea className="block w-full border p-3 rounded-xl" rows={3} value={eligibilityText} onChange={e=>setEligibilityText(e.target.value)} placeholder={'{"graduationYears":[2026,2027],"minCgpa":6,"maxBacklogs":0}'}/><span className="text-xs">Supported: graduationYears, courses, minCgpa, minPercentage, maxBacklogs. Leave blank if no fixed rules.</span></label>
      </form>
      </div>
    </div>
  </div>,
  document.body
);
}
