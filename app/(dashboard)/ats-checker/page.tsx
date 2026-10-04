"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  History,
  FileCheck,
  RefreshCw,
  Building,
  Briefcase,
  Award,
  ShieldCheck,
  Printer,
  Trash2,
  SlidersHorizontal,
  Target,
  MinusCircle,
  Lock,
  Check,
  X,
  AlertCircle,
  Zap,
  BarChart3,
  Layers,
} from "lucide-react";
import {
  ImprovementSimulatorItem,
  ATSReportSnapshot,
  MatchedSkillEvidence,
  TruthGuardItem,
} from "@/lib/ats/types";
import { extractTextFromFile } from "@/lib/ats/parser/file-text-extractor";
import { reportInputKey, reportMatchesRevision } from "@/lib/ats/report-context";

interface DbResumeOption {
  id: string;
  title: string;
  updatedAt: string;
}

interface ScanHistoryItem {
  id: string;
  targetJobTitle: string;
  companyName?: string;
  jobMatchScore: number | null;
  resumeQualityScore: number | null;
  confidenceScore: number | null;
  confidenceLevel: string;
  createdAt: string;
}

const DEFAULT_SAMPLE_JD = `Junior Software Developer
We welcome graduates and final-year students building their first software engineering career.

Responsibilities:
- Implement and test small application features with guidance from the team.
- Debug issues and explain your approach in code reviews.

Required qualifications:
- Knowledge of Python, data structures, algorithms, Git and unit testing.
- Demonstrate these skills through coursework or a personal project.
- No professional experience is required.

Preferred qualifications:
- Familiarity with SQL, REST APIs and Docker.`;


