"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Bot, FileText, Play, Sliders, Layers, Upload, CheckCircle2, FileUp, X } from "lucide-react";
import { DifficultyLevel, InterviewerStyle, InterviewType } from "@/lib/interview/types";
import { extractTextFromFile } from "@/lib/ats/parser/file-text-extractor";

interface DbResumeOption {
  id: string;
  title: string;
  updatedAt: string;
}

export interface InterviewSetupWizardProps {
  onStartInterview: (params: {
    jobId?:string;
    resumeId?: string;
    uploadedResumeText?: string;
    uploadedFileName?: string;
    targetJobTitle: string;
    companyName?: string;
    jobDescription: string;
    interviewType: InterviewType;
    difficulty: DifficultyLevel;
    durationMinutes: number;
    interviewerStyle: InterviewerStyle;
  }) => void;
  isSubmitting?: boolean;
}

const DEFAULT_SAMPLE_JD = `Senior Backend Engineer — Production Role
We are seeking a Senior Backend Engineer to design, build, and scale our core API platform and database infrastructure.

Key Responsibilities:
- Design, develop, and maintain high-throughput asynchronous RESTful APIs using Python, FastAPI, and PostgreSQL.
- Architect scalable backend microservices, query optimizations, and database indexing for low-latency performance.
- Implement robust authentication, data validation, and error handling protocols.

Required Qualifications & Skills:
- 3+ years of professional backend software development experience.
- Strong hands-on proficiency in Python, FastAPI, and PostgreSQL.
- Demonstrated experience building and consuming REST APIs.`;

