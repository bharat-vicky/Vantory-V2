"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { InterviewDetails } from "@/components/jobs/InterviewDetails";
import type { InterviewSchedule } from "@/lib/jobs/interview-schedule";
import {
  Briefcase,
  Clock,
  ArrowLeft,
  FileCheck,
  Building,
  Calendar,
  AlertTriangle,
} from "lucide-react";

interface TimelineEvent {
  status: string;
  title: string;
  timestamp: string;
  note?: string;
}

interface ApplicationDetailData {
  id: string;
  status: string;
  appliedAt: string;
  coverNote?: string;
  job: {
    id: string;
    title: string;
    company: string;
    companyLogo?: string;
    location: string;
    workMode: string;
    type: string;
    salary?: string;
    description: string;
    requirements: string;
  };
  resume?: {
    id: string;
    title: string;
    templateId: string;
    updatedAt: string;
  };
  timeline: TimelineEvent[];
  interview: InterviewSchedule | null;
}

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: appId } = use(params);

  const [application, setApplication] = useState<ApplicationDetailData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState<boolean>(false);

  const loadDetails = React.useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/applications/${appId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.application) {
          setApplication(json.application);
        } else {
          setError(json.error || "Application not found.");
        }
      } else {
        setError("Failed to load application details.");
      }
    } catch {
      setError("Error connecting to server.");
    } finally {
      setIsLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const handleWithdrawConfirm = async () => {
    setIsWithdrawing(true);
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "withdraw" }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setShowWithdrawConfirm(false);
        loadDetails();
      } else {
        alert(json.error || "Failed to withdraw application.");
      }
    } catch {
      alert("Error processing withdrawal.");
    } finally {
      setIsWithdrawing(false);
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

  if (error || !application) {
    return (
      <div className="min-h-screen bg-white text-neutral-950 p-10 flex flex-col items-center justify-center space-y-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center">
          <Briefcase className="w-6 h-6 text-neutral-500" />
        </div>
        <h2 className="text-xl font-bold text-neutral-950">Application Not Found</h2>
        <p className="text-xs text-neutral-500 max-w-sm">{error || "The requested application does not exist or you do not have permission to view it."}</p>
        <Link
          href="/jobs/applications"
          className="px-4 py-2.5 bg-neutral-950 text-white font-bold text-xs rounded-xl hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-md"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
          <span>Back to Applications</span>
        </Link>
      </div>
    );
  }

  const isEligibleToWithdraw = application.status !== "WITHDRAWN" && application.status !== "REJECTED";

  return (
    <div className="min-h-screen bg-white text-neutral-950 font-sans p-6 md:p-10 space-y-8">
      {/* Back Navigation */}
      <div>
        <Link
          href="/jobs/applications"
          className="inline-flex items-center gap-2 text-xs font-mono text-neutral-500 hover:text-neutral-950 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Applications Tracking</span>
        </Link>
      </div>

      {/* Application Overview Header */}
      <div className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-neutral-200 pb-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-neutral-950 font-mono font-black text-xl text-white flex items-center justify-center shrink-0">
              {application.job.companyLogo || application.job.company.charAt(0)}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-extrabold text-neutral-950">{application.job.company}</span>
                <span className="px-2.5 py-0.5 rounded font-mono text-[10px] font-bold bg-neutral-950 text-white">
                  {application.status}
                </span>
              </div>

              <h1 className="text-2xl font-black text-neutral-950 tracking-tight">
                {application.job.title}
              </h1>

              <div className="flex flex-wrap gap-2 pt-1 font-mono text-xs text-neutral-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Applied {new Date(application.appliedAt).toLocaleDateString()}</span>
                </span>
                <span>•</span>
                <span>{application.job.location}</span>
                <span>•</span>
                <span>{application.job.workMode}</span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href={`/jobs/${application.job.id}`}
              className="px-4 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs font-bold text-neutral-950 hover:bg-neutral-50 transition-all shadow-xs"
            >
              View Job Posting
            </Link>

            {isEligibleToWithdraw && (
              <button
                onClick={() => setShowWithdrawConfirm(true)}
                className="px-4 py-2.5 bg-neutral-100 border border-neutral-300 text-neutral-800 hover:text-neutral-950 font-bold text-xs rounded-xl hover:bg-neutral-200 transition-all cursor-pointer"
              >
                Withdraw Application
              </button>
            )}
          </div>
        </div>

        <InterviewDetails interview={application.interview} applicationId={application.id}/>
        {/* Withdrawal Confirmation Dialog */}
        {showWithdrawConfirm && (
          <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-950">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Are you sure you want to withdraw this application?</span>
            </div>
            <p className="text-xs text-neutral-600">
              Your application history record will remain available, but {application.job.company} will be notified that your application is withdrawn.
            </p>
            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={() => setShowWithdrawConfirm(false)}
                className="px-3 py-1.5 bg-white border border-neutral-300 text-neutral-800 text-xs font-semibold rounded-lg hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdrawConfirm}
                disabled={isWithdrawing}
                className="px-3 py-1.5 bg-neutral-950 text-white font-bold text-xs rounded-lg hover:bg-neutral-800"
              >
                {isWithdrawing ? "Withdrawing..." : "Confirm Withdrawal"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Application Timeline, Resume Used, Cover Note */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Timeline & Cover Note */}
        <div className="lg:col-span-8 space-y-6">
          {/* Application Timeline */}
          <div className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider border-b border-neutral-200 pb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-neutral-950" />
              <span>Application Activity Timeline</span>
            </h3>

            <div className="space-y-4 pl-2 relative border-l border-neutral-200">
              {application.timeline.map((event, idx) => (
                <div key={idx} className="relative pl-6 space-y-1">
                  <div className="w-3 h-3 rounded-full bg-neutral-950 border-2 border-white absolute -left-[6.5px] top-1"></div>
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="font-bold text-neutral-950">{event.status === "INTERVIEW" && event.title === "Interview Scheduled" ? "Moved to interview stage" : event.title}</span>
                    <span className="text-[10px] text-neutral-500">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {event.note && <p className="text-xs text-neutral-600 whitespace-pre-wrap">{event.note}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Submitted Cover Note */}
          {application.coverNote && (
            <div className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-6 space-y-3">
              <h3 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider border-b border-neutral-200 pb-2">
                Submitted Cover Note
              </h3>
              <p className="text-xs text-neutral-800 leading-relaxed font-mono whitespace-pre-line bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                {application.coverNote}
              </p>
            </div>
          )}

          {/* Job Requirements Recap */}
          <div className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-6 space-y-3">
            <h3 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider border-b border-neutral-200 pb-2">
              Job Requirements Recap
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed font-sans">
              {application.job.requirements}
            </p>
          </div>
        </div>

        {/* Right Column: Resume Used & Company Info */}
        <div className="lg:col-span-4 space-y-6">
          {/* Resume Used Card */}
          <div className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider border-b border-neutral-200 pb-2 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-neutral-950" />
              <span>Vantory Resume Submitted</span>
            </h3>

            {application.resume ? (
              <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2 text-xs">
                <div className="font-bold text-neutral-950">{application.resume.title}</div>
                <div className="text-[10px] font-mono text-neutral-500">
                  Template: {application.resume.templateId}
                </div>
                <div className="pt-2 border-t border-neutral-200">
                  <Link
                    href={`/api/applications/${application.id}/resume`}
                    className="text-xs text-neutral-950 font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <span>Download submitted resume</span>
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-xs text-neutral-500">Original resume unavailable for this historical application.</p>
            )}
          </div>

          {/* Company Contact */}
          <div className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-6 space-y-3">
            <h3 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider border-b border-neutral-200 pb-2 flex items-center gap-2">
              <Building className="w-4 h-4 text-neutral-950" />
              <span>Hiring Employer</span>
            </h3>

            <div className="space-y-1 text-xs">
              <div className="font-bold text-neutral-950">{application.job.company}</div>
              <div className="text-[10px] font-mono text-neutral-500">{application.job.location}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
