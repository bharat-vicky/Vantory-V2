"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Briefcase,
  ArrowRight,
  ArrowLeft,
  FileCheck,
  LayoutGrid,
  List,
} from "lucide-react";

interface ApplicationItem {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  companyLogo?: string;
  location: string;
  salary?: string;
  workMode: string;
  status: string;
  resumeTitle: string;
  appliedAt: string;
  coverNote?: string;
}

interface ApplicationStats {
  total: number;
  applied: number;
  underReview: number;
  shortlisted: number;
  interview: number;
  offered: number;
  rejected: number;
  withdrawn: number;
}

export default function ApplicationsTrackingPage() {
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [stats, setStats] = useState<ApplicationStats>({
    total: 0,
    applied: 0,
    underReview: 0,
    shortlisted: 0,
    interview: 0,
    offered: 0,
    rejected: 0,
    withdrawn: 0,
  });
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadApplications() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await fetch("/api/applications");
        if (!res.ok) {
          setLoadError(
            "Your applications could not be loaded. Sign in as a candidate and try again.",
          );
          return;
        }
        const json = await res.json();
        if (json.success) {
          setApplications(json.applications || []);
          if (json.stats) setStats(json.stats);
        } else {
          setLoadError(
            "Your applications could not be loaded. Please try again.",
          );
        }
      } catch {
        setLoadError(
          "Your applications could not be loaded. Please check your connection and retry.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadApplications();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPLIED":
        return (
          <span className="px-2.5 py-0.5 rounded font-mono text-[10px] font-bold bg-neutral-950 text-white">
            APPLIED
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="px-2.5 py-0.5 rounded font-mono text-[10px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-300">
            UNDER REVIEW
          </span>
        );
      case "SHORTLISTED":
        return (
          <span className="px-2.5 py-0.5 rounded font-mono text-[10px] font-bold bg-neutral-950 text-white">
            SHORTLISTED
          </span>
        );
      case "INTERVIEW":
        return (
          <span className="px-2.5 py-0.5 rounded font-mono text-[10px] font-bold bg-neutral-950 text-white">
            INTERVIEWING
          </span>
        );
      case "SELECTED":
        return (
          <span className="px-2.5 py-0.5 rounded font-mono text-[10px] font-bold bg-neutral-950 text-white">
            SELECTED
          </span>
        );
      case "OFFERED":
        return (
          <span className="px-2.5 py-0.5 rounded font-mono text-[10px] font-bold bg-neutral-950 text-white">
            OFFERED
          </span>
        );
      case "WITHDRAWN":
        return (
          <span className="px-2.5 py-0.5 rounded font-mono text-[10px] font-bold bg-neutral-100 text-neutral-500 border border-neutral-200">
            WITHDRAWN
          </span>
        );
      case "REJECTED":
        return (
          <span className="px-2.5 py-0.5 rounded font-mono text-[10px] font-bold bg-neutral-100 text-neutral-500 border border-neutral-200">
            REJECTED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded font-mono text-[10px] font-bold bg-neutral-100 text-neutral-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-950 font-sans p-6 md:p-10 space-y-8">
      {/* Top Header */}
      <div className="border-b border-neutral-200 pb-6 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 text-xs font-mono text-neutral-500 hover:text-neutral-950 transition-colors mb-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Marketplace</span>
            </Link>
            <h1 className="text-2xl font-extrabold tracking-tight text-neutral-950 flex items-center gap-3">
              <span>Application Tracking</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-neutral-100 text-neutral-950 border border-neutral-300">
                {stats.total} Total
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === "list"
                  ? "bg-neutral-950 text-white font-bold"
                  : "text-neutral-600 hover:text-neutral-950"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === "kanban"
                  ? "bg-neutral-950 text-white font-bold"
                  : "text-neutral-600 hover:text-neutral-950"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Header Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
        <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
          <span className="text-[10px] font-mono text-neutral-500 uppercase block font-semibold">
            Applied
          </span>
          <div className="font-bold text-neutral-950 font-mono text-lg">
            {stats.applied}
          </div>
        </div>

        <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
          <span className="text-[10px] font-mono text-neutral-500 uppercase block font-semibold">
            Under Review
          </span>
          <div className="font-bold text-neutral-950 font-mono text-lg">
            {stats.underReview}
          </div>
        </div>

        <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
          <span className="text-[10px] font-mono text-neutral-500 uppercase block font-semibold">
            Shortlisted
          </span>
          <div className="font-bold text-neutral-950 font-mono text-lg">
            {stats.shortlisted}
          </div>
        </div>

        <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
          <span className="text-[10px] font-mono text-neutral-500 uppercase block font-semibold">
            Interview
          </span>
          <div className="font-bold text-neutral-950 font-mono text-lg">
            {stats.interview}
          </div>
        </div>

        <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
          <span className="text-[10px] font-mono text-neutral-500 uppercase block font-semibold">
            Offers
          </span>
          <div className="font-bold text-neutral-950 font-mono text-lg">
            {stats.offered}
          </div>
        </div>

        <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
          <span className="text-[10px] font-mono text-neutral-500 uppercase block font-semibold">
            Withdrawn
          </span>
          <div className="font-bold text-neutral-500 font-mono text-lg">
            {stats.withdrawn}
          </div>
        </div>

        <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
          <span className="text-[10px] font-mono text-neutral-500 uppercase block font-semibold">
            Rejected
          </span>
          <div className="font-bold text-neutral-400 font-mono text-lg">
            {stats.rejected}
          </div>
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white border border-neutral-200 rounded-2xl p-6 h-28 animate-pulse shadow-sm"
            ></div>
          ))}
        </div>
      ) : loadError ? (
        <div
          role="alert"
          className="mx-auto max-w-lg space-y-4 border border-neutral-200 p-8 text-center"
        >
          <p className="text-sm text-neutral-700">{loadError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-sm font-semibold underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-12 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto">
            <Briefcase className="w-7 h-7 text-neutral-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-neutral-950">
              You haven&apos;t applied to any jobs yet
            </h3>
            <p className="text-xs text-neutral-500">
              Discover verified corporate openings in the marketplace and apply
              with your Vantory Resume.
            </p>
          </div>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-950 text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-all shadow-md"
          >
            <span>Explore Jobs</span>
            <ArrowRight className="w-4 h-4 text-white" />
          </Link>
        </div>
      ) : viewMode === "list" ? (
        <div className="space-y-4 max-w-5xl">
          {applications.map((app) => (
            <div
              key={app.id}
              className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-neutral-300 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-neutral-950 font-mono font-black text-lg text-white flex items-center justify-center shrink-0">
                  {app.companyLogo || app.company.charAt(0)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-extrabold text-neutral-950">
                      {app.company}
                    </span>
                    {getStatusBadge(app.status)}
                  </div>

                  <h3 className="text-base font-bold text-neutral-950 hover:underline">
                    <Link href={`/jobs/applications/${app.id}`}>
                      {app.jobTitle}
                    </Link>
                  </h3>

                  <div className="flex flex-wrap gap-2 text-xs font-mono text-neutral-500">
                    <span className="flex items-center gap-1">
                      <FileCheck className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{app.resumeTitle}</span>
                    </span>
                    <span>•</span>
                    <span>
                      Applied {new Date(app.appliedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-200">
                <Link
                  href={`/jobs/applications/${app.id}`}
                  className="px-4 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs font-bold text-neutral-950 hover:bg-neutral-50 transition-all flex items-center gap-2 shadow-xs"
                >
                  <span>View Timeline</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto pb-4">
          {["APPLIED", "UNDER_REVIEW", "SHORTLISTED", "INTERVIEW", "SELECTED", "OFFERED", "REJECTED", "WITHDRAWN"].map(
            (columnStatus) => {
              const colApps = applications.filter(
                (a) => a.status === columnStatus,
              );

              return (
                <div
                  key={columnStatus}
                  className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-4 space-y-3 min-w-[250px]"
                >
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                    <span className="text-xs font-mono font-bold text-neutral-950 uppercase">
                      {columnStatus.replace("_", " ")}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500 font-bold">
                      {colApps.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {colApps.map((app) => (
                      <div
                        key={app.id}
                        className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2 text-xs"
                      >
                        <div className="font-bold text-neutral-950">
                          {app.jobTitle}
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          {app.company}
                        </div>
                        <div className="pt-2 border-t border-neutral-200 flex justify-between text-[10px] font-mono text-neutral-500">
                          <span>
                            {new Date(app.appliedAt).toLocaleDateString()}
                          </span>
                          <Link
                            href={`/jobs/applications/${app.id}`}
                            className="text-neutral-950 font-bold hover:underline"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    ))}
                    {colApps.length === 0 && (
                      <p className="text-[10px] text-neutral-400 text-center py-4 font-mono">
                        No applications
                      </p>
                    )}
                  </div>
                </div>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}