export function InterviewSetupWizard({ onStartInterview, isSubmitting = false }: InterviewSetupWizardProps) {
  const [jobId,setJobId]=useState<string>();
  const [resumes, setResumes] = useState<DbResumeOption[]>([]);
  const [resumeSource, setResumeSource] = useState<"SAVED" | "UPLOAD">("SAVED");
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  
  // File Upload State
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadedResumeText, setUploadedResumeText] = useState<string>("");
  const [isExtractingFile, setIsExtractingFile] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>("");
  
  const [targetJobTitle, setTargetJobTitle] = useState<string>("Backend Engineer");
  const [companyName, setCompanyName] = useState<string>("Identity");
  const [jobDescription, setJobDescription] = useState<string>(DEFAULT_SAMPLE_JD);
  
  const [interviewType, setInterviewType] = useState<InterviewType>("FULL");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("Medium");
  const [durationMinutes, setDurationMinutes] = useState<number>(20);
  const [interviewerStyle, setInterviewerStyle] = useState<InterviewerStyle>("Professional");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadResumes() {
      try {
        const res = await fetch("/api/resumes");
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.resumes)) {
            setResumes(json.resumes);
            if (json.resumes.length > 0) {
              setSelectedResumeId(json.resumes[0].id);
            }
          }
        }
      } catch {
        // Handle silently
      }
    }
    loadResumes().then(async()=>{
      const id=new URLSearchParams(window.location.search).get("jobId");if(!id)return;
      try{const r=await fetch(`/api/candidate/job-workspaces/${id}`);const j=await r.json();if(!r.ok)throw new Error(j.error);setJobId(id);setTargetJobTitle(j.job.title);setCompanyName(j.job.company);setJobDescription(j.job.description);setSelectedResumeId(j.selectedResume?.id || "");}catch(e){setUploadError(e instanceof Error?e.message:"Could not load job context.");}
    });
  }, []);

  const handleFileUpload = async (file: File) => {
    setUploadError("");
    setIsExtractingFile(true);
    try {
      const text = await extractTextFromFile(file);
      if (!text || text.trim().length < 30) {
        throw new Error("Could not extract readable text from this file. Please try a different PDF/DOCX or TXT file.");
      }
      setUploadedFileName(file.name);
      setUploadedResumeText(text);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Failed to process uploaded file.");
    } finally {
      setIsExtractingFile(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetJobTitle.trim() || !jobDescription.trim()) return;

    if (resumeSource === "UPLOAD" && !uploadedResumeText) {
      setUploadError("Please upload a valid resume file before starting the interview.");
      return;
    }

    onStartInterview({
      jobId,
      resumeId: resumeSource === "SAVED" ? (selectedResumeId || undefined) : undefined,
      uploadedResumeText: resumeSource === "UPLOAD" ? uploadedResumeText : undefined,
      uploadedFileName: resumeSource === "UPLOAD" ? uploadedFileName : undefined,
      targetJobTitle,
      companyName: companyName || undefined,
      jobDescription,
      interviewType,
      difficulty,
      durationMinutes,
      interviewerStyle,
    });
  };

  const selectedResumeTitle =
    resumeSource === "UPLOAD"
      ? (uploadedFileName ? `Uploaded: ${uploadedFileName}` : "Uploaded File Resume")
      : (resumes.find((r) => r.id === selectedResumeId)?.title || "Saved Candidate Resume");

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-5xl mx-auto font-sans">
      {/* Top Header Banner Card */}
      <div className="bg-white border border-neutral-200/80 shadow-sm rounded-3xl p-6 sm:p-7 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-neutral-950 text-white flex items-center justify-center font-bold shadow-md shrink-0">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-950">AI MOCK INTERVIEW ENGINE</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-neutral-950 text-white">
                v2.1 Adaptive
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 font-medium mt-0.5">
              Simulate realistic recruitment interviews tailored to your resume (uploaded or saved), target job description, and seniority.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Configuration Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-neutral-200/80 shadow-sm rounded-3xl p-6 sm:p-7 space-y-5">
            <h2 className="text-sm font-black tracking-tight text-neutral-950 border-b border-neutral-200 pb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-neutral-950" />
              <span>1. Target Role & Source Resume</span>
            </h2>

            {/* Target Role & Company */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider block font-bold">
                  TARGET JOB TITLE *
                </label>
                <input
                  type="text"
                  required
                  value={targetJobTitle}
                  onChange={(e) => setTargetJobTitle(e.target.value)}
                  placeholder="e.g. Senior Backend Engineer"
                  className="w-full text-xs bg-white border border-neutral-300 rounded-xl px-3.5 py-3 text-neutral-950 font-bold focus:outline-none focus:border-neutral-950 shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider block font-bold">
                  COMPANY PRESET (OPTIONAL)
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Identity, Stripe, Amazon"
                  className="w-full text-xs bg-white border border-neutral-300 rounded-xl px-3.5 py-3 text-neutral-950 font-bold focus:outline-none focus:border-neutral-950 shadow-2xs"
                />
              </div>
            </div>

            {/* Resume Source Selector (Saved vs Upload File) */}
            <div className="space-y-3 pt-2">
              <label className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider block font-bold">
                RESUME SOURCE
              </label>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setResumeSource("SAVED")}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    resumeSource === "SAVED"
                      ? "bg-neutral-950 text-white border-neutral-950 shadow-xs"
                      : "bg-white border-neutral-300 text-neutral-700 hover:border-neutral-400"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Select Saved Resume</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResumeSource("UPLOAD")}
                  className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    resumeSource === "UPLOAD"
                      ? "bg-neutral-950 text-white border-neutral-950 shadow-xs"
                      : "bg-white border-neutral-300 text-neutral-700 hover:border-neutral-400"
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload New Resume</span>
                </button>
              </div>

              {/* Saved Resume Dropdown */}
              {resumeSource === "SAVED" && (
                <div className="space-y-1.5 pt-1">
                  {resumes.length > 0 ? (
                    <select
                      value={selectedResumeId}
                      onChange={(e) => setSelectedResumeId(e.target.value)}
                      className="w-full text-xs bg-white border border-neutral-300 rounded-xl px-3.5 py-3 text-neutral-950 font-bold focus:outline-none focus:border-neutral-950 shadow-2xs cursor-pointer"
                    >
                      {resumes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.title} ({new Date(r.updatedAt).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-600 font-medium">
                      No saved resumes found. Switch to &quot;Upload New Resume&quot; above to upload your PDF or DOCX file.
                    </div>
                  )}
                </div>
              )}

              {/* Upload Resume File Zone */}
              {resumeSource === "UPLOAD" && (
                <div className="space-y-2 pt-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  {!uploadedFileName ? (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="p-6 bg-neutral-50 border-2 border-dashed border-neutral-300 hover:border-neutral-950 rounded-2xl text-center space-y-2 cursor-pointer transition-all hover:bg-neutral-100/50"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-white border border-neutral-200 shadow-2xs flex items-center justify-center mx-auto text-neutral-950">
                        <FileUp className="w-5 h-5 text-neutral-950" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-neutral-950">
                          {isExtractingFile ? "Extracting text from resume..." : "Click or drag & drop to upload resume"}
                        </p>
                        <p className="text-[10px] font-mono text-neutral-500 font-medium mt-0.5">
                          Supports PDF, DOCX, or TXT formats (up to 10MB)
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <div className="text-xs font-extrabold text-emerald-950 font-mono">
                            {uploadedFileName}
                          </div>
                          <span className="text-[10px] font-mono text-emerald-800 font-bold">
                            Text Extracted • {uploadedResumeText.split(/\s+/).length} words ready for interview
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedFileName("");
                          setUploadedResumeText("");
                        }}
                        className="p-1.5 text-neutral-400 hover:text-neutral-950 rounded-lg hover:bg-emerald-100/50 transition-all"
                        title="Remove File"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {uploadError && (
                    <p className="text-xs font-mono text-red-600 font-bold">{uploadError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Job Description Textarea */}
            <div className="space-y-1.5 pt-2 border-t border-neutral-200">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider block font-bold">
                  TARGET JOB DESCRIPTION *
                </label>
                <button
                  type="button"
                  onClick={() => setJobDescription(DEFAULT_SAMPLE_JD)}
                  className="text-[10px] font-mono text-neutral-500 hover:text-neutral-950 underline cursor-pointer"
                >
                  Load Sample JD
                </button>
              </div>
              <textarea
                required
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={5}
                placeholder="Paste key responsibilities & required technical skills..."
                className="w-full text-xs bg-white border border-neutral-300 rounded-2xl p-3.5 text-neutral-950 font-mono focus:outline-none focus:border-neutral-950 leading-relaxed resize-y shadow-2xs"
              />
            </div>
          </div>

          {/* Mode & Interviewer Presets */}
          <div className="bg-white border border-neutral-200/80 shadow-sm rounded-3xl p-6 sm:p-7 space-y-5">
            <h2 className="text-sm font-black tracking-tight text-neutral-950 border-b border-neutral-200 pb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-neutral-950" />
              <span>2. Mode & Interviewer Presets</span>
            </h2>

            {/* Interview Type Selection */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider block font-bold">
                INTERVIEW MODE
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: "FULL", label: "Full Mock Interview", desc: "Technical + Behavioral + Projects" },
                  { id: "TECHNICAL", label: "Technical Deep Dive", desc: "Coding, APIs, Databases, Scaling" },
                  { id: "BEHAVIORAL", label: "Behavioral & STAR", desc: "Leadership, Teamwork, Conflict" },
                  { id: "RESUME_BASED", label: "Resume Probing", desc: "Direct project & claim probing" },
                  { id: "JOB_SPECIFIC", label: "Job-Specific Requirements", desc: "Strict JD alignment" },
                ].map((type) => (
                  <div
                    key={type.id}
                    onClick={() => setInterviewType(type.id as InterviewType)}
                    className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all space-y-0.5 ${
                      interviewType === type.id
                        ? "bg-neutral-950 text-white border-neutral-950 font-bold shadow-sm"
                        : "bg-white border-neutral-200/80 text-neutral-800 hover:border-neutral-400"
                    }`}
                  >
                    <div className="font-extrabold">{type.label}</div>
                    <div className={`text-[10px] ${interviewType === type.id ? "text-neutral-400" : "text-neutral-500"}`}>
                      {type.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Difficulty & Duration Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider block font-bold">
                  DIFFICULTY LEVEL
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                  className="w-full text-xs bg-white border border-neutral-300 rounded-xl px-3 py-2.5 text-neutral-950 font-bold focus:outline-none focus:border-neutral-950 shadow-2xs cursor-pointer"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium (Recommended)</option>
                  <option value="Hard">Hard</option>
                  <option value="Expert">Expert (FAANG Level)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider block font-bold">
                  DURATION
                </label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full text-xs bg-white border border-neutral-300 rounded-xl px-3 py-2.5 text-neutral-950 font-bold focus:outline-none focus:border-neutral-950 shadow-2xs cursor-pointer"
                >
                  <option value={10}>10 min (~6 questions)</option>
                  <option value={20}>20 min (~10 questions)</option>
                  <option value={30}>30 min (~14 questions)</option>
                  <option value={45}>45 min (~18 questions)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider block font-bold">
                  INTERVIEWER STYLE
                </label>
                <select
                  value={interviewerStyle}
                  onChange={(e) => setInterviewerStyle(e.target.value as InterviewerStyle)}
                  className="w-full text-xs bg-white border border-neutral-300 rounded-xl px-3 py-2.5 text-neutral-950 font-bold focus:outline-none focus:border-neutral-950 shadow-2xs cursor-pointer"
                >
                  <option value="Professional">Professional</option>
                  <option value="Friendly">Friendly</option>
                  <option value="Strict">Strict Prober</option>
                  <option value="FAANG-style">FAANG Bar Raiser</option>
                  <option value="Startup-style">Startup CTO</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interview Preparation Preview Summary */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-neutral-200/80 shadow-sm rounded-3xl p-6 sm:p-7 space-y-5 sticky top-24">
            <h3 className="text-sm font-black tracking-tight text-neutral-950 border-b border-neutral-200 pb-3 flex items-center justify-between">
              <span>Your AI Interview Preview</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h3>

            <div className="space-y-3.5 text-xs text-neutral-800 font-medium">
              <div className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-2xl space-y-2">
                <div className="font-extrabold text-sm text-neutral-950 flex items-center justify-between">
                  <span>{targetJobTitle || "Backend Engineer"}</span>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-neutral-950 text-white rounded-lg">
                    {difficulty}
                  </span>
                </div>
                {companyName && (
                  <p className="text-neutral-500 font-mono text-[11px] font-bold">
                    Target Employer: {companyName}
                  </p>
                )}
                <div className="text-[11px] text-neutral-600 font-mono space-y-1 pt-1 border-t border-neutral-200">
                  <div>• Resume: {selectedResumeTitle}</div>
                  <div>• Mode: {interviewType.replace(/_/g, " ")}</div>
                  <div>• Duration: {durationMinutes} Minutes</div>
                  <div>• Style Preset: {interviewerStyle}</div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block font-bold">
                  FOCUS EVALUATION AREAS
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-neutral-100 text-neutral-900 border border-neutral-200">
                    ✓ Required Skills
                  </span>
                  <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-neutral-100 text-neutral-900 border border-neutral-200">
                    ✓ Resume Claims
                  </span>
                  <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-neutral-100 text-neutral-900 border border-neutral-200">
                    ✓ System Architecture
                  </span>
                  <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-neutral-100 text-neutral-900 border border-neutral-200">
                    ✓ STAR Behavioral
                  </span>
                  <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-neutral-100 text-neutral-900 border border-neutral-200">
                    ✓ Follow-Up Probing
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-2xl text-[11px] text-amber-900 font-mono leading-relaxed space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>AI Recruiter Directive:</span>
                </div>
                <p>
                  The AI interviewer will ask questions based directly on your uploaded or selected resume. Your responses will be evaluated live for technical accuracy, clarity, relevance, depth, and evidence.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !targetJobTitle.trim() || !jobDescription.trim() || (resumeSource === "UPLOAD" && !uploadedResumeText)}
              className="w-full py-4 bg-neutral-950 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              {isSubmitting ? (
                <span>Initializing Interview Room...</span>
              ) : (
                <>
                  <Play className="w-4 h-4 text-white fill-white" />
                  <span>Start AI Mock Interview</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
