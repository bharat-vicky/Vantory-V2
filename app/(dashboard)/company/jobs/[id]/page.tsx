"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import {
  Building,
  MapPin,
  CheckCircle2,
  Users,
  ArrowLeft,
  Briefcase,
  ExternalLink,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Clock,
  Code2,
  Globe,
  Pencil,
  X,
} from "lucide-react";
import { EditJobModal } from "@/components/company/EditJobModal";

interface CompanyJobDetailData {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  companyUrl?: string;
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
  status: string;
  displayStatus: string;
  expiresAt: string|null;
  updatedAt: string;
  verificationStatus: string;
  hiringContact?: string;
  postedAt: string;
}

interface CompanyStatsData {
  companyTotalJobs: number;
  totalApplications: number;
  shortlistedCount: number;
  underReviewCount: number;
  offeredCount: number;
}

export default function CompanyJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);

  const [job, setJob] = useState<CompanyJobDetailData | null>(null);
  const [stats, setStats] = useState<CompanyStatsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [topBannerMsg, setTopBannerMsg] = useState<string>("");

  const loadJobDetails = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/company/jobs/${jobId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.job) {
          setJob(json.job);
          setStats(json.companyStats);
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
  }, [jobId]);

  useEffect(() => {
    loadJobDetails();
  }, [loadJobDetails]);

  const handleJobUpdated = (msg?: string) => {
    loadJobDetails();
    if (msg) {
      setTopBannerMsg(msg);
      setTimeout(() => {
        setTopBannerMsg("");
      }, 6000);
    }
  };

  const handleToggleJobStatus = async () => {
    if (!job || isUpdatingStatus) return;
    if(job.status!=="ACTIVE"){setIsEditModalOpen(true);return;}
    const nextStatus = job.status === "ACTIVE" ? "CLOSED" : "ACTIVE";
    setIsUpdatingStatus(true);

    try {
      const res = await fetch(`/api/company/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, expectedUpdatedAt: job.updatedAt }),
      });

      const json=await res.json();
      if(!res.ok || !json.success)throw new Error(json.error || "Unable to update opening.");
      await loadJobDetails();
    } catch(e) {
      setTopBannerMsg(e instanceof Error?e.message:"Unable to update opening.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white text-neutral-950 p-6 md:p-10 space-y-6 animate-pulse font-sans">
        <div className="h-6 bg-neutral-100 rounded-lg w-1/4"></div>
        <div className="h-12 bg-neutral-100 rounded-2xl w-1/2"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-neutral-100 rounded-2xl"></div>
          ))}
        </div>
        <div className="h-64 bg-neutral-100 rounded-2xl"></div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-white text-neutral-950 p-10 flex flex-col items-center justify-center space-y-4 text-center font-sans">
        <div className="w-14 h-14 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center">
          <Briefcase className="w-7 h-7 text-neutral-500" />
        </div>
        <h2 className="text-xl font-bold text-neutral-950">Corporate Listing Not Found</h2>
        <p className="text-xs text-neutral-500 max-w-sm">{error || "The corporate job posting you requested does not exist."}</p>
        <Link
          href="/company/jobs"
          className="px-4 py-2.5 bg-neutral-950 text-white font-bold text-xs rounded-xl hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-md"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
          <span>Back to Corporate Openings</span>
        </Link>
      </div>
    );
  }

  const skillList = job.skills
    ? job.skills.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-white text-neutral-950 font-sans p-6 md:p-10 space-y-8 selection:bg-neutral-950 selection:text-white relative">
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

      {/* Top Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-6">
        <div className="space-y-2">
          <Link
            href="/company/jobs"
            className="inline-flex items-center gap-2 text-xs font-mono text-neutral-500 hover:text-neutral-950 transition-colors mb-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Corporate Jobs Dashboard</span>
          </Link>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-black text-neutral-950 tracking-tight">
              {job.title}
            </h1>

            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-extrabold ${
                job.status === "ACTIVE"
                  ? "bg-neutral-950 text-white shadow-xs"
                  : "bg-neutral-100 text-neutral-500 border border-neutral-200"
              }`}
            >
              {job.displayStatus}
              {job.expiresAt && <span className="block text-xs">Deadline: {new Date(job.expiresAt).toLocaleString()}</span>}
            </span>

            {job.verificationStatus === "VERIFIED" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-neutral-100 text-neutral-900 border border-neutral-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-neutral-950 inline" />
                <span>Verified Employer Listing</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-mono text-neutral-500 items-center">
            <span className="font-bold text-neutral-900">{job.company}</span>
            {job.companyUrl && /^https?:\/\//i.test(job.companyUrl) && <a
              href={job.companyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-600 hover:text-neutral-950 flex items-center gap-1 font-bold underline underline-offset-2 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-neutral-500" />
              <span>Company website</span>
            </a>}
            <span>•</span>
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

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href="/company/applications"
            className="px-4 py-2.5 bg-neutral-950 text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-md"
          >
            <Users className="w-4 h-4 text-white" />
            <span>Review Applications ({stats?.totalApplications || 0})</span>
          </Link>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-4 py-2.5 bg-neutral-950 text-white font-extrabold text-xs rounded-xl hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-md cursor-pointer"
          >
            <Pencil className="w-4 h-4 text-white" />
            <span>Edit Opening</span>
          </button>

          <Link
            href={job.status === "DRAFT" ? `/company/jobs/${job.id}` : `/jobs/${job.id}`}
            target="_blank"
            className="px-4 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs font-bold text-neutral-950 hover:bg-neutral-50 transition-all flex items-center gap-2 shadow-xs"
          >
            <ExternalLink className="w-4 h-4 text-neutral-600" />
            <span>Public Candidate Page</span>
          </Link>

          <button
            onClick={handleToggleJobStatus}
            disabled={isUpdatingStatus}
            className="px-4 py-2.5 bg-neutral-100 border border-neutral-300 rounded-xl text-xs font-bold text-neutral-900 hover:bg-neutral-200 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {job.status === "ACTIVE" ? (
              <>
                <ToggleRight className="w-4 h-4 text-neutral-950" />
                <span>Close Listing</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 text-neutral-500" />
                <span>Reopen Listing</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Real Company Performance & Response Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Jobs Listed by Company */}
        <div className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-neutral-500 uppercase tracking-wider">
              Total Company Jobs Listed
            </span>
            <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center">
              <Layers className="w-4 h-4 text-neutral-950" />
            </div>
          </div>
          <div className="text-3xl font-black text-neutral-950 font-mono">
            {stats?.companyTotalJobs || 1}
          </div>
          <p className="text-[11px] font-mono text-neutral-400">
            Total engineering postings by {job.company}
          </p>
        </div>

        {/* Metric 2: Applications / Responses Received */}
        <div className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-neutral-500 uppercase tracking-wider">
              Applications Received
            </span>
            <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center">
              <Users className="w-4 h-4 text-neutral-950" />
            </div>
          </div>
          <div className="text-3xl font-black text-neutral-950 font-mono">
            {stats?.totalApplications || 0}
          </div>
          <p className="text-[11px] font-mono text-neutral-400">
            Candidate resumes submitted for this role
          </p>
        </div>

        {/* Metric 3: Shortlisted / Interviewing Pipeline */}
        <div className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-neutral-500 uppercase tracking-wider">
              Shortlisted Pipeline
            </span>
            <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-neutral-950" />
            </div>
          </div>
          <div className="text-3xl font-black text-neutral-950 font-mono">
            {stats?.shortlistedCount || 0}
          </div>
          <p className="text-[11px] font-mono text-neutral-400">
            Qualified candidates in interview stage
          </p>
        </div>

        {/* Metric 4: Listing Age & Status */}
        <div className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-neutral-500 uppercase tracking-wider">
              Listing Status
            </span>
            <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center">
              <Clock className="w-4 h-4 text-neutral-950" />
            </div>
          </div>
          <div className="text-xl font-bold text-neutral-950 font-mono">
            {job.displayStatus}
          </div>
          <p className="text-[11px] font-mono text-neutral-400">
            Posted on {new Date(job.postedAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Main Job Detail Content: Full-Width Stacked Rectangles Layout */}
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
            <span>JOB OVERVIEW & PURPOSE</span>
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
                      PREFERRED QUALIFICATIONS
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
              <span>TARGET SKILL MATRIX</span>
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
      {/* EDIT & REPUBLISH JOB MODAL */}
      <EditJobModal
        jobId={job.id}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onJobUpdated={handleJobUpdated}
      />
    </div>
  );
}
