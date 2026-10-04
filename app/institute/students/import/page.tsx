"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Users,
  Check,
  Download,
  Sparkles,
  FileText,
} from "lucide-react";
import { Sidebar } from "@/components/shell/sidebar";
import { Header } from "@/components/shell/header";
import { Button } from "@/components/ui/button";

interface CsvParsedRow {
  studentId: string;
  name: string;
  email: string;
  department: string;
  course: string;
  graduationYear: number;
  status: "VALID" | "DUPLICATE" | "INVALID";
  reason?: string;
}

const SAMPLE_CSV_CONTENT = `studentId,fullName,email,department,course,graduationYear
CS-2025-01,Anupam Singh,anupam.singh@campus.edu,Computer Science,B.Tech,2025
CS-2025-02,Priya Sharma,priya.sharma@campus.edu,Computer Science,B.Tech,2025
EC-2026-01,Rahul Verma,rahul.verma@campus.edu,Electronics & Communication,B.Tech,2026
ME-2025-01,Sneha Patel,sneha.patel@campus.edu,Mechanical Engineering,M.Tech,2025
CS-2025-01,Duplicate Entry,anupam.singh@campus.edu,Computer Science,B.Tech,2025
INVALID-99,Invalid Candidate,invalid-email-address,Information Technology,B.Tech,2027`;

