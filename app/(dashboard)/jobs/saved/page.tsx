"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Bookmark, Trash2, Briefcase, ArrowLeft, Send } from "lucide-react";
import { ApplyJobModal } from "@/components/jobs/ApplyJobModal";

interface SavedJobItem {
  savedId: string;
  savedAt: string;
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  workMode: string;
  type: string;
  experience: string;
  salary?: string;
  verificationStatus: string;
  isAvailable: boolean;
  hasApplied: boolean;
  existingApplicationId: string | null;
  applicationStatus: string | null;
}

export default function SavedJobsPage() {
  const [savedJobs, setSavedJobs] = useState<SavedJobItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [applyModalJob, setApplyModalJob] = useState<{
    id: string;
    title: string;
    company: string;
  } | null>(null);

  const fetchSavedJobs = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/jobs/saved");
      if (!res.ok) {
        setLoadError(
          "Your saved jobs could not be loaded. Sign in as a candidate and try again.",
        );
        return;
      }
      const json = await res.json();
      if (json.success && Array.isArray(json.savedJobs)) {
        setSavedJobs(json.savedJobs);
      } else {
        setLoadError("Your saved jobs could not be loaded. Please try again.");
      }
    } catch {
      setLoadError(
        "Your saved jobs could not be loaded. Please check your connection and retry.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedJobs();
  }, []);

  const handleUnsave = async (jobId: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/save`, { method: "DELETE" });
      if (res.ok) {
        setSavedJobs((prev) => prev.filter((j) => j.id !== jobId));
      }
    } catch {
      // Handle silently
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-950 font-sans p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="border-b border-neutral-200 pb-6 space-y-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 text-xs font-mono text-neutral-500 hover:text-neutral-950 transition-colors mb-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Marketplace</span>
            </Link>
            <h1 className="text-2xl font-extrabold tracking-tight text-neutral-950 flex items-center gap-3">
              <span>Saved Jobs</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-neutral-100 text-neutral-950 border border-neutral-300">
                {savedJobs.length}
              </span>
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
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
            onClick={fetchSavedJobs}
            className="text-sm font-semibold underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      ) : savedJobs.length === 0 ? (
        <div className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-12 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto">
            <Bookmark className="w-7 h-7 text-neutral-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-neutral-950">
              No saved jobs yet
            </h3>
            <p className="text-xs text-neutral-500">
              Save interesting corporate opportunities while browsing the
              marketplace and come back to review them anytime.
            </p>
          </div>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-950 text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-all shadow-md"
          >
            <Briefcase className="w-4 h-4 text-white" />
            <span>Browse Jobs</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4 max-w-4xl">
          {savedJobs.map((job) => (
            <div
              key={job.id}
              className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-neutral-300 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-neutral-950 font-mono font-black text-lg text-white flex items-center justify-center shrink-0">
                  {job.companyLogo || job.company.charAt(0)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-neutral-950">
                      {job.company}
                    </span>
                    {job.verificationStatus === "VERIFIED" && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-100 text-neutral-800 border border-neutral-200">
                        Verified
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-neutral-950 hover:underline">
                    <Link href={`/jobs/${job.id}`}>{job.title}</Link>
                  </h3>

                  <div className="flex flex-wrap gap-2 text-xs font-mono text-neutral-500">
                    <span>{job.location}</span>
                    <span>•</span>
                    <span>{job.workMode}</span>
                    <span>•</span>
                    <span className="text-neutral-950 font-bold">
                      {job.salary || "Competitive"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-200">
                <button
                  onClick={() => handleUnsave(job.id)}
                  className="p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-500 hover:text-neutral-950 transition-colors"
                  title="Remove from saved"
                  aria-label={`Remove ${job.title} from saved jobs`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {job.hasApplied && job.existingApplicationId ? (
                  <Link href={`/jobs/applications/${job.existingApplicationId}`} className="px-4 py-2.5 bg-neutral-950 text-white font-bold text-xs rounded-xl">
                    View application ({job.applicationStatus?.replaceAll("_", " ")})
                  </Link>
                ) : <button
                  disabled={!job.isAvailable}
                  onClick={() =>
                    setApplyModalJob({
                      id: job.id,
                      title: job.title,
                      company: job.company,
                    })
                  }
                  className="px-4 py-2.5 bg-neutral-950 text-white font-bold text-xs rounded-xl hover:bg-neutral-800 transition-all flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                  <span>{job.isAvailable ? "Apply Now" : "Applications closed"}</span>
                </button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Application Modal */}
      {applyModalJob && (
        <ApplyJobModal
          isOpen={Boolean(applyModalJob)}
          onClose={() => setApplyModalJob(null)}
          jobId={applyModalJob.id}
          jobTitle={applyModalJob.title}
          companyName={applyModalJob.company}
          onApplicationSuccess={() => {
            fetchSavedJobs();
          }}
        />
      )}
    </div>
  );
}
