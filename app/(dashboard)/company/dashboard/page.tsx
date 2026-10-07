"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  PlusCircle,
  Briefcase,
  Users,
  CheckCircle2,
  Send,
  FileCheck,
  Eye,
  Globe,
  MapPin,
  LogOut,
  ArrowRight,
} from "lucide-react";
import { CreateJobModal } from "@/components/company/CreateJobModal";

interface CompanyProfileData {
  id: string;
  companyName: string;
  logo?: string;
  website?: string;
  description?: string;
  industry?: string;
  location?: string;
  verificationStatus: string;
  email: string;
}

interface CompanyStatsData {
  activeJobs: number;
  totalJobs: number;
  totalApplications: number;
  shortlistedCount: number;
  offersCount: number;
}

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
  displayStatus: string;
  postedAt: string;
  applicationsCount: number;
}

interface CandidateApplicationItem {
  id: string;
  jobId: string;
  jobTitle: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidateHeadline: string;
  candidateAvatar?: string;
  status: string;
  appliedAt: string;
}

export default function CompanyDashboardPage() {
  const [profile, setProfile] = useState<CompanyProfileData | null>(null);
  const [stats, setStats] = useState<CompanyStatsData>({
    activeJobs: 0,
    totalJobs: 0,
    totalApplications: 0,
    shortlistedCount: 0,
    offersCount: 0,
  });
  const [jobs, setJobs] = useState<CompanyJobItem[]>([]);
  const [applications, setApplications] = useState<CandidateApplicationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreateJobOpen, setIsCreateJobOpen] = useState<boolean>(false);

  const loadCompanyData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/company/summary");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          if (json.profile) setProfile(json.profile);
          if (json.stats) setStats(json.stats);
          if (Array.isArray(json.jobs)) setJobs(json.jobs);
          if (Array.isArray(json.applications)) setApplications(json.applications);
        }
      }
    } catch {
      // Handle silently
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompanyData();
    window.addEventListener("job-created", loadCompanyData);
    return () => {
      window.removeEventListener("job-created", loadCompanyData);
    };
  }, [loadCompanyData]);

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Handle silently
    } finally {
      window.location.href = "/login";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPLIED":
        return <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-neutral-950 text-white">APPLIED</span>;
      case "UNDER_REVIEW":
        return <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-300">UNDER REVIEW</span>;
      case "SHORTLISTED":
        return <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-neutral-950 text-white">SHORTLISTED</span>;
      case "INTERVIEW":
        return <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-neutral-950 text-white">INTERVIEW</span>;
      case "OFFERED":
        return <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-neutral-950 text-white">OFFERED</span>;
      default:
        return <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-neutral-100 text-neutral-800">{status}</span>;
    }
  };

  return (
    <div className="space-y-8 selection:bg-neutral-950 selection:text-white font-sans">
      {/* Header Banner */}
      <div className="border-b border-neutral-200 pb-8 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-neutral-950 text-white font-mono font-black text-2xl flex items-center justify-center shrink-0 shadow-md">
              {profile?.logo || profile?.companyName?.charAt(0) || "C"}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-black text-neutral-950 tracking-tight">
                  {profile?.companyName || "Corporate Employer"}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-100 text-neutral-900 border border-neutral-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-neutral-950 inline" />
                  <span>VERIFIED EMPLOYER</span>
                </span>
              </div>

              <div className="flex flex-wrap gap-3 text-xs font-mono text-neutral-500">
                {profile?.website && (
                  <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-neutral-950 underline">
                    <Globe className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{profile.website}</span>
                  </a>
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{profile?.location || "Remote"}</span>
                </span>
                <span>•</span>
                <span>{profile?.industry || "Software & Technology"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsCreateJobOpen(true)}
              className="px-4 py-2.5 bg-neutral-950 text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-md cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-white" />
              <span>Post New Job</span>
            </button>

            <button
              onClick={handleSignOut}
              className="px-4 py-2.5 bg-white border border-neutral-300 text-neutral-950 text-xs font-bold rounded-xl hover:bg-neutral-50 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-neutral-950" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Dynamic Hiring Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-neutral-200">
          <div className="p-4 bg-white border border-neutral-200 rounded-xl space-y-1 shadow-xs">
            <div className="flex items-center justify-between text-neutral-500">
              <span className="text-[10px] font-mono uppercase font-semibold">Active Jobs</span>
              <Briefcase className="w-4 h-4 text-neutral-500" />
            </div>
            <div className="text-2xl font-black text-neutral-950 font-mono">
              {isLoading ? "-" : stats.activeJobs}
            </div>
            <span className="text-[10px] text-neutral-500 block font-mono">
              {stats.totalJobs} total postings
            </span>
          </div>

          <div className="p-4 bg-white border border-neutral-200 rounded-xl space-y-1 shadow-xs">
            <div className="flex items-center justify-between text-neutral-500">
              <span className="text-[10px] font-mono uppercase font-semibold">Applications Received</span>
              <Users className="w-4 h-4 text-neutral-500" />
            </div>
            <div className="text-2xl font-black text-neutral-950 font-mono">
              {isLoading ? "-" : stats.totalApplications}
            </div>
            <span className="text-[10px] text-neutral-500 block font-mono">Incoming candidate pipeline</span>
          </div>

          <div className="p-4 bg-white border border-neutral-200 rounded-xl space-y-1 shadow-xs">
            <div className="flex items-center justify-between text-neutral-500">
              <span className="text-[10px] font-mono uppercase font-semibold">Shortlisted Candidates</span>
              <FileCheck className="w-4 h-4 text-neutral-500" />
            </div>
            <div className="text-2xl font-black text-neutral-950 font-mono">
              {isLoading ? "-" : stats.shortlistedCount}
            </div>
            <span className="text-[10px] text-neutral-500 block font-mono">Interview & shortlist pool</span>
          </div>

          <div className="p-4 bg-white border border-neutral-200 rounded-xl space-y-1 shadow-xs">
            <div className="flex items-center justify-between text-neutral-500">
              <span className="text-[10px] font-mono uppercase font-semibold">Offers Extended</span>
              <Send className="w-4 h-4 text-neutral-500" />
            </div>
            <div className="text-2xl font-black text-neutral-950 font-mono">
              {isLoading ? "-" : stats.offersCount}
            </div>
            <span className="text-[10px] text-neutral-500 block font-mono">Offered candidates</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Active Job Postings & Recent Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Openings Overview */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-neutral-950">Recent openings</h2>
              <p className="text-xs text-neutral-500 font-mono">Recently created jobs, including drafts and closed openings</p>
            </div>
            <Link
              href="/company/jobs"
              className="text-xs font-bold text-neutral-950 hover:underline flex items-center gap-1 font-mono"
            >
              <span>Manage Openings</span>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-950" />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-neutral-100 rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-xs text-neutral-500 font-mono">No active job postings found.</p>
              <button
                onClick={() => setIsCreateJobOpen(true)}
                className="px-4 py-2 bg-neutral-950 text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-all cursor-pointer"
              >
                Post Your First Job
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.slice(0, 3).map((job) => (
                <div key={job.id} className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-neutral-950">{job.title}</h3>
                    <div className="text-[11px] font-mono text-neutral-500">
                      {job.location} • {job.workMode} • <span className="text-neutral-950 font-bold">{job.salary || "Competitive"}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-neutral-950 block">{job.applicationsCount} Apps</span>
                    <span className="text-[10px] font-mono text-neutral-400">{job.displayStatus}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Candidate Pipeline Overview */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-neutral-950">Incoming Candidate Pipeline</h2>
              <p className="text-xs text-neutral-500 font-mono">Latest applications received from candidates</p>
            </div>
            <Link
              href="/company/applications"
              className="text-xs font-bold text-neutral-950 hover:underline flex items-center gap-1 font-mono"
            >
              <span>View All Applications</span>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-950" />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-neutral-100 rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-neutral-500 font-mono">No candidate applications received yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.slice(0, 3).map((app) => (
                <div key={app.id} className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-neutral-950 text-white font-extrabold flex items-center justify-center text-xs shrink-0">
                      {app.candidateName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-950">{app.candidateName}</h4>
                      <p className="text-[11px] font-mono text-neutral-500">{app.jobTitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(app.status)}
                    <Link
                      href="/company/applications"
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-950 hover:bg-neutral-200"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CREATE JOB MODAL */}
      <CreateJobModal
        isOpen={isCreateJobOpen}
        onClose={() => setIsCreateJobOpen(false)}
        onJobCreated={() => loadCompanyData()}
      />
    </div>
  );
}
