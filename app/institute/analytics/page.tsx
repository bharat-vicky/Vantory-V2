"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  Zap,
  Download,
  FileText,
  ShieldCheck,
  Users,
  Briefcase,
  Sparkles,
} from "lucide-react";
import { Sidebar } from "@/components/shell/sidebar";
import { Header } from "@/components/shell/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AnalyticsData {
  totalMembers: number;
  consentingStudents: number;
  funnel: {
    totalStudents: number;
    profileCompleteCount: number;
    resumeReadyCount: number;
    atsReadyCount: number;
    interviewReadyCount: number;
    placementReadyCount: number;
    placedCount: number;
  };
  departmentAnalytics: Array<{
    department: string;
    totalStudents: number;
    placementReadyCount: number;
    placedCount: number;
  }>;
  topSkills: Array<{
    skill: string;
    count: number;
  }>;
}

function InstituteAnalyticsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "reports" ? "reports" : "analytics";

  const [activeTab, setActiveTab] = useState<"analytics" | "reports">(initialTab);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/institute/analytics");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.analytics) {
            setAnalytics(json.analytics);
          }
        }
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  const handleDownloadReport = async (
    reportType: "readiness" | "department" | "placement" | "applications" | "skills"
  ) => {
    setDownloadingReport(reportType);
    try {
      const res = await fetch(`/api/institute/reports?type=${reportType}&format=csv`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute(
          "download",
          `Vantory_${reportType.toUpperCase()}_Report_${new Date().toISOString().split("T")[0]}.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch {
      // Handle error
    } finally {
      setDownloadingReport(null);
    }
  };

  const reportsList = [
    {
      id: "readiness" as const,
      title: "1. Preparation Checklist Report",
      description:
        "Complete student candidate roster, individual ATS scores, resume availability, mock interview metrics, and deterministic readiness classification.",
      icon: FileText,
    },
    {
      id: "department" as const,
      title: "2. Department Performance Breakdown",
      description:
        "Aggregated department metrics comparing readiness counts, placement rates, student volume, and campus readiness percentages.",
      icon: BarChart3,
    },
    {
      id: "placement" as const,
      title: "3. Student Placement Tracking Report",
      description:
        "Tracks student placement status (Placed vs Looking), application submission count, and interview counts.",
      icon: Users,
    },
    {
      id: "applications" as const,
      title: "4. Campus Application Pipeline Report",
      description:
        "Comprehensive log of candidate job applications submitted to corporate employers with real-time status progression.",
      icon: Briefcase,
    },
    {
      id: "skills" as const,
      title: "5. Campus Skills Matrix Audit",
      description:
        "Aggregated candidate technical skill distribution, top technology frequency, and campus roster skill coverage.",
      icon: Sparkles,
    },
  ];

  return (
    <div className="flex h-screen bg-[#FAFAFA] text-neutral-950 font-sans overflow-hidden">
      <Sidebar />

      <div
        className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar"
        data-lenis-prevent="true"
      >
        <Header />

        <main className="p-6 sm:p-10 space-y-8 max-w-7xl mx-auto w-full">
          {analytics && <p role="status" className="text-sm text-neutral-600">Analytics cover {analytics.consentingStudents} of {analytics.totalMembers} students who consented to sharing. Unshared activity is excluded.</p>}
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200/80 pb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-950">
                Placement Analytics & Reports
              </h1>
              <p className="text-xs text-neutral-500 font-mono mt-0.5">
                Campus Placement Activity, Department Performance & Consent-aware CSV Exports
              </p>
            </div>

            {/* Tab Navigation Controls */}
            <div className="flex items-center gap-1.5 p-1.5 bg-neutral-200/60 rounded-2xl border border-neutral-300/80">
              <button
                onClick={() => setActiveTab("analytics")}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === "analytics"
                    ? "bg-neutral-950 text-white shadow-xs"
                    : "text-neutral-700 hover:text-neutral-950 hover:bg-neutral-200/80"
                }`}
              >
                Placement Analytics
              </button>
              <button
                onClick={() => setActiveTab("reports")}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === "reports"
                    ? "bg-neutral-950 text-white shadow-xs"
                    : "text-neutral-700 hover:text-neutral-950 hover:bg-neutral-200/80"
                }`}
              >
                Reports & Data Export
              </button>
            </div>
          </div>

          {/* TAB 1: PLACEMENT ANALYTICS */}
          {activeTab === "analytics" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Department Readiness Breakdown Table */}
              <Card className="border border-neutral-200/90 rounded-3xl bg-white p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <BarChart3 className="w-5 h-5 text-neutral-950" />
                    <h3 className="text-lg font-black text-neutral-950">
                      Department-Level Readiness Breakdown
                    </h3>
                  </div>
                  <Badge variant="dark" className="font-mono text-[10px]">
                    RECORDED ACTIVITY
                  </Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 border-b border-neutral-200/80 text-[10px] font-mono font-bold tracking-wider text-neutral-500 uppercase">
                      <tr>
                        <th className="py-3 px-4">DEPARTMENT</th>
                        <th className="py-3 px-4">TOTAL STUDENTS</th>
                        <th className="py-3 px-4">CHECKLIST COMPLETE</th>
                        <th className="py-3 px-4">READINESS RATE</th>
                        <th className="py-3 px-4">OFFERS / PLACED</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 font-mono">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-xs text-neutral-400">
                            Loading department data...
                          </td>
                        </tr>
                      ) : analytics?.departmentAnalytics && analytics.departmentAnalytics.length > 0 ? (
                        analytics.departmentAnalytics.map((dept) => {
                          const rate =
                            dept.totalStudents > 0
                              ? Math.round((dept.placementReadyCount / dept.totalStudents) * 100)
                              : 0;
                          return (
                            <tr key={dept.department} className="hover:bg-neutral-50/80">
                              <td className="py-3.5 px-4 font-sans font-extrabold text-neutral-950">
                                {dept.department}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-neutral-900">
                                {dept.totalStudents}
                              </td>
                              <td className="py-3.5 px-4 text-emerald-700 font-black">
                                {dept.placementReadyCount}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-neutral-950">{rate}%</td>
                              <td className="py-3.5 px-4 text-purple-700 font-black">
                                {dept.placedCount}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-xs text-neutral-400">
                            No shared department activity available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Skills Frequency Distribution Card */}
              <Card className="border border-neutral-200/90 rounded-3xl bg-white p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <Zap className="w-5 h-5 text-neutral-950" />
                    <h3 className="text-lg font-black text-neutral-950">
                      Top Campus Technical Skills Distribution
                    </h3>
                  </div>
                  <Badge variant="subtle" className="font-mono text-[10px]">
                    ROSTER SKILLS MATRIX
                  </Badge>
                </div>

                {loading ? (
                  <div className="py-8 text-center text-xs font-mono text-neutral-400">
                    Calculating skills distribution...
                  </div>
                ) : analytics?.topSkills && analytics.topSkills.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {analytics.topSkills.map((item) => (
                      <div
                        key={item.skill}
                        className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-2xl flex items-center justify-between"
                      >
                        <span className="text-xs font-bold text-neutral-900">{item.skill}</span>
                        <Badge variant="dark" className="font-mono text-[10px]">
                          {item.count} Students
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs font-mono text-neutral-400">
                    No technical skills available from students sharing analytics.
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB 2: PLACEMENT REPORTS & CSV EXPORT */}
          {activeTab === "reports" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-neutral-950">
                    Institutional Reports & Data Export
                  </h2>
                  <p className="text-xs text-neutral-500 font-mono mt-0.5">
                    Export Recorded Placement Activity & Shared Student Metrics
                  </p>
                </div>

                <Badge
                  variant="outline"
                  className="font-mono text-xs px-3 py-1.5 border-neutral-300 bg-white"
                >
                  <ShieldCheck className="w-4 h-4 text-neutral-950 inline mr-1.5" />
                  RECORDED PLATFORM ACTIVITY
                </Badge>
              </div>

              {/* 5 Formal Institutional Reports Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reportsList.map((report) => {
                  const Icon = report.icon;
                  const isDownloading = downloadingReport === report.id;

                  return (
                    <Card
                      key={report.id}
                      className="border border-neutral-200/90 rounded-3xl bg-white p-6 sm:p-8 shadow-xs space-y-4 hover:border-neutral-400 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-neutral-950 text-white flex items-center justify-center shrink-0">
                            <Icon className="w-5 h-5" />
                          </div>
                          <h3 className="text-base font-extrabold text-neutral-950 tracking-tight">
                            {report.title}
                          </h3>
                        </div>
                        <p className="text-xs text-neutral-600 leading-relaxed font-normal">
                          {report.description}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase">
                          CSV FORMAT
                        </span>
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={isDownloading}
                          onClick={() => handleDownloadReport(report.id)}
                          leftIcon={<Download className="w-3.5 h-3.5" />}
                        >
                          Export CSV Report
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function InstituteAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen bg-[#FAFAFA] items-center justify-center font-mono text-xs text-neutral-400">
          Loading Placement Analytics & Reports...
        </div>
      }
    >
      <InstituteAnalyticsContent />
    </Suspense>
  );
}
