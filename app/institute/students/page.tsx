"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Upload,
} from "lucide-react";
import { Sidebar } from "@/components/shell/sidebar";
import { Header } from "@/components/shell/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Student {
  id: string;
  name: string;
  email: string;
  studentId: string | null;
  department: string;
  course: string;
  graduationYear: number;
  profileCompletion: number;
  resumesCount: number;
  averageAtsScore: number;
  averageInterviewScore: number;
  placementStatus: string;
  readiness: {
    isProfileReady: boolean;
    isResumeReady: boolean;
    isAtsReady: boolean;
    isInterviewReady: boolean;
    isPlacementReady: boolean;
    readinessCategory: "Checklist Complete" | "Needs Improvement" | "Not Ready";
  };
}

export default function InstituteStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("ALL");
  const [readinessStatus, setReadinessStatus] = useState("ALL");
  const [placementStatus, setPlacementStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // CSV Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: "15",
      });
      if (search.trim()) query.set("search", search.trim());
      if (department !== "ALL") query.set("department", department);
      if (readinessStatus !== "ALL") query.set("readinessStatus", readinessStatus);
      if (placementStatus !== "ALL") query.set("placementStatus", placementStatus);

      const res = await fetch(`/api/institute/students?${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setStudents(json.data.students || []);
          setTotalPages(json.data.totalPages || 1);
          setTotalCount(json.data.totalCount || 0);
        }
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }, [search, department, readinessStatus, placementStatus, page]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const lines = csvText.trim().split("\n");
      const rows = lines.map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        return {
          name: parts[0] || "",
          email: parts[1] || "",
          studentId: parts[2] || undefined,
          department: parts[3] || undefined,
          course: parts[4] || undefined,
          graduationYear: parts[5] ? parseInt(parts[5], 10) : undefined,
        };
      });

      const res = await fetch("/api/institute/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setImportResult(`Successfully imported ${json.result.importedCount} students (${json.result.skippedCount} skipped).`);
        fetchStudents();
        setTimeout(() => {
          setIsImportModalOpen(false);
          setCsvText("");
          setImportResult(null);
        }, 2000);
      } else {
        setImportResult(`Import failed: ${json.error || "Invalid file format."}`);
      }
    } catch {
      setImportResult("Failed to import CSV roster.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#FAFAFA] text-neutral-950 font-sans overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar" data-lenis-prevent="true">
        <Header />

        <main className="p-6 sm:p-10 space-y-8 max-w-7xl mx-auto w-full">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200/80 pb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-950">
                Student Roster Directory
              </h1>
              <p className="text-xs text-neutral-500 font-mono mt-0.5">
                Institutional Student Management & Placement Readiness Overview ({totalCount} Enrolled)
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/institute/students/import">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Upload className="w-4 h-4" />}
                >
                  Import CSV Roster
                </Button>
              </Link>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <Card className="border border-neutral-200/90 rounded-2xl bg-white p-4 sm:p-5 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
                <Input
                  type="text"
                  placeholder="Search name, email, ID..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10 text-xs h-10 rounded-xl"
                />
              </div>

              {/* Department selector */}
              <div>
                <select
                  value={department}
                  onChange={(e) => {
                    setDepartment(e.target.value);
                    setPage(1);
                  }}
                  className="w-full h-10 px-3 bg-white border border-neutral-200/90 rounded-xl text-xs font-semibold text-neutral-900 focus:border-neutral-950 focus:outline-none"
                >
                  <option value="ALL">All Departments</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Electrical Engineering">Electrical Engineering</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                  <option value="Data Science">Data Science</option>
                </select>
              </div>

              {/* Readiness Status selector */}
              <div>
                <select
                  value={readinessStatus}
                  onChange={(e) => {
                    setReadinessStatus(e.target.value);
                    setPage(1);
                  }}
                  className="w-full h-10 px-3 bg-white border border-neutral-200/90 rounded-xl text-xs font-semibold text-neutral-900 focus:border-neutral-950 focus:outline-none"
                >
                  <option value="ALL">All Readiness States</option>
                  <option value="READY">Checklist Complete</option>
                  <option value="NEEDS_IMPROVEMENT">Needs Improvement</option>
                  <option value="NOT_READY">Not Ready</option>
                </select>
              </div>

              {/* Placement Status selector */}
              <div>
                <select
                  value={placementStatus}
                  onChange={(e) => {
                    setPlacementStatus(e.target.value);
                    setPage(1);
                  }}
                  className="w-full h-10 px-3 bg-white border border-neutral-200/90 rounded-xl text-xs font-semibold text-neutral-900 focus:border-neutral-950 focus:outline-none"
                >
                  <option value="ALL">All Placement Statuses</option>
                  <option value="LOOKING">Looking for Jobs</option>
                  <option value="APPLIED">Applied</option>
                  <option value="SHORTLISTED">Shortlisted</option>
                  <option value="INTERVIEW">In Interviews</option>
                  <option value="OFFERED">Offered</option>
                  <option value="PLACED">Placed</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Student Roster Data Table */}
          <Card className="border border-neutral-200/90 rounded-3xl bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200/80 text-[10px] font-mono font-bold tracking-wider text-neutral-500 uppercase">
                  <tr>
                    <th className="py-3.5 px-6">STUDENT</th>
                    <th className="py-3.5 px-4">DEPARTMENT</th>
                    <th className="py-3.5 px-4">PROFILE</th>
                    <th className="py-3.5 px-4">RESUMES</th>
                    <th className="py-3.5 px-4">AVG ATS</th>
                    <th className="py-3.5 px-4">READINESS</th>
                    <th className="py-3.5 px-6 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs font-mono text-neutral-400">
                        Loading student directory...
                      </td>
                    </tr>
                  ) : students.length > 0 ? (
                    students.map((student) => (
                      <tr key={student.id} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="py-4 px-6">
                          <Link href={`/institute/students/${student.id}`} className="font-extrabold text-neutral-950 text-sm hover:underline">
                            {student.name}
                          </Link>
                          <div className="text-[11px] text-neutral-500 font-mono">
                            {student.email} {student.studentId ? `• ID: ${student.studentId}` : ""}
                          </div>
                        </td>

                        <td className="py-4 px-4 font-medium text-neutral-800">
                          <div>{student.department}</div>
                          <div className="text-[10px] text-neutral-400 font-mono">
                            {student.course} ({student.graduationYear})
                          </div>
                        </td>

                        <td className="py-4 px-4 font-mono font-bold text-neutral-900">
                          {student.profileCompletion}%
                        </td>

                        <td className="py-4 px-4 font-mono text-neutral-800">
                          {student.resumesCount > 0 ? (
                            <span className="text-emerald-700 font-bold">✓ {student.resumesCount} Ready</span>
                          ) : (
                            <span className="text-neutral-400">0 Resumes</span>
                          )}
                        </td>

                        <td className="py-4 px-4 font-mono">
                          {student.averageAtsScore > 0 ? (
                            <span
                              className={`font-black ${
                                student.averageAtsScore >= 75
                                  ? "text-emerald-700"
                                  : student.averageAtsScore >= 60
                                  ? "text-amber-600"
                                  : "text-neutral-500"
                              }`}
                            >
                              {student.averageAtsScore}/100
                            </span>
                          ) : (
                            <span className="text-neutral-400">No Scans</span>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          <Badge
                            variant={
                              student.readiness.isPlacementReady
                                ? "success"
                                : student.readiness.readinessCategory === "Needs Improvement"
                                ? "subtle"
                                : "outline"
                            }
                            className="font-mono text-[10px]"
                          >
                            {student.readiness.readinessCategory}
                          </Badge>
                        </td>

                        <td className="py-4 px-6 text-right">
                          <Link href={`/institute/students/${student.id}`}>
                            <Button variant="outline" size="sm" className="h-8 text-[11px] rounded-lg">
                              View Profile <ArrowUpRight className="w-3 h-3 ml-1" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs font-mono text-neutral-400">
                        No students found matching current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-neutral-100 flex items-center justify-between text-xs font-mono">
                <span className="text-neutral-500">
                  Page {page} of {totalPages} ({totalCount} total students)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </main>
      </div>

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs overflow-y-auto p-4 sm:p-6">
          <div className="min-h-full flex items-start justify-center py-6 sm:py-12">
            <div className="w-full max-w-lg bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-neutral-950" />
                <h3 className="text-lg font-black text-neutral-950">Import Student Roster (CSV)</h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-xs font-bold text-neutral-400 hover:text-neutral-950"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-500 leading-relaxed">
              Paste comma-separated rows in the format: <br />
              <code className="font-mono text-[11px] text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded mt-1 inline-block">
                Name, Email, StudentID, Department, Course, GraduationYear
              </code>
            </p>

            <form onSubmit={handleCsvImport} className="space-y-4">
              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={`Alex Morgan, alex.morgan@campus.edu, CS202701, Computer Science, B.Tech, 2027\nDavid Chen, david.chen@campus.edu, IT202702, Information Technology, B.Tech, 2027`}
                className="w-full p-3 border border-neutral-200 rounded-xl font-mono text-xs text-neutral-900 focus:border-neutral-950 outline-none"
                required
              />

              {importResult && (
                <div className="p-3 bg-neutral-100 text-neutral-950 text-xs font-mono font-bold rounded-xl">
                  {importResult}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsImportModalOpen(false)}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isImporting}
                  leftIcon={<Upload className="w-4 h-4" />}
                >
                  Upload Roster
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
