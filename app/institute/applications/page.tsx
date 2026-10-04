"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, ArrowUpRight, Sparkles, RefreshCw, CheckCircle2 } from "lucide-react";
import { Sidebar } from "@/components/shell/sidebar";
import { Header } from "@/components/shell/header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ApplicationItem {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  department: string;
  jobTitle: string;
  companyName: string;
  location: string;
  status: string;
  appliedAt: string;
}

const STATUS_OPTIONS = [
  { value: "APPLIED", label: "Applied" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "SHORTLISTED", label: "Shortlisted" },
  { value: "INTERVIEW", label: "Interview Scheduled" },
  { value: "OFFERED", label: "Offered / Placed" },
  { value: "REJECTED", label: "Rejected" },
];

export default function InstituteApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchApps = useCallback(async () => {
    try {
      const query = new URLSearchParams();
      if (statusFilter !== "ALL") query.set("status", statusFilter);
      if (search.trim()) query.set("search", search.trim());

      const res = await fetch(`/api/institute/applications?${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.applications) {
          setApplications(json.applications);
        }
      }
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  // Real-Time Polling every 8 seconds
  useEffect(() => {
    fetchApps();
    const interval = setInterval(fetchApps, 8000);
    return () => clearInterval(interval);
  }, [fetchApps]);

  const handleStatusChange = async (appId: string, newStatus: string) => {
    setUpdatingId(appId);
    try {
      const res = await fetch(`/api/institute/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setApplications((prev) =>
            prev.map((app) => (app.id === appId ? { ...app, status: newStatus } : app))
          );
          setToastMessage(`Status updated to ${newStatus}`);
          setTimeout(() => setToastMessage(null), 3000);
        }
      }
    } catch {
      // Silently handle
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSeedDemoData = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch("/api/institute/applications/seed", { method: "POST" });
      if (res.ok) {
        await fetchApps();
        setToastMessage("Demo application pipeline records created successfully!");
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch {
      // Silently handle
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#FAFAFA] text-neutral-950 font-sans overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar" data-lenis-prevent="true">
        <Header />

        <main className="p-6 sm:p-10 space-y-8 max-w-7xl mx-auto w-full">
          {/* Real-time Toast Alert */}
          {toastMessage && (
            <div className="p-4 bg-neutral-950 text-white font-mono text-xs rounded-2xl flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {toastMessage}
              </span>
              <button onClick={() => setToastMessage(null)} className="text-neutral-400 hover:text-white">✕</button>
            </div>
          )}

          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200/80 pb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-950 flex items-center gap-3">
                Institutional Application Tracker
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Pipeline
                </span>
              </h1>
              <p className="text-xs text-neutral-500 font-mono mt-0.5">
                Real-Time Campus Pipeline ({applications.length} Active Student Applications Recorded)
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchApps}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Refresh Live Data
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleSeedDemoData}
                isLoading={isSeeding}
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Load Demo Applications
              </Button>
            </div>
          </div>

          {/* Search & Filter bar */}
          <Card className="border border-neutral-200/90 rounded-2xl bg-white p-4 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
                <Input
                  type="text"
                  placeholder="Search candidate name, company, or role..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 text-xs h-10 rounded-xl"
                />
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-neutral-200/90 rounded-xl text-xs font-semibold text-neutral-900 focus:border-neutral-950 focus:outline-none"
                >
                  <option value="ALL">All Application Pipeline Statuses</option>
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Applications Data Table */}
          <Card className="border border-neutral-200/90 rounded-3xl bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200/80 text-[10px] font-mono font-bold tracking-wider text-neutral-500 uppercase">
                  <tr>
                    <th className="py-3.5 px-6">STUDENT CANDIDATE</th>
                    <th className="py-3.5 px-4">DEPARTMENT</th>
                    <th className="py-3.5 px-4">TARGET JOB ROLE</th>
                    <th className="py-3.5 px-4">COMPANY / EMPLOYER</th>
                    <th className="py-3.5 px-4">REAL-TIME PIPELINE STATUS</th>
                    <th className="py-3.5 px-6 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs font-mono text-neutral-400">
                        Loading live student application pipeline...
                      </td>
                    </tr>
                  ) : applications.length > 0 ? (
                    applications.map((app) => (
                      <tr key={app.id} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="py-4 px-6">
                          <Link
                            href={`/institute/students/${app.studentId}`}
                            className="font-extrabold text-neutral-950 text-sm hover:underline"
                          >
                            {app.studentName}
                          </Link>
                          <div className="text-[11px] text-neutral-500 font-mono">{app.studentEmail}</div>
                        </td>

                        <td className="py-4 px-4 font-medium text-neutral-800">{app.department}</td>

                        <td className="py-4 px-4 font-bold text-neutral-950">{app.jobTitle}</td>

                        <td className="py-4 px-4 font-semibold text-neutral-800">{app.companyName}</td>

                        <td className="py-4 px-4">
                          <select
                            value={app.status}
                            disabled title="Hiring status is managed by the employer"
                            onChange={(e) => handleStatusChange(app.id, e.target.value)}
                            className="px-2.5 py-1 text-[11px] font-mono font-bold bg-neutral-100 border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-950 cursor-pointer disabled:opacity-50"
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="py-4 px-6 text-right">
                          <Link href={`/institute/students/${app.studentId}`}>
                            <Button variant="outline" size="sm" className="h-8 text-[11px] rounded-lg">
                              Student Profile <ArrowUpRight className="w-3 h-3 ml-1" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs font-mono text-neutral-500 space-y-3">
                        <div>No student application pipeline records found in database.</div>
                        <div>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={handleSeedDemoData}
                            isLoading={isSeeding}
                            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                          >
                            Generate Real-Time Demo Pipeline
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
