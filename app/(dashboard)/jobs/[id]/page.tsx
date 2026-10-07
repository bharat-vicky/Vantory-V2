"use client";

import { jobPreparationDescription } from "@/lib/jobs/context";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  Building,
  MapPin,
  CheckCircle2,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  Send,
  ArrowLeft,
  Briefcase,
  AlertTriangle,
  RefreshCw,
  Code2,
  Globe,
} from "lucide-react";
import { JobWorkspace } from "@/components/jobs/JobWorkspace";
import { ApplyJobModal } from "@/components/jobs/ApplyJobModal";
import { ATSReportSnapshot } from "@/lib/ats/types";

interface JobDetailData {
  id: string;
  title: string;
  company: string;
  companyUrl?: string;
  companyLogo?: string;
  location: string;
  workMode: string;
  type: string;
  experience: string;
  salary?: string;
  description: string;
  aboutCompany?: string;
  responsibilities?: string;
  requirements: string;
  preferredRequirements?: string;
  skills: string;
  verificationStatus: string;
  hiringContact?: string;
  postedAt: string;
  isSaved?: boolean;
  hasApplied?: boolean;
  isAvailable: boolean;
  displayStatus: string;
  expiresAt: string | null;
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);

  const [job, setJob] = useState<JobDetailData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const [workspaceResumeId,setWorkspaceResumeId]=useState("");
  // ATS Match Integration States
  const [isAnalyzingAts, setIsAnalyzingAts] = useState<boolean>(false);
  const [atsReport, setAtsReport] = useState<ATSReportSnapshot | null>(null);
  const [atsError, setAtsError] = useState<string>("");

  // Apply Modal state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {const timer=setInterval(()=>setClock(Date.now()),1000);return ()=>clearInterval(timer);},[]);
  const deadlinePassed=Boolean(job?.expiresAt && Date.parse(job.expiresAt)<=clock);

  const companyWebsiteUrl = job?.companyUrl && job.companyUrl.trim() ? job.companyUrl.trim() : "";

  useEffect(() => {
    async function loadJobDetails() {
      setIsLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.job) {
            setJob(json.job);
          } else {
            setError(json.error || "Job posting not found.");
          }
        } else {
          setError("Failed to fetch job details.");
        }
      } catch {
        setError("Error connecting to server.");
      } finally {
        setIsLoading(false);
      }
    }

    loadJobDetails();
  }, [jobId]);

  const handleToggleSave = async () => {
    if (!job) return;
    try {
      const res = await fetch(`/api/jobs/${job.id}/save`, { method: job.isSaved ? "DELETE":"POST" });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setJob((prev) => (prev ? { ...prev, isSaved: json.isSaved } : null));
        }
      }
    } catch {
      // Handle silently
    }
  };

  const handleRunAtsCheck = async () => {
    if (!job) return;
    if(!workspaceResumeId){setAtsError("Select a resume in the job workspace first.");return;}
    setIsAnalyzingAts(true);
    setAtsError("");

    try {
      const res = await fetch("/api/ats/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId:workspaceResumeId || undefined,
          targetJobTitle: job.title,
          jobDescription: jobPreparationDescription(job),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to analyze resume match score.");
      }

      setAtsReport(json.snapshot);
    } catch (err: unknown) {
      setAtsError(err instanceof Error ? err.message : "ATS Score analysis failed.");
    } finally {
      setIsAnalyzingAts(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white text-neutral-950 p-8 space-y-6 animate-pulse">
        <div className="h-6 bg-neutral-100 rounded w-1/4"></div>
        <div className="h-10 bg-neutral-100 rounded w-1/2"></div>
        <div className="h-48 bg-neutral-100 rounded-2xl"></div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-white text-neutral-950 p-10 flex flex-col items-center justify-center space-y-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center">
          <Briefcase className="w-6 h-6 text-neutral-500" />
        </div>
        <h2 className="text-xl font-bold text-neutral-950">Job Posting Not Found</h2>
        <p className="text-xs text-neutral-500 max-w-sm">{error || "The job posting you are looking for does not exist or has been removed."}</p>
        <Link
          href="/jobs"
          className="px-4 py-2.5 bg-neutral-950 text-white font-bold text-xs rounded-xl hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-md"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
          <span>Back to Marketplace</span>
        </Link>
      </div>
    );
  }

  const skillList = job.skills
    ? job.skills.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-white text-neutral-950 font-sans p-6 md:p-10 space-y-8">
      <JobWorkspace jobId={jobId} available={job.isAvailable && !deadlinePassed} onResumeSelect={setWorkspaceResumeId}/>
      {/* Back Link */}
      <div>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 text-xs font-mono text-neutral-500 hover:text-neutral-950 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Jobs Marketplace</span>
        </Link>
      </div>

      {/* Main Header Card */}
      <div className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-neutral-200 pb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-neutral-950 font-mono font-black text-2xl text-white flex items-center justify-center shrink-0 shadow-inner">
              {job.companyLogo || job.company.charAt(0)}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-sm font-extrabold text-neutral-950">{job.company}</span>
                {companyWebsiteUrl && (
                  <a
                    href={companyWebsiteUrl.startsWith("http") ? companyWebsiteUrl : `https://${companyWebsiteUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-neutral-600 hover:text-neutral-950 flex items-center gap-1 font-bold underline underline-offset-2 transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{companyWebsiteUrl.replace(/^https?:\/\//, "")}</span>
                  </a>
                )}
                {job.verificationStatus === "VERIFIED" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-100 text-neutral-900 border border-neutral-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-neutral-950 inline" />
                    <span>Verified Listing</span>
                  </span>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-black text-neutral-950 tracking-tight">
                {job.title}
              </h1>

              <div className="flex flex-wrap gap-2 pt-1 font-mono text-xs text-neutral-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{job.location}</span>
                </span>
                <span>•</span>
                <span>{job.workMode}</span>
                <span>•</span>
                <span>{job.type}</span>
                <span>•</span>
                <span className="text-neutral-950 font-bold">{job.salary || "Competitive"}</span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap md:flex-col items-stretch gap-3 shrink-0">
            {job.expiresAt && <p className="text-xs">Application deadline: {new Date(job.expiresAt).toLocaleString()}</p>}
            {job.hasApplied ? (
              <span className="px-5 py-3 bg-neutral-100 border border-neutral-200 rounded-xl text-xs font-mono font-bold text-neutral-900 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-neutral-950" />
                <span>Already Applied</span>
              </span>
            ) : (
              <button
                disabled={!job.isAvailable || deadlinePassed}
                onClick={() => setIsApplyModalOpen(true)}
                className="px-6 py-3 bg-neutral-950 text-white font-extrabold text-xs rounded-xl hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <Send className="w-4 h-4 text-white" />
                <span>{deadlinePassed ? "Application deadline passed" : !job.isAvailable ? "Applications unavailable" : "Apply with Vantory Resume"}</span>
              </button>
            )}

            <button
              onClick={handleRunAtsCheck}
              disabled={isAnalyzingAts}
              className="px-4 py-3 bg-white border border-neutral-300 text-neutral-950 font-bold text-xs rounded-xl hover:bg-neutral-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              {isAnalyzingAts ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-neutral-950" />
                  <span>Calculating Match...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Check Resume Match</span>
                </>
              )}
            </button>

            <button
              onClick={handleToggleSave}
              className="px-4 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 hover:text-neutral-950 hover:bg-neutral-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {job.isSaved ? (
                <>
                  <BookmarkCheck className="w-4 h-4 text-neutral-950 fill-neutral-950" />
                  <span className="font-bold text-neutral-950">Saved</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4 text-neutral-400" />
                  <span>Save Job</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ATS Checker Embedded Match Snapshot Widget */}
        {(atsReport || atsError) && (
          <div className="p-5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <h3 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Vantory Job Match Analysis</span>
              </h3>
              <span className="text-[10px] font-mono text-neutral-500 font-semibold">Milestone 6 ATS Engine</span>
            </div>

            {atsError ? (
              <p className="text-xs text-neutral-800">{atsError}</p>
            ) : atsReport ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-neutral-500 uppercase block font-semibold">Compatibility Score</span>
                    <div className="text-2xl font-black text-neutral-950 font-mono">
                      {atsReport.jobMatchScore} <span className="text-xs text-neutral-400">/ 100</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-white text-neutral-950 border border-neutral-300 shadow-xs">
                      Confidence: {atsReport.confidenceLevel}
                    </span>
                    <Link
                      href="/ats-checker"
                      className="px-3 py-1.5 bg-neutral-950 text-white font-bold text-xs rounded-lg hover:bg-neutral-800 transition-all shadow-md"
                    >
                      View Detailed Analysis
                    </Link>
                  </div>
                </div>

                {atsReport.criticalGaps.length > 0 && (
                  <div className="p-3 bg-white border border-neutral-200 rounded-lg text-xs space-y-1">
                    <span className="font-bold text-amber-600 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 inline" />
                      <span>{atsReport.criticalGaps[0].title}</span>
                    </span>
                    <p className="text-neutral-600">{atsReport.criticalGaps[0].requiredDetail}</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Quick Attributes Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-0.5">
            <span className="text-[10px] text-neutral-500 uppercase block font-semibold">Stipend / CTC</span>
            <div className="font-bold text-neutral-950">{job.salary || "Not Specified"}</div>
          </div>

          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-0.5">
            <span className="text-[10px] text-neutral-500 uppercase block font-semibold">Experience</span>
            <div className="font-bold text-neutral-950">{job.experience}</div>
          </div>

          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-0.5">
            <span className="text-[10px] text-neutral-500 uppercase block font-semibold">Work Mode</span>
            <div className="font-bold text-neutral-950">{job.workMode}</div>
          </div>

          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-0.5">
            <span className="text-[10px] text-neutral-500 uppercase block font-semibold">Posted Date</span>
            <div className="font-bold text-neutral-950">{new Date(job.postedAt).toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      {/* Main Details Body Sections: Full Width Rectangular Layout */}
      <div className="space-y-6">
        {/* Row 1: About Company & Hiring Contact (Side-by-Side Rectangles) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* About Company (8 cols) */}
          <div className="md:col-span-8 bg-white border border-neutral-200 shadow-xs rounded-2xl p-6 md:p-8 space-y-4">
            <h3 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider border-b border-neutral-200 pb-3 flex items-center gap-2">
              <Building className="w-4 h-4 text-neutral-950" />
              <span>ABOUT {job.company.toUpperCase()}</span>
            </h3>
            <p className="text-xs text-neutral-700 leading-relaxed font-sans whitespace-pre-line">
              {job.aboutCompany || "Registered hiring employer on Vantory verified candidate marketplace. Applications are delivered directly to hiring engineering leads."}
            </p>
          </div>

          {/* Hiring Contact (4 cols) */}
          <div className="md:col-span-4 bg-white border border-neutral-200 shadow-xs rounded-2xl p-6 md:p-8 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider border-b border-neutral-200 pb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-neutral-950" />
                <span>HIRING CONTACT</span>
              </h3>
              <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1 font-mono">
                <span className="text-[10px] text-neutral-400 uppercase block font-bold tracking-wider">ENGINEERING LEAD</span>
                <span className="text-sm font-extrabold text-neutral-950">{job.hiringContact || job.company}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Full-Width Job Overview Rectangle */}
        <div className="bg-white border border-neutral-200 shadow-xs rounded-2xl p-6 md:p-8 space-y-4">
          <h3 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider border-b border-neutral-200 pb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-neutral-950" />
            <span>JOB OVERVIEW</span>
          </h3>
          <p className="text-xs text-neutral-700 leading-relaxed font-sans whitespace-pre-line">
            {job.description}
          </p>
        </div>

        {/* Row 3: Key Responsibilities & Requirements (Side-by-Side Rectangles) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Key Responsibilities Card */}
          {job.responsibilities && (
            <div className="bg-white border border-neutral-200 shadow-xs rounded-2xl p-6 md:p-8 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider border-b border-neutral-200 pb-3">
                  KEY RESPONSIBILITIES
                </h3>
                <p className="text-xs text-neutral-700 leading-relaxed font-sans whitespace-pre-line">
                  {job.responsibilities}
                </p>
              </div>
            </div>
          )}

          {/* Requirements & Qualifications Card */}
          <div className="bg-white border border-neutral-200 shadow-xs rounded-2xl p-6 md:p-8 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider border-b border-neutral-200 pb-3">
                REQUIREMENTS & QUALIFICATIONS
              </h3>

              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase block mb-1.5 font-bold tracking-wider">
                    MANDATORY REQUIREMENTS
                  </span>
                  <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono text-neutral-900 leading-relaxed">
                    {job.requirements}
                  </div>
                </div>

                {job.preferredRequirements && (
                  <div>
                    <span className="text-[10px] font-mono text-neutral-400 uppercase block mb-1.5 font-bold tracking-wider">
                      PREFERRED REQUIREMENTS
                    </span>
                    <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono text-neutral-700 leading-relaxed">
                      {job.preferredRequirements}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Row 4: Full-Width Technologies & Tools Rectangle */}
        {skillList.length > 0 && (
          <div className="bg-white border border-neutral-200 shadow-xs rounded-2xl p-6 md:p-8 space-y-4">
            <h3 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider border-b border-neutral-200 pb-3 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-neutral-950" />
              <span>TECHNOLOGIES & TOOLS</span>
            </h3>

            <div className="flex flex-wrap gap-2">
              {skillList.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-mono bg-neutral-100 border border-neutral-200 text-neutral-900 font-bold"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Application Workflow Modal */}
      <ApplyJobModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        initialResumeId={workspaceResumeId}
        jobId={job.id}
        jobTitle={job.title}
        companyName={job.company}
        onApplicationSuccess={() => {
          setJob((prev) => (prev ? { ...prev, hasApplied: true } : null));
        }}
      />
    </div>
  );
}