export default function StudentImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewTableRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<CsvParsedRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importResult, setImportResult] = useState<{
    importedCount: number;
    skippedCount: number;
    invitedCount?: number;
    conflicts?: Array<{ row: number; reason: string }>;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const invitationNotice = "New memberships require candidate acceptance in Profile. Share the Vantory signup link with new students; accounts are never assigned a shared password.";

  const parseCsvText = (text: string) => {
    setIsParsing(true);
    setErrorMessage(null);
    setImportResult(null);

    try {
      const cleanText = text.replace(/^\uFEFF/, "");
      const lines = cleanText.split(/\r\n|\n/).filter((l) => l.trim().length > 0);

      if (lines.length < 2) {
        setErrorMessage("CSV file must contain a header row and at least one student record.");
        setIsParsing(false);
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
      
      // 1. Resolve Student ID Column Index
      const idIdx = headers.findIndex(
        (h) => h === "studentid" || h === "id" || h === "roll" || h.includes("id") || h.includes("roll")
      );

      // 2. Resolve Full Name Column Index (must not reuse idIdx)
      let nameIdx = headers.findIndex(
        (h, idx) =>
          idx !== idIdx &&
          (h === "fullname" || h === "name" || h === "studentname" || h.includes("fullname") || h.includes("name"))
      );

      if (nameIdx === -1) {
        nameIdx = headers.findIndex(
          (h, idx) => idx !== idIdx && (h.includes("student") || h.includes("candidate"))
        );
      }

      // 3. Resolve Other Columns
      const emailIdx = headers.findIndex((h) => h.includes("email"));
      const deptIdx = headers.findIndex((h) => h.includes("dept") || h.includes("department") || h.includes("branch"));
      const courseIdx = headers.findIndex((h) => h.includes("course") || h.includes("program") || h.includes("degree"));
      const yearIdx = headers.findIndex((h) => h.includes("year") || h.includes("graduat") || h.includes("batch"));

      if (emailIdx === -1 || nameIdx === -1) {
        setErrorMessage("CSV header must contain 'fullName' (or 'name') and 'email' columns.");
        setIsParsing(false);
        return;
      }

      const seenEmails = new Set<string>();
      const rows: CsvParsedRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        if (cols.length < 2) continue;

        const email = (cols[emailIdx] || "").toLowerCase().trim();
        const name = cols[nameIdx] || "";
        const studentId = idIdx !== -1 ? cols[idIdx] : "";
        const department = deptIdx !== -1 ? cols[deptIdx] : "Computer Science";
        const course = courseIdx !== -1 ? cols[courseIdx] : "B.Tech";
        const gradYear = yearIdx !== -1 ? parseInt(cols[yearIdx], 10) || 2027 : 2027;

        let status: "VALID" | "DUPLICATE" | "INVALID" = "VALID";
        let reason: string | undefined = undefined;

        if (!email || !email.includes("@")) {
          status = "INVALID";
          reason = "Invalid or missing email address.";
        } else if (!name) {
          status = "INVALID";
          reason = "Missing candidate full name.";
        } else if (seenEmails.has(email)) {
          status = "DUPLICATE";
          reason = "Duplicate email entry in CSV file.";
        } else {
          seenEmails.add(email);
        }

        rows.push({
          studentId: studentId || `STU-${1000 + i}`,
          name,
          email,
          department,
          course,
          graduationYear: gradYear,
          status,
          reason,
        });
      }

      setParsedRows(rows);

      // Auto-scroll to preview table
      setTimeout(() => {
        if (previewTableRef.current) {
          previewTableRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 150);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to parse CSV file.";
      setErrorMessage(msg);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCsvText(text);
    };
    reader.readAsText(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;
    setFile(droppedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCsvText(text);
    };
    reader.readAsText(droppedFile);
  };

  const handleDownloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "sample_student_roster.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLoadDemoData = () => {
    setFile(new File([SAMPLE_CSV_CONTENT], "sample_student_roster.csv", { type: "text/csv" }));
    parseCsvText(SAMPLE_CSV_CONTENT);
  };

  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter((r) => r.status === "VALID");
    if (validRows.length === 0) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/institute/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          students: validRows.map((r) => ({
            name: r.name,
            email: r.email,
            studentId: r.studentId,
            department: r.department,
            course: r.course,
            graduationYear: r.graduationYear,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to import student roster.");
      }

      setImportResult({
        importedCount: data.importedCount,
        skippedCount: data.skippedCount,
        invitedCount:data.invitedCount,conflicts:data.conflicts,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to complete CSV import.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.status === "VALID").length;
  const duplicateCount = parsedRows.filter((r) => r.status === "DUPLICATE").length;
  const invalidCount = parsedRows.filter((r) => r.status === "INVALID").length;

  return (
    <div className="flex h-screen bg-[#FAFAFA] text-neutral-950 font-sans overflow-hidden">
      <Sidebar />


      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar" data-lenis-prevent="true">
        <Header />

        <main className="p-6 sm:p-10 space-y-8 max-w-7xl mx-auto w-full">
          <p className="p-4 border rounded-xl text-sm">{invitationNotice}</p>
          {importResult && <div role="status"><p>Invitations created: {importResult.invitedCount || 0}. Existing members: {importResult.importedCount}. Skipped: {importResult.skippedCount}.</p>{importResult.conflicts?.map((c,i)=><p key={i}>Row {c.row}: {c.reason}</p>)}</div>}
          {/* Top Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200/80 pb-6">
            <div className="flex items-center gap-3">
              <Link
                href="/institute/students"
                className="p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-neutral-700 transition-colors shadow-2xs"
                title="Back to Student Roster"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950">
                  Import Student Roster (CSV)
                </h1>
                <p className="text-xs text-neutral-500 font-mono mt-0.5">
                  Upload institutional CSV files to invite candidates to join your placement roster.
                </p>
              </div>
            </div>

            {/* Quick Action Helpers */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadSampleCsv}
                leftIcon={<Download className="w-4 h-4" />}
                className="font-bold text-xs"
              >
                Sample CSV Template
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLoadDemoData}
                leftIcon={<Sparkles className="w-4 h-4" />}
                className="font-bold text-xs bg-neutral-100 border border-neutral-300 text-neutral-950 hover:bg-neutral-200"
              >
                Load Demo CSV Data
              </Button>
            </div>
          </div>

          {/* Success Notification Banner */}
          {importResult && (
            <div className="p-8 bg-neutral-950 text-white rounded-3xl space-y-4 shadow-xl border border-neutral-800">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-neutral-950 flex items-center justify-center font-bold shrink-0">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Roster Import Completed Successfully!</h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Processed {importResult.importedCount} new candidate student accounts into your institute campus roster. ({importResult.skippedCount} duplicates/existing skipped).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 pt-3 border-t border-neutral-800">
                <Link href="/institute/students">
                  <Button variant="primary" className="bg-white text-neutral-950 hover:bg-neutral-200 font-bold text-xs px-6">
                    View Student Roster
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="border-neutral-700 text-white hover:bg-neutral-800 font-bold text-xs px-6"
                  onClick={() => {
                    setFile(null);
                    setParsedRows([]);
                    setImportResult(null);
                  }}
                >
                  Import Another CSV File
                </Button>
              </div>
            </div>
          )}

          {/* CSV File Upload Dropzone Card */}
          {!importResult && (
            <div className="bg-white border border-neutral-200 rounded-3xl p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-neutral-950 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-neutral-950" />
                    <span>Select or Drag CSV Roster File</span>
                  </h3>
                  <p className="text-xs text-neutral-500">
                    CSV file must contain header columns: <code className="font-mono text-neutral-950 bg-neutral-100 px-2 py-0.5 rounded-md">studentId, fullName, email, department, course, graduationYear</code>.
                  </p>
                </div>

                {file && (
                  <div className="px-3 py-1.5 rounded-full bg-neutral-100 border border-neutral-200 font-mono text-xs font-bold text-neutral-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-neutral-700" />
                    <span>{file.name}</span>
                  </div>
                )}
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Drag and Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-3xl p-12 text-center space-y-4 transition-all cursor-pointer select-none ${
                  isDragOver
                    ? "border-neutral-950 bg-neutral-100 scale-[1.01]"
                    : "border-neutral-300 hover:border-neutral-950 bg-neutral-50/50 hover:bg-neutral-100/50"
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-neutral-950 text-white flex items-center justify-center mx-auto shadow-md group-hover:scale-105 transition-transform">
                  <Upload className="w-7 h-7 text-white" />
                </div>

                <div className="space-y-1">
                  <p className="text-base font-bold text-neutral-950">
                    {isParsing ? "Parsing CSV File..." : file ? file.name : "Click to browse or drag & drop CSV file here"}
                  </p>
                  <p className="text-xs text-neutral-400 font-mono">
                    Supported file format: .csv • Maximum size: 10MB
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    className="px-6 py-2.5 bg-neutral-950 text-white font-bold text-xs rounded-xl hover:bg-neutral-800 transition-colors shadow-sm"
                  >
                    Browse Local File
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadDemoData();
                    }}
                    className="px-5 py-2.5 bg-white border border-neutral-300 text-neutral-900 font-bold text-xs rounded-xl hover:bg-neutral-100 transition-colors"
                  >
                    Load Sample Demo Data
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="p-4 bg-neutral-100 border border-neutral-300 rounded-2xl text-xs text-neutral-950 flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-neutral-950 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* Validation Breakdown & Preview Table */}
          {!importResult && parsedRows.length > 0 && (
            <div ref={previewTableRef} className="bg-white border border-neutral-200 rounded-3xl p-8 shadow-xs space-y-6">
              {/* Summary Stat Pills */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-5">
                <div>
                  <h3 className="text-base font-bold text-neutral-950">CSV Verification Breakdown</h3>
                  <p className="text-xs text-neutral-500 font-mono">Total {parsedRows.length} student records parsed from file</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-3.5 py-1.5 rounded-full bg-neutral-950 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>{validCount} Valid</span>
                  </div>
                  {duplicateCount > 0 && (
                    <div className="px-3.5 py-1.5 rounded-full bg-neutral-200 border border-neutral-300 text-xs font-mono font-bold text-neutral-700 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-neutral-600" />
                      <span>{duplicateCount} Duplicates</span>
                    </div>
                  )}
                  {invalidCount > 0 && (
                    <div className="px-3.5 py-1.5 rounded-full bg-neutral-100 border border-neutral-300 text-xs font-mono font-bold text-neutral-900 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-neutral-950" />
                      <span>{invalidCount} Invalid</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Table Preview */}
              <div className="overflow-x-auto border border-neutral-200 rounded-2xl max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs text-neutral-900 font-sans">
                  <thead className="bg-neutral-100 border-b border-neutral-200 font-mono text-[11px] uppercase text-neutral-500 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3.5">Student ID</th>
                      <th className="px-4 py-3.5">Full Name</th>
                      <th className="px-4 py-3.5">Email Address</th>
                      <th className="px-4 py-3.5">Department</th>
                      <th className="px-4 py-3.5">Course</th>
                      <th className="px-4 py-3.5">Grad Year</th>
                      <th className="px-4 py-3.5 text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {parsedRows.map((r, i) => (
                      <tr key={i} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium">{r.studentId}</td>
                        <td className="px-4 py-3 font-bold text-neutral-950">{r.name || "N/A"}</td>
                        <td className="px-4 py-3 font-mono text-neutral-600">{r.email || "N/A"}</td>
                        <td className="px-4 py-3">{r.department}</td>
                        <td className="px-4 py-3 font-mono">{r.course}</td>
                        <td className="px-4 py-3 font-mono">{r.graduationYear}</td>
                        <td className="px-4 py-3 text-right">
                          {r.status === "VALID" && (
                            <span className="px-2.5 py-1 rounded-full bg-neutral-950 text-white font-mono text-[10px] font-bold uppercase inline-flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-400" /> Valid
                            </span>
                          )}
                          {r.status === "DUPLICATE" && (
                            <span className="px-2.5 py-1 rounded-full bg-neutral-200 text-neutral-800 font-mono text-[10px] font-bold uppercase inline-flex items-center gap-1">
                              Duplicate
                            </span>
                          )}
                          {r.status === "INVALID" && (
                            <span className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-950 border border-neutral-300 font-mono text-[10px] font-bold uppercase inline-flex items-center gap-1" title={r.reason}>
                              Invalid
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setParsedRows([]);
                  }}
                  className="w-full sm:w-auto font-bold text-xs"
                >
                  Cancel & Reset
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  onClick={handleConfirmImport}
                  disabled={validCount === 0 || isSubmitting}
                  isLoading={isSubmitting}
                  leftIcon={<Users className="w-4 h-4" />}
                  className="w-full sm:w-auto font-bold text-xs px-8 shadow-md"
                >
                  {isSubmitting ? "Importing Roster..." : `Import ${validCount} Valid Candidates`}
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
