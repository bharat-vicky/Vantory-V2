"use client";

import {Reminders} from "@/components/candidate/Reminders";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Sparkles,
  Briefcase,
  Bookmark,
  ArrowRight,
  PlusCircle,
  Building,
  ChevronRight,
} from "lucide-react";

interface UserProfile {
  name: string;
  email: string;
  role: string;
}

interface ResumeItem {
  id: string;
  title: string;
  templateId: string;
  updatedAt: string;
}

interface AtsScanItem {
  id: string;
  targetJobTitle: string;
  companyName?: string;
  jobMatchScore: number | null;
  confidenceLevel: string;
  createdAt: string;
}

interface ApplicationItem {
  id: string;
  jobTitle: string;
  company: string;
  status: string;
  appliedAt: string;
}

interface JobOpeningItem {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  workMode: string;
  salary?: string;
  postedAt: string;
}

export default function CandidateDashboardPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [atsScans, setAtsScans] = useState<AtsScanItem[]>([]);
  const [applicationsCount,setApplicationsCount]=useState(0);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [savedJobsCount, setSavedJobsCount] = useState<number>(0);
  const [recentJobs, setRecentJobs] = useState<JobOpeningItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/dashboard/summary");
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            if (json.user) setUser(json.user);
            if (Array.isArray(json.resumes)) setResumes(json.resumes);
            if (Array.isArray(json.atsScans)) setAtsScans(json.atsScans);
            setApplicationsCount(json.applicationsCount || 0);
            if (Array.isArray(json.applications)) setApplications(json.applications);
            if (typeof json.savedJobsCount === "number") setSavedJobsCount(json.savedJobsCount);
            if (Array.isArray(json.recentJobs)) setRecentJobs(json.recentJobs);
          }
        }
      } catch {
        // Handle silently
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const latestScan = atsScans.length > 0 ? atsScans[0] : null;
  const latestResume = resumes.length > 0 ? resumes[0] : null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPLIED":
        return <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-neutral-950 text-white">APPLIED</span>;
      case "UNDER_REVIEW":
        return <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-300">UNDER REVIEW</span>;
      case "SHORTLISTED":
        return <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-neutral-950 text-white">SHORTLISTED</span>;
      default:
        return <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-neutral-100 text-neutral-800">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-950 font-sans p-6 md:p-10 space-y-8">
      <Reminders/>
      {/* Top Welcome Card */}
      <div className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-6 md:p-8 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-neutral-100 text-neutral-900 border border-neutral-200 uppercase tracking-wider">
                CANDIDATE CAREER DASHBOARD
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-neutral-950 tracking-tight">
              Welcome back{user?.name ? `, ${user.name}` : ""}
            </h1>
            <p className="text-xs md:text-sm text-neutral-500 max-w-2xl leading-relaxed">
              Track your ATS resume readiness, job match scores, active corporate applications, and saved engineering roles in real-time.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/resume"
              className="px-4 py-2.5 bg-neutral-950 text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-md"
            >
              <PlusCircle className="w-4 h-4 text-white" />
              <span>Create Resume</span>
            </Link>

            <Link
              href="/ats-checker"
              className="px-4 py-2.5 bg-white border border-neutral-300 text-neutral-950 text-xs font-bold rounded-xl hover:bg-neutral-50 transition-all flex items-center gap-2 shadow-xs"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Run ATS Check</span>
            </Link>
          </div>
        </div>

        {/* Dynamic Metric Cards Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-neutral-200">
          <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-neutral-500">
              <span className="text-[10px] font-mono uppercase font-semibold">Resumes Built</span>
              <FileText className="w-4 h-4 text-neutral-500" />
            </div>
            <div className="text-2xl font-black text-neutral-950 font-mono">
              {isLoading ? "-" : resumes.length}
            </div>
            <span className="text-[10px] text-neutral-500 block">
              {latestResume ? `Last updated ${new Date(latestResume.updatedAt).toLocaleDateString()}` : "No resumes built yet"}
            </span>
          </div>

          <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-neutral-500">
              <span className="text-[10px] font-mono uppercase font-semibold">Latest Match Score</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-neutral-950 font-mono">
              {isLoading ? "-" : latestScan?.jobMatchScore!=null ? `${latestScan.jobMatchScore}/100` : "Not assessed"}
            </div>
            <span className="text-[10px] text-neutral-500 block">
              {latestScan ? latestScan.targetJobTitle : "No ATS scans run yet"}
            </span>
          </div>

          <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-neutral-500">
              <span className="text-[10px] font-mono uppercase font-semibold">Job Applications</span>
              <Briefcase className="w-4 h-4 text-neutral-500" />
            </div>
            <div className="text-2xl font-black text-neutral-950 font-mono">
              {isLoading ? "-" : applicationsCount}
            </div>
            <span className="text-[10px] text-neutral-500 block">Active corporate tracking</span>
          </div>

          <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-neutral-500">
              <span className="text-[10px] font-mono uppercase font-semibold">Saved Jobs</span>
              <Bookmark className="w-4 h-4 text-neutral-500" />
            </div>
            <div className="text-2xl font-black text-neutral-950 font-mono">
              {isLoading ? "-" : savedJobsCount}
            </div>
            <span className="text-[10px] text-neutral-500 block">Opportunities saved</span>
          </div>
        </div>
      </div>

      {/* Launchpad Quick Tools Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/resume"
          className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-6 space-y-3 hover:border-neutral-300 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-neutral-950 text-white flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-neutral-950 group-hover:underline flex items-center justify-between">
              <span>Resume Builder</span>
              <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-1 transition-transform" />
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Design A4 ATS-formatted resumes with LaTeX and Monochrome styling.
            </p>
          </div>
        </Link>

        <Link
          href="/ats-checker"
          className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-6 space-y-3 hover:border-neutral-300 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-neutral-950 text-white flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-neutral-950 group-hover:underline flex items-center justify-between">
              <span>ATS Score Checker</span>
              <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-1 transition-transform" />
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Evaluate 12-dimension job match score and critical resume keyword gaps.
            </p>
          </div>
        </Link>

        <Link
          href="/jobs"
          className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-6 space-y-3 hover:border-neutral-300 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-neutral-950 text-white flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-neutral-950 group-hover:underline flex items-center justify-between">
              <span>Jobs & Careers Marketplace</span>
              <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-1 transition-transform" />
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Browse corporate openings and submit applications with your Vantory Resume.
            </p>
          </div>
        </Link>
      </div>

      {/* Main Grid: Applications & Recent ATS Scans */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Applications Tracker */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <h3 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-neutral-950" />
                <span>My Job Applications</span>
              </h3>
              <Link href="/jobs/applications" className="text-xs font-bold text-neutral-950 hover:underline flex items-center gap-1">
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-neutral-100 rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : applications.length === 0 ? (
              <div className="p-8 text-center bg-neutral-50 border border-neutral-200 rounded-xl space-y-3">
                <p className="text-xs text-neutral-500">You haven&apos;t applied to any corporate openings yet.</p>
                <Link
                  href="/jobs"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-950 text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-all shadow-sm"
                >
                  <span>Explore Jobs</span>
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.slice(0, 4).map((app) => (
                  <div
                    key={app.id}
                    className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-950">{app.jobTitle}</span>
                        {getStatusBadge(app.status)}
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono">
                        {app.company} • Applied {new Date(app.appliedAt).toLocaleDateString()}
                      </div>
                    </div>

                    <Link
                      href={`/jobs/applications/${app.id}`}
                      className="px-3 py-1.5 bg-white border border-neutral-300 rounded-lg font-mono font-bold text-[11px] text-neutral-950 hover:bg-neutral-100 transition-all shrink-0"
                    >
                      Track
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent ATS Scans & Openings */}
        <div className="lg:col-span-5 space-y-6">
          {/* Recent ATS Scans */}
          <div className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <h3 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Recent ATS Scans</span>
              </h3>
              <Link href="/ats-checker" className="text-xs font-bold text-neutral-950 hover:underline flex items-center gap-1">
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoading ? (
              <div className="h-20 bg-neutral-100 rounded-xl animate-pulse"></div>
            ) : atsScans.length === 0 ? (
              <div className="p-6 text-center bg-neutral-50 border border-neutral-200 rounded-xl space-y-2">
                <p className="text-xs text-neutral-500">No resume match score scans recorded yet.</p>
                <Link
                  href="/ats-checker"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-950 hover:underline"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 inline" />
                  <span>Run your first scan</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {atsScans.slice(0, 3).map((scan) => (
                  <div
                    key={scan.id}
                    className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-neutral-950">{scan.targetJobTitle}</div>
                      <div className="text-[10px] text-neutral-500 font-mono">
                        {scan.companyName || "Corporate Role"} • {new Date(scan.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-black text-neutral-950 text-base">
                        {scan.jobMatchScore ?? "Unvalidated"}{scan.jobMatchScore!=null && <span className="text-[10px] text-neutral-400">/100</span>}
                      </div>
                      <span className="text-[9px] font-mono font-bold text-neutral-500 uppercase">
                        {scan.confidenceLevel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Job Openings Teaser */}
          <div className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <h3 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider flex items-center gap-2">
                <Building className="w-4 h-4 text-neutral-950" />
                <span>Featured Openings</span>
              </h3>
              <Link href="/jobs" className="text-xs font-bold text-neutral-950 hover:underline flex items-center gap-1">
                <span>Explore</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoading ? (
              <div className="h-20 bg-neutral-100 rounded-xl animate-pulse"></div>
            ) : recentJobs.length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-4">No active openings available right now.</p>
            ) : (
              <div className="space-y-3">
                {recentJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-950">{job.title}</span>
                      <span className="text-[10px] font-mono text-neutral-500">{job.workMode}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono">
                      <span>{job.company}</span>
                      <Link href={`/jobs/${job.id}`} className="text-neutral-950 font-bold hover:underline">
                        Apply →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