export default function AtsCheckerPage() {
  const [resumes, setResumes] = useState<DbResumeOption[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadedFileText, setUploadedFileText] = useState<string>("");
  const [isExtractingFile, setIsExtractingFile] = useState(false);
  const [jobTitle, setJobTitle] = useState<string>("Backend Engineer");
  const [companyName, setCompanyName] = useState<string>("");
  const [jobDescription, setJobDescription] =
    useState<string>(DEFAULT_SAMPLE_JD);

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [pipelineStage, setPipelineStage] = useState<string>("");
  const [report, setReport] = useState<ATSReportSnapshot | null>(null);
  const [reportInputs, setReportInputs] = useState("");
  const [reportSource, setReportSource] = useState("");
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [showAllSkills, setShowAllSkills] = useState<boolean>(false);
  const [showAllBullets, setShowAllBullets] = useState<boolean>(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Tab View Switcher State: "OVERVIEW" | "SKILLS_MATRIX" | "BREAKDOWN"
  const [activeTab, setActiveTab] = useState<
    "OVERVIEW" | "SKILLS_MATRIX" | "BREAKDOWN"
  >("OVERVIEW");

  // Truth Guard Modal State
  const [activeTruthGuardItem, setActiveTruthGuardItem] =
    useState<TruthGuardItem | null>(null);
  const [truthGuardSuccessMsg, setTruthGuardSuccessMsg] = useState<string>("");

  // Applied improvements tracking for simulator
  const [appliedImprovementIds, setAppliedImprovementIds] = useState<string[]>(
    [],
  );

  // Memoized initial data loader
  const loadScanDetails = useCallback(async (scanId: string) => {
    setError("");
    try {
      const res = await fetch(`/api/ats/scans/${scanId}`);
      const json = await res.json();
      if (!res.ok || !json.success || !json.scan?.snapshot) {
        throw new Error(json.error || "Could not load that ATS scan.");
      }
      setReport(json.scan.snapshot);
      setReportInputs(reportInputKey({resumeId:json.scan.resumeId || "",uploadedResumeText:"",targetJobTitle:json.scan.targetJobTitle,companyName:json.scan.companyName || "",jobDescription:json.scan.jobDescription}));
      setReportSource(json.scan.resumeId ? "Saved resume" : "Historical or uploaded resume (select or upload a source to rescan)");
      setSelectedResumeId(json.scan.resumeId || "");
      setJobTitle(json.scan.targetJobTitle);setCompanyName(json.scan.companyName || "");setJobDescription(json.scan.jobDescription);setUploadedFileText("");setUploadedFileName("");
      setAppliedImprovementIds([]);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Could not load that ATS scan.",
      );
    }
  }, []);

  // Fetch candidate's existing resumes & past scans on mount
  useEffect(() => {
    let isMounted = true;
    async function loadInitialData() {
      try {
        const search=new URLSearchParams(window.location.search);
        const requestedResume=search.get("resumeId");
        const requestedScan=search.get("scanId");
        const [resumesRes, scansRes] = await Promise.all([
          fetch("/api/resumes"),
          fetch("/api/ats/scans"),
        ]);

        if (isMounted && resumesRes.ok) {
          const json = await resumesRes.json();
          if (json.success && Array.isArray(json.resumes)) {
            setResumes(json.resumes);
            if (json.resumes.length > 0) {
              setSelectedResumeId(json.resumes.some((r:DbResumeOption)=>r.id===requestedResume)?requestedResume!:json.resumes[0].id);
            }
          }
        }

        if (isMounted && scansRes.ok) {
          const json = await scansRes.json();
          if (json.success && Array.isArray(json.scans)) {
            setHistory(json.scans);
            if (requestedScan || (json.scans.length > 0 && !requestedResume)) {
              await loadScanDetails(requestedScan || json.scans[0].id);
            }
          }
        }
      } catch {
        if (isMounted) setError("Could not load saved resumes or scan history. Reload to try again.");
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [loadScanDetails]);

  const handleDeleteScan = useCallback(
    async (scanId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setError("");
      try {
        const res = await fetch(`/api/ats/scans/${scanId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setHistory((prev) => prev.filter((s) => s.id !== scanId));
          setReport((prevReport) =>
            prevReport?.scanId === scanId ? null : prevReport,
          );
        } else {
          const json = await res.json();
          setError(json.error || "Could not delete that ATS scan.");
        }
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not delete that ATS scan.",
        );
      }
    },
    [],
  );

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError("");
      setUploadedFileName("");
      setUploadedFileText("");
      setIsExtractingFile(true);

      try {
        const extractedText = await extractTextFromFile(file);
        setUploadedFileName(file.name);
        setUploadedFileText(extractedText);
        setSelectedResumeId("");
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not read this resume file. Try a text-based PDF, DOCX, or TXT file.",
        );
      } finally {
        setIsExtractingFile(false);
      }

      e.target.value = "";
    },
    [],
  );

  const handleRunAnalysis = useCallback(async () => {
    if (!jobDescription.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    setError("");
    setAppliedImprovementIds([]);
    setPipelineStage("Connecting to ATS Intelligence Pipeline...");

    try {
      setPipelineStage("Analysing resume evidence and job requirements?");
      const res = await fetch("/api/ats/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId: selectedResumeId || undefined,
          uploadedResumeText: uploadedFileText || undefined,
          targetJobTitle: jobTitle,
          companyName: companyName.trim() || undefined,
          jobDescription,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success || !json.snapshot) {
        throw new Error(
          json.error || "Failed to generate ATS analysis report.",
        );
      }

      setReport(json.snapshot);
      setReportInputs(reportInputKey({resumeId:selectedResumeId,uploadedResumeText:uploadedFileText,targetJobTitle:jobTitle,companyName,jobDescription}));
      setReportSource(uploadedFileName || resumes.find(r=>r.id===selectedResumeId)?.title || "Saved resume");

      fetch("/api/ats/scans")
        .then((r) => r.json())
        .then((hJson) => {
          if (hJson.success && Array.isArray(hJson.scans)) {
            setHistory(hJson.scans);
          }
        })
        .catch(() => {});
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "ATS Analysis Failed. Please check inputs and try again.",
      );
    } finally {

      setIsAnalyzing(false);
      setPipelineStage("");
    }
  }, [
    jobDescription,
    isAnalyzing,
    selectedResumeId,
    uploadedFileText,
    jobTitle,
    companyName,
    uploadedFileName,
    resumes,
  ]);

  const handleConfirmTruthGuardSkill = useCallback(
    async (confirmed: boolean) => {
      if (!activeTruthGuardItem) return;

      setReport((currentReport) =>
        currentReport
          ? {
              ...currentReport,
              truthGuardItems: currentReport.truthGuardItems.map((item) =>
                item.skillName === activeTruthGuardItem.skillName
                  ? { ...item, userConfirmedPossession: confirmed }
                  : item,
              ),
            }
          : currentReport,
      );

      if (!confirmed) {
        const declinedImprovementIds = new Set(
          (report?.scoreImprovementSimulator?.improvements || [])
            .filter(
              (improvement) =>
                improvement.isTruthGuardRequired &&
                improvement.skillName === activeTruthGuardItem.skillName,
            )
            .map((improvement) => improvement.id),
        );
        setAppliedImprovementIds((previous) =>
          previous.filter((id) => !declinedImprovementIds.has(id)),
        );
      }

      if (confirmed) {
        setTruthGuardSuccessMsg(
          `Self-confirmed for this scan: '${activeTruthGuardItem.skillName}'. No resume content was changed; add supporting evidence yourself before listing it.`,
        );
      } else {
        setTruthGuardSuccessMsg(
          `Not confirmed: '${activeTruthGuardItem.skillName}' remains unverified for this scan.`,
        );
      }

      setTimeout(() => setTruthGuardSuccessMsg(""), 5000);
      setActiveTruthGuardItem(null);
    },
    [activeTruthGuardItem, report],
  );

  const toggleImprovementApplied = useCallback(
    (improvement: ImprovementSimulatorItem) => {
      if (
        improvement.isTruthGuardRequired &&
        improvement.skillName &&
        !report?.truthGuardItems.some(
          (item) =>
            item.skillName === improvement.skillName &&
            item.userConfirmedPossession === true,
        )
      ) {
        const truthGuardItem = report?.truthGuardItems.find(
          (item) => item.skillName === improvement.skillName,
        );
        setActiveTruthGuardItem(
          truthGuardItem || {
            skillName: improvement.skillName,
            reason: improvement.actionText,
          },
        );
        return;
      }

      setAppliedImprovementIds((previous) =>
        previous.includes(improvement.id)
          ? previous.filter((id) => id !== improvement.id)
          : [improvement.id],
      );
    },
    [report],
  );

  const isAnalyzeDisabled = useMemo(() => {
    return (
      isAnalyzing ||
      isExtractingFile ||
      (!selectedResumeId && !uploadedFileText) ||
      !jobDescription.trim()
    );
  }, [
    isAnalyzing,
    isExtractingFile,
    selectedResumeId,
    uploadedFileText,
    jobDescription,
  ]);

  const improvementsList = useMemo(() => {
    return report?.scoreImprovementSimulator?.improvements || [];
  }, [report]);

  const simulatedGain = useMemo(() => {
    return improvementsList
      .filter((imp) => appliedImprovementIds.includes(imp.id))
      .reduce((sum, imp) => sum + imp.points, 0);
  }, [improvementsList, appliedImprovementIds]);

  const currentOverallScore = useMemo(() => {
    if (!report) return 0;
    return (
      report.overallApplicationScore ??
      Math.round(
        (report.atsCompatibilityScore ??
          report.breakdown?.atsParseability ??
          0) *
          0.3 +
          (report.jobMatchScore ?? 0) * 0.7,
      )
    );
  }, [report]);

  const simulatedScore = useMemo(() => {
    return Math.min(100, currentOverallScore + simulatedGain);
  }, [currentOverallScore, simulatedGain]);

  const displayedSkills = useMemo(() => {
    const list = report?.skillsTable || [];
    if (showAllSkills) return list;
    return list.slice(0, 10);
  }, [report, showAllSkills]);

  const displayedBullets = useMemo(() => {
    const list = report?.bulletQualityAudit?.bulletFeedback || [];
    if (showAllBullets) return list;
    return list.slice(0, 5);
  }, [report, showAllBullets]);

  const selectedResume = resumes.find(resume => resume.id === selectedResumeId);
  const previousResult = Boolean(report && (reportInputs !== reportInputKey({resumeId:selectedResumeId,uploadedResumeText:uploadedFileText,targetJobTitle:jobTitle,companyName,jobDescription}) || !reportMatchesRevision(report.resumeRevision, selectedResume?.updatedAt)));

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-950 font-sans p-4 sm:p-6 md:p-8 space-y-6 w-full max-w-none">
      {report && <section role="status" className={`p-4 border rounded-xl text-sm space-y-2 ${previousResult ? "border-amber-400 bg-amber-50" : "bg-white"}`}>
        <h2 className="font-semibold">{previousResult ? "Previous result — run analysis for the current inputs" : "Saved analysis result"}</h2>
        <p>Analyzed source: {report.resumeId ? resumes.find(r=>r.id===report.resumeId)?.title || "Original saved resume" : reportSource}. Role: {report.targetJobTitle}. Created: {new Date(report.createdAt).toLocaleString()}.</p>
        {report.resumeRevision && <p>Resume version: {new Date(report.resumeRevision).toLocaleString()}</p>}
        <details><summary>Job description used for this result</summary><p className="whitespace-pre-wrap mt-2">{report.jobDescriptionText}</p></details>
      </section>}
      {uploadedFileText && <label className="block text-sm">Review and correct extracted upload text<textarea value={uploadedFileText} onChange={e=>setUploadedFileText(e.target.value)} className="block w-full p-3 border rounded-xl mt-2" rows={8}/></label>}
      {report && <div className="p-4 rounded-xl bg-neutral-50 border text-sm space-y-2"><p>{report.assessmentStatus==="HISTORICAL_UNVALIDATED"?"Historical heuristic report: rescan to use current evidence rules.":"Rule-based resume comparison. This is not an employer ATS score or a hiring prediction. Semantic similarity, location suitability and visual PDF layout are not assessed."}</p><details><summary>Review extracted education, dates and skills</summary><pre className="whitespace-pre-wrap text-xs">{JSON.stringify(report.extractionPreview,null,2)}</pre><p>Correct your resume or uploaded text and rescan if extraction is wrong.</p></details><p>Simulator estimates one change at a time. It assumes truthful skill possession; selections do not edit your resume.</p></div>}
      {/* Top Header Card */}
      <div className="bg-white border border-neutral-200/80 shadow-sm rounded-3xl p-5 sm:p-6 space-y-3 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-950 text-white flex items-center justify-center font-bold shadow-md shrink-0">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-950">
                  RESUME ATS & JOB MATCH CHECKER
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-neutral-950 text-white">
                  Rules v2.1
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-500 font-medium mt-0.5">
                A heuristic estimate based on extracted resume text and job
                requirements. It is not an employer ATS decision.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Width Analysis Inputs Card */}
      <div className="bg-white border border-neutral-200/80 shadow-sm rounded-3xl p-6 sm:p-7 space-y-6 w-full">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-neutral-950" />
            <h2 className="text-base font-black tracking-tight text-neutral-950">
              Analysis Inputs & Resume Config
            </h2>
          </div>

          {history.length > 0 && (
            <button
              onClick={() => setShowHistoryDrawer((prev) => !prev)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-neutral-100 hover:bg-neutral-200/80 text-neutral-900 border border-neutral-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>Past Scans ({history.length})</span>
              {showHistoryDrawer ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>

        {/* Collapsible Past Scans Drawer */}
        {showHistoryDrawer && history.length > 0 && (
          <div className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-2xl space-y-3 animate-in fade-in">
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block font-bold">
              Select Past Scan Record
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {history.map((h) => (
                <div
                  key={h.id}
                  onClick={() => {
                    loadScanDetails(h.id);
                    setShowHistoryDrawer(false);
                  }}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between group ${
                    report?.scanId === h.id
                      ? "bg-neutral-950 text-white border-neutral-950 font-bold shadow-sm"
                      : "bg-white border-neutral-200/80 text-neutral-800 hover:border-neutral-400"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div
                      className={`font-extrabold text-xs ${report?.scanId === h.id ? "text-white" : "text-neutral-950 group-hover:underline"}`}
                    >
                      {h.targetJobTitle}
                    </div>
                    <div
                      className={`text-[9px] font-mono ${report?.scanId === h.id ? "text-neutral-400" : "text-neutral-500"}`}
                    >
                      {h.companyName ? `${h.companyName} • ` : ""}
                      {new Date(h.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono font-black text-[11px] px-2 py-0.5 rounded-lg ${
                        report?.scanId === h.id
                          ? "bg-white text-neutral-950"
                          : "bg-neutral-950 text-white"
                      }`}
                    >
                      {h.jobMatchScore!=null?`${h.jobMatchScore}/100`:"Unvalidated"}
                    </span>
                    <button
                      onClick={(e) => handleDeleteScan(h.id, e)}
                      className={`p-1 transition-colors cursor-pointer rounded-md ${
                        report?.scanId === h.id
                          ? "text-neutral-400 hover:text-white"
                          : "text-neutral-400 hover:text-neutral-950"
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3 Input Columns Row across Full Width */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Column 1: Select Resume / Upload Dropzone */}
          <div className="md:col-span-4 space-y-3">
            <label className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider block font-bold">
              1. SELECT RESUME SOURCE
            </label>

            {resumes.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs text-neutral-500 font-medium">
                  Saved Resume:
                </span>
                <select
                  value={selectedResumeId}
                  aria-label="Saved resume"
                  disabled={isAnalyzing}
                  onChange={(e) => {
                    setSelectedResumeId(e.target.value);
                    setUploadedFileName("");
                    setUploadedFileText("");
                  }}
                  className="w-full text-xs bg-white border border-neutral-300 rounded-xl px-3.5 py-3 text-neutral-950 focus:outline-none focus:border-neutral-950 font-bold shadow-2xs cursor-pointer"
                >
                  <option value="">{uploadedFileText ? "Uploaded resume" : "Select a resume to analyze"}</option>
                  {selectedResumeId && !resumes.some(r=>r.id===selectedResumeId) && <option value={selectedResumeId}>Original resume no longer available</option>}
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({new Date(r.updatedAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="relative flex items-center justify-center my-1.5">
              <div className="border-t border-neutral-200 w-full"></div>
              <span className="bg-white px-2 text-[10px] font-mono text-neutral-400 uppercase">
                OR Upload File
              </span>
            </div>

            <label className="border border-dashed border-neutral-300 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer bg-neutral-50 hover:bg-neutral-100/80 hover:border-neutral-400 transition-all group">
              <Upload className="w-5 h-5 text-neutral-500 group-hover:text-neutral-950 transition-colors mb-1.5" />
              <span className="text-xs font-bold text-neutral-900">
                {isExtractingFile
                  ? "Extracting resume text..."
                  : uploadedFileName
                    ? `Uploaded: ${uploadedFileName}`
                    : "Upload PDF, DOCX, or TXT Resume"}
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">
                Maximum size: 5 MB
              </span>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                disabled={isAnalyzing || isExtractingFile}
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Column 2 & 3: Target Job Title & Job Description */}
          <div className="md:col-span-8 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider block font-bold">
                2. TARGET JOB TITLE
              </label>
              <input
                type="text"
                value={jobTitle}
                disabled={isAnalyzing}
                onChange={(e) => setJobTitle(e.target.value)}
                maxLength={160}
                placeholder="e.g. Junior Software Developer"
                className="w-full text-xs bg-white border border-neutral-300 rounded-xl px-3.5 py-3 text-neutral-950 focus:outline-none focus:border-neutral-950 font-bold shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider block font-bold">
                TARGET COMPANY (OPTIONAL)
              </label>
              <input
                type="text"
                value={companyName}
                disabled={isAnalyzing}
                onChange={(event) => setCompanyName(event.target.value)}
                maxLength={160}
                placeholder="e.g. Acme Technologies"
                className="w-full text-xs bg-white border border-neutral-300 rounded-xl px-3.5 py-3 text-neutral-950 focus:outline-none focus:border-neutral-950 font-bold shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider block font-bold">
                  3. PASTE JOB DESCRIPTION
                </label>
                <button
                  type="button"
                  onClick={() => setJobDescription(DEFAULT_SAMPLE_JD)}
                  disabled={isAnalyzing}
                  className="text-[10px] font-mono text-neutral-500 hover:text-neutral-950 underline cursor-pointer"
                >
                  Load Sample JD
                </button>
              </div>
              <textarea
                value={jobDescription}
                disabled={isAnalyzing}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={6}
                maxLength={50000}
                placeholder="Paste complete job description text..."
                className="w-full text-xs bg-white border border-neutral-300 rounded-2xl p-3.5 text-neutral-950 font-mono focus:outline-none focus:border-neutral-950 leading-relaxed resize-y shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Analyze Action Bar */}
        <div className="pt-2">
          <button
            onClick={handleRunAnalysis}
            disabled={isAnalyzeDisabled}
            className="w-full py-4 bg-neutral-950 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4.5 h-4.5 animate-spin text-white" />
                <span className="font-mono">
                  {pipelineStage || "Analyzing Resume..."}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-4.5 h-4.5 text-amber-400" />
                <span>Analyze Resume Against Job</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-mono space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Analysis Error</span>
            </div>
            <p className="text-[11px] leading-relaxed">{error}</p>
            <button
              onClick={handleRunAnalysis}
              className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-[10px] font-mono font-bold hover:bg-red-700 transition-colors cursor-pointer"
            >
              Retry Analysis
            </button>
          </div>
        )}
      </div>

      {/* Full-Width Report Output Cards */}
      <div className="w-full space-y-6">
        {truthGuardSuccessMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 font-bold flex items-center gap-2 animate-in fade-in shadow-2xs w-full">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{truthGuardSuccessMsg}</span>
          </div>
        )}

        {!report ? (
          <div className="bg-white border border-neutral-200/80 shadow-sm rounded-3xl p-12 text-center space-y-4 flex flex-col items-center justify-center min-h-[420px] w-full">
            <div className="w-16 h-16 rounded-3xl bg-neutral-100 border border-neutral-200 flex items-center justify-center">
              <FileText className="w-8 h-8 text-neutral-500" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h3 className="text-base font-bold text-neutral-950">
                No ATS Scan Generated Yet
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                Select your resume, paste a target job description, and click{" "}
                <strong className="text-neutral-950 font-bold">
                  Analyze Resume
                </strong>{" "}
                to inspect your ATS Compatibility, Job Match Score, and point
                deductions.
              </p>
            </div>
          </div>
        ) : (
          <div
            className="space-y-6 animate-in fade-in zoom-in-95 w-full"
            data-ats-print-report
          >
            {/* Header Info & 3 Primary Scores Card across 100% Width */}
            <div className="bg-white border border-neutral-200/80 shadow-sm rounded-3xl p-6 sm:p-7 space-y-5 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
                <div>
                  <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block font-bold">
                    TARGET ROLE ANALYSIS
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-950 flex items-center gap-2.5 mt-0.5">
                    <span>{report.targetJobTitle}</span>
                    {report.companyName && (
                      <span className="text-xs font-semibold text-neutral-500 flex items-center gap-1 bg-neutral-100 border border-neutral-200 px-2.5 py-1 rounded-xl">
                        <Building className="w-3.5 h-3.5 inline text-neutral-700" />{" "}
                        {report.companyName}
                      </span>
                    )}
                  </h2>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-neutral-100 border border-neutral-200 text-neutral-900">
                    {report.matchLabel.replace(/_/g, " ")}
                  </span>
                  <span className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-neutral-950 text-white shadow-xs">
                    Confidence: {report.confidenceLevel}
                  </span>
                </div>
              </div>

              {/* 3 Primary Score Cards Grid across Full Width */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                <div className="bg-neutral-50/70 border border-neutral-200/80 rounded-3xl p-6 space-y-2.5 hover:border-neutral-300 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block font-bold">
                      ATS COMPATIBILITY
                    </span>
                    <ShieldCheck className="w-4.5 h-4.5 text-neutral-950" />
                  </div>
                  <div className="text-4xl font-black text-neutral-950 font-mono tracking-tighter">
                    {report.atsCompatibilityScore ??
                      report.breakdown?.atsParseability ??
                      0}
                    <span className="text-xs font-normal text-neutral-400">
                      /100
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 font-medium leading-relaxed">
                    Parseability, standard sections, text extraction & risk
                    safety.
                  </p>
                </div>

                <div className="bg-neutral-50/70 border border-neutral-200/80 shadow-sm rounded-3xl p-6 space-y-2.5 hover:border-neutral-300 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block font-bold">
                      JOB MATCH SCORE
                    </span>
                    <Target className="w-4.5 h-4.5 text-neutral-950" />
                  </div>
                  <div className="text-4xl font-black text-neutral-950 font-mono tracking-tighter">
                    {report.jobMatchScore}
                    <span className="text-xs font-normal text-neutral-400">
                      /100
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 font-medium leading-relaxed">
                    Required skills, experience, title & education alignment.
                  </p>
                </div>

                <div className="bg-neutral-950 text-white shadow-md rounded-3xl p-6 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block font-bold">
                      OVERALL APPLICATION
                    </span>
                    <Award className="w-4.5 h-4.5 text-amber-400" />
                  </div>
                  <div className="text-4xl font-black text-white font-mono tracking-tighter">
                    {currentOverallScore}
                    <span className="text-xs font-normal text-neutral-400">
                      /100
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-300 font-medium leading-relaxed">
                    Weighted Composite: 30% ATS + 70% Job Match.
                  </p>
                </div>
              </div>
            </div>

            {/* Segmented Tab View Navigation Bar */}
            <div
              data-ats-print-hide
              className="bg-white border border-neutral-200/80 rounded-2xl p-1.5 flex items-center gap-1.5 shadow-2xs font-mono text-xs font-bold w-full"
            >
              <button
                onClick={() => setActiveTab("OVERVIEW")}
                className={`flex-1 py-3 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activeTab === "OVERVIEW"
                    ? "bg-neutral-950 text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Overview & Deductions</span>
              </button>

              <button
                onClick={() => setActiveTab("SKILLS_MATRIX")}
                className={`flex-1 py-3 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activeTab === "SKILLS_MATRIX"
                    ? "bg-neutral-950 text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100"
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Skills Matrix ({report.skillsTable?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab("BREAKDOWN")}
                className={`flex-1 py-3 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activeTab === "BREAKDOWN"
                    ? "bg-neutral-950 text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100"
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>Bullets & Score Breakdown</span>
              </button>
            </div>

            {/* TAB 1: OVERVIEW & DEDUCTIONS (100% Full Width) */}
            {activeTab === "OVERVIEW" && (
              <div className="space-y-6 animate-in fade-in w-full">
                {/* "Why Did I Lose Points?" Deductions Card across Full Width */}
                {report.whyPointsLost && report.whyPointsLost.length > 0 && (
                  <div className="bg-white border border-neutral-200/80 shadow-sm rounded-3xl p-6 sm:p-7 space-y-5 w-full">
                    <div className="flex items-center justify-between border-b border-neutral-200 pb-3.5">
                      <h3 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider flex items-center gap-2">
                        <MinusCircle className="w-4.5 h-4.5 text-red-600" />
                        <span>WHY DID I LOSE POINTS?</span>
                      </h3>
                      <span className="text-xs font-mono font-extrabold bg-neutral-100 border border-neutral-200 px-3 py-1 rounded-xl text-neutral-900">
                        {report.whyPointsLost.length} Deductions
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                      {report.whyPointsLost.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-2xl space-y-2 hover:border-neutral-300 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-xs text-neutral-950">
                              {item.title}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-black bg-red-100 text-red-700 border border-red-200">
                              Review
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-600 leading-relaxed font-medium">
                            {item.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Critical Missing Requirements Card across Full Width */}
                {report.criticalGaps && report.criticalGaps.length > 0 && (
                  <div className="bg-white border border-neutral-200/80 shadow-sm rounded-3xl p-6 sm:p-7 space-y-4 w-full">
                    <h3 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-200 pb-3.5">
                      <AlertTriangle className="w-4.5 h-4.5 text-amber-600" />
                      <span>CRITICAL MISSING REQUIREMENTS</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                      {report.criticalGaps.map((cg, idx) => (
                        <div
                          key={idx}
                          className="p-4.5 bg-neutral-50 border border-neutral-200/80 rounded-2xl text-xs space-y-1.5"
                        >
                          <div className="font-bold text-neutral-950 flex items-center justify-between">
                            <span>{cg.title}</span>
                            <span
                              className={`px-2.5 py-0.5 text-[10px] font-mono rounded-lg font-bold ${
                                cg.severity === "CRITICAL"
                                  ? "bg-red-100 text-red-800 border border-red-200"
                                  : "bg-amber-100 text-amber-800 border border-amber-200"
                              }`}
                            >
                              {cg.severity}
                            </span>
                          </div>
                          <p className="text-neutral-700 font-medium">
                            {cg.requiredDetail}
                          </p>
                          <p className="text-neutral-600 italic font-mono text-[11px]">
                            {cg.resumeDetail}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Score Improvement Simulator Card across Full Width */}
                {report.scoreImprovementSimulator?.improvements &&
                  report.scoreImprovementSimulator.improvements.length > 0 && (
                    <div className="bg-white border border-neutral-200/80 shadow-sm rounded-3xl p-6 sm:p-7 space-y-5 w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 pb-4">
                        <div>
                          <h3 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider flex items-center gap-2">
                            <SlidersHorizontal className="w-4.5 h-4.5 text-neutral-950" />
                            <span>SCORE IMPROVEMENT SIMULATOR</span>
                          </h3>
                          <p className="text-[11px] text-neutral-500 font-medium mt-0.5">
                            Select possible improvements to estimate a score
                            change. No resume edits are applied.
                          </p>
                        </div>

                        <div className="flex items-center gap-4 bg-neutral-50 border border-neutral-200/80 px-4 py-2 rounded-2xl shrink-0">
                          <div className="text-right font-mono">
                            <span className="text-[10px] text-neutral-500 block font-bold">
                              Current Score
                            </span>
                            <span className="text-base font-black text-neutral-950">
                              {currentOverallScore}
                            </span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-neutral-400" />
                          <div className="text-right font-mono">
                            <span className="text-[10px] text-neutral-500 block font-bold">
                              Simulated Score
                            </span>
                            <span className="text-lg font-black text-emerald-600">
                              {simulatedScore}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3.5 w-full">
                        {report.scoreImprovementSimulator.improvements.map(
                          (imp) => {
                            const isApplied = appliedImprovementIds.includes(
                              imp.id,
                            );

                            return (
                              <div
                                key={imp.id}
                                className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full ${
                                  isApplied
                                    ? "bg-emerald-50/60 border-emerald-300 text-neutral-950"
                                    : "bg-neutral-50/70 border-neutral-200/80 text-neutral-800 hover:border-neutral-300"
                                }`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-extrabold text-xs text-neutral-950">
                                      {imp.title}
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      {imp.points>0 ? `Single-change estimate: +${imp.points}`:"Rescan after editing"}
                                    </span>
                                    {imp.isTruthGuardRequired && (
                                      <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                                        <Lock className="w-3 h-3 inline" />{" "}
                                        Truth Guard
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-neutral-600 leading-relaxed font-medium">
                                    {imp.actionText}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {imp.isTruthGuardRequired &&
                                    imp.skillName && (
                                      <button
                                        onClick={() =>
                                          setActiveTruthGuardItem({
                                            skillName: imp.skillName!,
                                            reason: imp.actionText,
                                          })
                                        }
                                        className="px-4 py-2 bg-neutral-950 text-white rounded-xl text-[11px] font-mono font-bold hover:bg-neutral-800 transition-all cursor-pointer"
                                      >
                                        Confirm Skill
                                      </button>
                                    )}

                                  <button
                                    onClick={() =>
                                      toggleImprovementApplied(imp)
                                    }
                                    className={`px-4 py-2 rounded-xl text-[11px] font-mono font-bold transition-all cursor-pointer ${
                                      isApplied
                                        ? "bg-emerald-600 text-white"
                                        : "bg-white border border-neutral-300 text-neutral-950 hover:bg-neutral-100"
                                    }`}
                                  >
                                    {isApplied
                                      ? "Included in estimate"
                                      : "Add to estimate"}
                                  </button>
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* TAB 2: SKILLS MATRIX (100% Full Width) */}
            {activeTab === "SKILLS_MATRIX" && (
              <div className="space-y-6 animate-in fade-in w-full">
                {report.skillsTable && report.skillsTable.length > 0 && (
                  <div className="bg-white border border-neutral-200/80 shadow-sm rounded-3xl p-6 sm:p-7 space-y-4 w-full">
                    <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
                      <h3 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider flex items-center gap-2">
                        <Layers className="w-4.5 h-4.5 text-neutral-950" />
                        <span>
                          JOB REQUIREMENT ↔ RESUME EVIDENCE COMPARISON MATRIX
                        </span>
                      </h3>
                      <span className="text-xs font-mono font-extrabold bg-neutral-100 border border-neutral-200 px-3 py-1 rounded-xl text-neutral-900">
                        Showing {displayedSkills.length} of{" "}
                        {report.skillsTable.length} Skills
                      </span>
                    </div>

                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-neutral-200 font-mono text-[10px] text-neutral-500 uppercase bg-neutral-50">
                            <th className="py-3.5 px-3">Job Requirement</th>
                            <th className="py-3.5 px-3">Type</th>
                            <th className="py-3.5 px-3">Evidence Level</th>
                            <th className="py-3.5 px-3">
                              Resume Evidence & Source
                            </th>
                            <th className="py-3.5 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 font-sans">
                          {displayedSkills.map(
                            (skill: MatchedSkillEvidence, idx: number) => {
                              const isExpanded =
                                expandedSkill === skill.skillName;

                              return (
                                <React.Fragment key={idx}>
                                  <tr
                                    onClick={() =>
                                      setExpandedSkill(
                                        isExpanded ? null : skill.skillName,
                                      )
                                    }
                                    className="hover:bg-neutral-50 cursor-pointer transition-colors"
                                  >
                                    <td className="py-3.5 px-3 font-bold text-neutral-950">
                                      {skill.skillName}
                                    </td>
                                    <td className="py-3.5 px-3">
                                      <span
                                        className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                          skill.requirementType === "REQUIRED"
                                            ? "bg-neutral-950 text-white"
                                            : "bg-neutral-100 text-neutral-700 border border-neutral-200"
                                        }`}
                                      >
                                        {skill.requirementType}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-3">
                                      <span
                                        className={`inline-flex items-center gap-1.5 font-mono text-[11px] font-bold ${
                                          skill.evidenceLevel === "STRONG"
                                            ? "text-emerald-700"
                                            : skill.evidenceLevel === "MODERATE"
                                              ? "text-amber-700"
                                              : skill.evidenceLevel === "WEAK"
                                                ? "text-orange-700"
                                                : "text-red-600"
                                        }`}
                                      >
                                        {skill.evidenceLevel === "STRONG" && (
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                                        )}
                                        {skill.evidenceLevel === "MODERATE" && (
                                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 inline" />
                                        )}
                                        {skill.evidenceLevel === "WEAK" && (
                                          <MinusCircle className="w-3.5 h-3.5 text-orange-600 inline" />
                                        )}
                                        {skill.evidenceLevel === "MISSING" && (
                                          <XCircle className="w-3.5 h-3.5 text-red-600 inline" />
                                        )}
                                        <span>
                                          {skill.evidenceLevel || "MISSING"}
                                        </span>
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-3 text-neutral-600 truncate max-w-md font-medium">
                                      {skill.evidenceText ||
                                        "No contextual resume snippet found"}
                                    </td>
                                    <td className="py-3.5 px-3 text-right text-neutral-400">
                                      {isExpanded ? (
                                        <ChevronUp className="w-4 h-4 inline text-neutral-950" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4 inline" />
                                      )}
                                    </td>
                                  </tr>

                                  {isExpanded && (
                                    <tr className="bg-neutral-50/80">
                                      <td
                                        colSpan={5}
                                        className="p-4.5 space-y-2 text-xs border-t border-b border-neutral-200"
                                      >
                                        <div className="font-mono text-[10px] uppercase text-neutral-500 font-bold">
                                          VERIFIED RESUME SOURCE (
                                          {skill.skillName})
                                        </div>
                                        {skill.evidenceText ? (
                                          <div className="p-4 bg-white border border-neutral-200/80 rounded-2xl space-y-1.5 shadow-2xs">
                                            <p className="italic text-neutral-950 font-serif leading-relaxed text-xs">
                                              &ldquo;{skill.evidenceText}&rdquo;
                                            </p>
                                            {skill.sourceSection && (
                                              <p className="text-[10px] font-mono text-neutral-500 font-bold">
                                                Source Section:{" "}
                                                {skill.sourceSection}{" "}
                                                {skill.sourceEntity
                                                  ? `→ ${skill.sourceEntity}`
                                                  : ""}{" "}
                                                (Confidence: {skill.confidence}
                                                %)
                                              </p>
                                            )}
                                          </div>
                                        ) : (
                                          <p className="text-neutral-500 font-medium">
                                            No explicit evidence snippet found
                                            in candidate experience, projects,
                                            or certifications.
                                          </p>
                                        )}
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            },
                          )}
                        </tbody>
                      </table>
                    </div>

                    {report.skillsTable.length > 10 && (
                      <div className="pt-2 text-center">
                        <button
                          onClick={() => setShowAllSkills((prev) => !prev)}
                          className="text-xs font-mono font-bold text-neutral-950 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>
                            {showAllSkills
                              ? "Show Less Skills"
                              : `Show All ${report.skillsTable.length} Skills`}
                          </span>
                          {showAllSkills ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: BREAKDOWN & BULLETS (100% Full Width) */}
            {activeTab === "BREAKDOWN" && (
              <div className="space-y-6 animate-in fade-in w-full">
                {/* Achievement & Bullet Quality Audit Card */}
                {report.bulletQualityAudit?.bulletFeedback &&
                  report.bulletQualityAudit.bulletFeedback.length > 0 && (
                    <div className="bg-white border border-neutral-200/80 shadow-sm rounded-3xl p-6 sm:p-7 space-y-5 w-full">
                      <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
                        <h3 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider flex items-center gap-2">
                          <Zap className="w-4.5 h-4.5 text-amber-500" />
                          <span>ACHIEVEMENT & BULLET QUALITY AUDIT</span>
                        </h3>
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold">
                            {report.bulletQualityAudit.strongCount || 0} Strong
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-200 font-bold">
                            {report.bulletQualityAudit.betterCount || 0} Better
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg bg-red-100 text-red-900 border border-red-200 font-bold">
                            {report.bulletQualityAudit.weakCount || 0} Weak
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3.5 w-full">
                        {displayedBullets.map((bf, idx) => (
                          <div
                            key={idx}
                            className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-2xl text-xs space-y-1.5 hover:border-neutral-300 transition-all"
                          >
                            <div className="flex items-center justify-between font-mono">
                              <span className="font-bold text-neutral-950 truncate max-w-xl">
                                &ldquo;{bf.originalText}&rdquo;
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                                  bf.verdict === "STRONG"
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                    : bf.verdict === "BETTER"
                                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                                      : "bg-red-100 text-red-800 border border-red-200"
                                }`}
                              >
                                {bf.verdict} ({bf.score}/100)
                              </span>
                            </div>
                            <p className="text-neutral-600 font-medium">
                              {bf.suggestion}
                            </p>
                          </div>
                        ))}
                      </div>

                      {report.bulletQualityAudit.bulletFeedback.length > 5 && (
                        <div className="pt-2 text-center">
                          <button
                            onClick={() => setShowAllBullets((prev) => !prev)}
                            className="text-xs font-mono font-bold text-neutral-950 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>
                              {showAllBullets
                                ? "Show Less Bullets"
                                : `Show All ${report.bulletQualityAudit.bulletFeedback.length} Bullet Audits`}
                            </span>
                            {showAllBullets ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                {/* 12-Dimension Score Breakdown Card across Full Width */}
                {report.breakdown && (
                  <div className="bg-white border border-neutral-200/80 shadow-sm rounded-3xl p-6 sm:p-7 space-y-5 w-full">
                    <h3 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider border-b border-neutral-200 pb-4">
                      OBSERVED DIMENSIONS AND COVERAGE
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs w-full">
                      {Object.entries(report.breakdown).map(([key, val]) => (
                        <div
                          key={key}
                          className="space-y-1.5 p-3.5 bg-neutral-50 border border-neutral-200/80 rounded-2xl"
                        >
                          <div className="flex justify-between font-mono text-[11px]">
                            <span className="text-neutral-700 capitalize font-bold">
                              {key.replace(/([A-Z])/g, " $1")}
                            </span>
                            <span className="font-extrabold text-neutral-950">
                              {report.unassessedDimensions?.includes(key)?"Not assessed":`${val}%`}
                            </span>
                          </div>
                          <div className="w-full bg-neutral-200/80 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-neutral-950 h-full transition-all duration-500 rounded-full"
                              style={{ width: `${report.unassessedDimensions?.includes(key)?"Not assessed":`${val}%`}` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action CTAs Row across Full Width */}
            <div
              data-ats-print-hide
              className="flex flex-wrap gap-3 pt-2 w-full"
            >
              <Link
                href={report?.resumeId?`/resume?resumeId=${report.resumeId}`:"/resume"}
                className="px-6 py-3.5 bg-neutral-950 text-white font-extrabold text-xs rounded-2xl hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-md"
              >
                <Briefcase className="w-4 h-4" />
                <span>Improve Resume in Builder</span>
              </Link>

              <button
                onClick={handleRunAnalysis}
                disabled={isAnalyzeDisabled}
                className="px-5 py-3.5 bg-white text-neutral-950 font-bold text-xs border border-neutral-300 rounded-2xl hover:bg-neutral-50 transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Run Analysis Again</span>
              </button>

              <button
                onClick={() => window.print()}
                className="px-5 py-3.5 bg-white text-neutral-950 font-bold text-xs border border-neutral-300 rounded-2xl hover:bg-neutral-50 transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save Report PDF</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Truth Guard Confirmation Modal */}
      {activeTruthGuardItem && (
        <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3.5">
              <div className="flex items-center gap-2 text-neutral-950">
                <ShieldCheck className="w-5 h-5 text-neutral-950" />
                <h3 className="text-sm font-black tracking-tight">
                  TRUTH GUARD VERIFICATION
                </h3>
              </div>
              <button
                onClick={() => setActiveTruthGuardItem(null)}
                className="p-1 text-neutral-400 hover:text-neutral-950 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-neutral-700 leading-relaxed font-medium">
              <p>
                The employer explicitly requires{" "}
                <strong className="text-neutral-950 font-bold">
                  {activeTruthGuardItem.skillName}
                </strong>
                .
              </p>
              <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-[11px] text-neutral-600 font-mono">
                {activeTruthGuardItem.reason}
              </div>
              <p className="text-neutral-950 font-bold">
                Do you genuinely possess hands-on experience or project work
                with {activeTruthGuardItem.skillName}?
              </p>
              <p className="text-[10px] text-neutral-500 italic">
                * Vantory Truth Guard never fabricates fake experience, metrics,
                or certifications.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleConfirmTruthGuardSkill(true)}
                className="py-3 bg-neutral-950 text-white rounded-2xl text-xs font-bold hover:bg-neutral-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Yes, I Have It</span>
              </button>

              <button
                onClick={() => handleConfirmTruthGuardSkill(false)}
                className="py-3 bg-white text-neutral-950 border border-neutral-300 rounded-2xl text-xs font-bold hover:bg-neutral-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <X className="w-4 h-4 text-red-500" />
                <span>No, I Don&apos;t</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
