"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Users,
  CheckCircle2,
  Briefcase,
  ArrowUpRight,
  ShieldCheck,
  UserCheck,
  ChevronRight,
  Clock,
  Sparkles,
} from "lucide-react";
import { Sidebar } from "@/components/shell/sidebar";
import { Header } from "@/components/shell/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DashboardData {
  instituteName: string;
  verificationStatus: string;
  totalStudents: number;
  activeStudents: number;
  consentingStudents: number;
  placementReadyCount: number;
  totalApplications: number;
  shortlistedCount: number;
  interviewsCount: number;
  offersCount: number;
  placedCount: number;
  funnel: {
    totalStudents: number;
    profileCompleteCount: number;
    resumeReadyCount: number;
    atsReadyCount: number;
    interviewReadyCount: number;
    placementReadyCount: number;
    placedCount: number;
  };
  recentApplications: Array<{
    id: string;
    studentName: string;
    studentEmail: string;
    companyName: string;
    jobTitle: string;
    status: string;
    appliedAt: string;
  }>;
}

export default function InstituteDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/institute/dashboard");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.stats) {
            setData(json.stats);
          }
        }
      } catch {
        // Handle error gracefully
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  return (
    <div className="flex h-screen bg-[#FAFAFA] text-neutral-950 font-sans overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar" data-lenis-prevent="true">
        <Header />

        <main className="p-6 sm:p-10 space-y-8 max-w-7xl mx-auto w-full">
          {data && <p className="text-sm text-neutral-600">Preparation metrics cover {data.consentingStudents} of {data.totalStudents} students who consented to analytics sharing.</p>}
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200/80 pb-6">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-neutral-950 text-white flex items-center justify-center font-semibold shadow-md">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-950">
                    {loading ? "Institute Portal" : data?.instituteName || "Campus Ecosystem"}
                  </h1>
                  <Badge variant="dark" className="font-mono text-[10px]">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    {data?.verificationStatus || "Loading"}
                  </Badge>
                </div>
                <p className="text-xs text-neutral-500 font-mono mt-0.5">
                  Institutional Placement Control Center & Student Career Intelligence
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/institute/students">
                <Button variant="primary" size="sm" rightIcon={<Users className="w-4 h-4" />}>
                  Manage Students
                </Button>
              </Link>
              <Link href="/institute/reports">
                <Button variant="outline" size="sm">
                  Placement Reports
                </Button>
              </Link>
            </div>
          </div>

          {/* Key Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <Card className="border border-neutral-200/90 shadow-xs bg-white rounded-2xl p-5 hover:border-neutral-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold tracking-wider text-neutral-500 uppercase">
                  TOTAL STUDENTS
                </span>
                <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center">
                  <Users className="w-4 h-4 text-neutral-700" />
                </div>
              </div>
              <div className="text-3xl font-black text-neutral-950 mt-2">
                {loading ? "..." : data?.totalStudents || 0}
              </div>
              <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                100% Campus Enrolled
              </p>
            </Card>

            <Card className="border border-neutral-200/90 shadow-xs bg-white rounded-2xl p-5 hover:border-neutral-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold tracking-wider text-neutral-500 uppercase">
                  CHECKLIST COMPLETE
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <div className="text-3xl font-black text-emerald-700 mt-2">
                {loading ? "..." : data?.placementReadyCount || 0}
              </div>
              <p className="text-xs text-neutral-500 mt-1 font-mono">
                {data?.consentingStudents
                  ? Math.round(((data.placementReadyCount || 0) / data.consentingStudents) * 100)
                  : 0}
                % Readiness Rate
              </p>
            </Card>

            <Card className="border border-neutral-200/90 shadow-xs bg-white rounded-2xl p-5 hover:border-neutral-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold tracking-wider text-neutral-500 uppercase">
                  APPLICATIONS
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div className="text-3xl font-black text-neutral-950 mt-2">
                {loading ? "..." : data?.totalApplications || 0}
              </div>
              <p className="text-xs text-neutral-500 mt-1 font-mono">
                Active Student Pipeline
              </p>
            </Card>

            <Card className="border border-neutral-200/90 shadow-xs bg-white rounded-2xl p-5 hover:border-neutral-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold tracking-wider text-neutral-500 uppercase">
                  OFFERS & PLACED
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <div className="text-3xl font-black text-neutral-950 mt-2">
                {loading ? "..." : (data?.offersCount || 0) + (data?.placedCount || 0)}
              </div>
              <p className="text-xs text-neutral-500 mt-1 font-mono">
                Verified Hire Outcomes
              </p>
            </Card>
          </div>

          {/* Placement Readiness Funnel Section */}
          <Card className="border border-neutral-200/90 rounded-3xl bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-5">
              <div>
                <h3 className="text-xl font-black tracking-tight text-neutral-950">
                  Preparation Checklist Coverage
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Deterministic pipeline tracking student profile completion, ATS match capability, and mock interview scores.
                </p>
              </div>
              <Link href="/institute/analytics" className="text-xs font-bold text-neutral-950 hover:underline flex items-center gap-1">
                View Detailed Analytics <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
              <div className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-2xl space-y-1">
                <div className="text-[10px] font-mono text-neutral-400 font-bold uppercase">PROFILE DONE</div>
                <div className="text-2xl font-black text-neutral-950">{data?.funnel?.profileCompleteCount || 0}</div>
                <div className="text-[10px] text-neutral-500 font-mono">Score &ge; 80%</div>
              </div>

              <div className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-2xl space-y-1">
                <div className="text-[10px] font-mono text-neutral-400 font-bold uppercase">RESUME READY</div>
                <div className="text-2xl font-black text-neutral-950">{data?.funnel?.resumeReadyCount || 0}</div>
                <div className="text-[10px] text-neutral-500 font-mono">&ge; 1 Active Resume</div>
              </div>

              <div className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-2xl space-y-1">
                <div className="text-[10px] font-mono text-neutral-400 font-bold uppercase">ATS VERIFIED</div>
                <div className="text-2xl font-black text-neutral-950">{data?.funnel?.atsReadyCount || 0}</div>
                <div className="text-[10px] text-neutral-500 font-mono">Avg ATS &ge; 75</div>
              </div>

              <div className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-2xl space-y-1">
                <div className="text-[10px] font-mono text-neutral-400 font-bold uppercase">INTERVIEW READY</div>
                <div className="text-2xl font-black text-neutral-950">{data?.funnel?.interviewReadyCount || 0}</div>
                <div className="text-[10px] text-neutral-500 font-mono">Mock Score &ge; 70</div>
              </div>

              <div className="p-4 bg-emerald-50/70 border border-emerald-200/90 rounded-2xl space-y-1">
                <div className="text-[10px] font-mono text-emerald-700 font-bold uppercase">CHECKLIST COMPLETE</div>
                <div className="text-2xl font-black text-emerald-800">{data?.funnel?.placementReadyCount || 0}</div>
                <div className="text-[10px] text-emerald-600 font-mono">All 4 Satisfied</div>
              </div>

              <div className="p-4 bg-purple-50/70 border border-purple-200/90 rounded-2xl space-y-1">
                <div className="text-[10px] font-mono text-purple-700 font-bold uppercase">PLACED</div>
                <div className="text-2xl font-black text-purple-800">{data?.funnel?.placedCount || 0}</div>
                <div className="text-[10px] text-purple-600 font-mono">Offers & Placed</div>
              </div>
            </div>
          </Card>

          {/* Recent Applications & Quick Actions split grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Recent Student Applications */}
            <Card className="lg:col-span-2 border border-neutral-200/90 rounded-3xl bg-white p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-neutral-700" />
                  <h3 className="text-lg font-black tracking-tight text-neutral-950">Recent Student Applications</h3>
                </div>
                <Link href="/institute/applications" className="text-xs font-bold text-neutral-950 hover:underline">
                  View All ({data?.totalApplications || 0})
                </Link>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs font-mono text-neutral-400">Loading live application stream...</div>
              ) : data?.recentApplications && data.recentApplications.length > 0 ? (
                <div className="space-y-3">
                  {data.recentApplications.map((app) => (
                    <div
                      key={app.id}
                      className="p-4 bg-neutral-50/70 border border-neutral-200/80 rounded-2xl flex items-center justify-between gap-4 hover:border-neutral-300 transition-all"
                    >
                      <div className="space-y-0.5">
                        <div className="text-sm font-extrabold text-neutral-950">{app.studentName}</div>
                        <div className="text-xs text-neutral-500 flex items-center gap-2">
                          <span>{app.jobTitle}</span>
                          <span>•</span>
                          <span className="font-semibold text-neutral-800">{app.companyName}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            app.status === "OFFERED"
                              ? "success"
                              : app.status === "SHORTLISTED" || app.status === "INTERVIEW"
                              ? "dark"
                              : "subtle"
                          }
                          className="font-mono text-[10px]"
                        >
                          {app.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs font-mono text-neutral-400">
                  No active student applications recorded yet.
                </div>
              )}
            </Card>

            {/* Right Col: Quick Portal Controls */}
            <Card className="border border-neutral-200/90 rounded-3xl bg-white p-6 shadow-xs space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-neutral-950" />
                  <h3 className="text-lg font-black tracking-tight text-neutral-950">Campus Operations</h3>
                </div>

                <div className="space-y-2">
                  <Link href="/institute/students" className="block p-3.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 rounded-2xl transition-all group">
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-950">
                      <span>Student Roster</span>
                      <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5">Filter candidates by department, ATS score & placement status.</p>
                  </Link>

                  <Link href="/institute/jobs" className="block p-3.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 rounded-2xl transition-all group">
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-950">
                      <span>Campus Jobs Marketplace</span>
                      <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5">View active employer openings & student applicant counts.</p>
                  </Link>

                  <Link href="/institute/settings" className="block p-3.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 rounded-2xl transition-all group">
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-950">
                      <span>Institute Settings</span>
                      <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5">Manage logo, verification details & contact email.</p>
                  </Link>
                </div>
              </div>

              <div className="p-4 bg-neutral-950 text-white rounded-2xl space-y-2">
                <div className="text-xs font-extrabold">Instant Roster Import</div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Upload CSV files to invite students. They join your campus roster after accepting the invitation.
                </p>
                <Link href="/institute/students" className="inline-block pt-1">
                  <span className="text-xs font-extrabold text-white underline">Import Student Roster &rarr;</span>
                </Link>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
