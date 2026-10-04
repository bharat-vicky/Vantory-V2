"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  RefreshCw,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ResumeData } from "@/lib/resume/types";
import { ResumeToolbar } from "./ResumeToolbar";
import { ResumeEditor } from "./ResumeEditor";
import { ResumePreview } from "./ResumePreview";
import { TextAiSelectionMenu } from "../ai/TextAiSelectionMenu";
import { ResumeCoachingPanel } from "./ResumeCoachingPanel";
import { ResumeReviewPanel } from "./ResumeReviewPanel";
import type { BulletAnchor } from "@/lib/resume/coaching";
import { previewPageCount } from "@/lib/resume/preview-pages";

const A4_PAGE_HEIGHT_RATIO = 297 / 210;
const CSS_PIXELS_PER_MM = 96 / 25.4;

function getPreviewPageHeight(element: HTMLElement | null) {
  return element
    ? element.getBoundingClientRect().width * A4_PAGE_HEIGHT_RATIO
    : 297 * CSS_PIXELS_PER_MM;
}

export interface ResumeWorkspaceProps {
  initialResume: ResumeData;
}

export function ResumeWorkspace({ initialResume }: ResumeWorkspaceProps) {
  const [resumeData, setResumeData] = useState<ResumeData>(initialResume);
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved" | "unsaved">(
    "saved",
  );
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingTex, setIsDownloadingTex] = useState(false);
  const [isRecompiling, setIsRecompiling] = useState(false);
  const [coachingBusy,setCoachingBusy]=useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(0.85);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [pdfPreviewUrl,setPdfPreviewUrl]=useState<string>();
  const [previewBusy,setPreviewBusy]=useState(false);
  useEffect(()=>()=>{if(pdfPreviewUrl)URL.revokeObjectURL(pdfPreviewUrl);},[pdfPreviewUrl]);
  const [saveError,setSaveError]=useState("");
  const recoveredBaseRef=useRef<string|undefined>(undefined);
  const [recoveredDraft,setRecoveredDraft]=useState<ResumeData|null>(null);
  const serverRevisionRef=useRef(initialResume.updatedAt);
  const isFirstRender = useRef(true);
  useEffect(()=>{
    if(!initialResume.id)return;
    try{const raw=localStorage.getItem(`resume-draft:${initialResume.id}`);if(raw){const draft=JSON.parse(raw);setRecoveredDraft(draft.content);recoveredBaseRef.current=draft.baseRevision;setSaveError("A local draft is available. Restore it to review your unsaved changes.");}}
    catch {setSaveError("A saved local draft could not be read.");}
  },[initialResume.id]);
  useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(saveStatus!=="saved"){e.preventDefault();}};window.addEventListener("beforeunload",warn);return ()=>window.removeEventListener("beforeunload",warn);},[saveStatus]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const saveRevisionRef = useRef(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dynamic Page Count Detection
  useEffect(() => {
    const preview = document.getElementById("resume-a4-preview");
    if (!preview) return;

    const checkPages = () => {
      const bounds = preview.getBoundingClientRect();
      const pages = previewPageCount(bounds.width, bounds.height);
      setTotalPages(pages);
      setCurrentPage((page) => Math.min(page, pages));
    };

    checkPages();
    const observer = new ResizeObserver(checkPages);
    observer.observe(preview);
    window.addEventListener("resize", checkPages);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", checkPages);
    };
  }, [resumeData, zoomLevel]);

  // Handle scroll position detection for page counter
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const scrollTop = scrollContainerRef.current.scrollTop;
    const pageHeight = getPreviewPageHeight(
      document.getElementById("resume-a4-preview"),
    );
    const page = Math.min(
      totalPages,
      Math.max(1, Math.floor(scrollTop / pageHeight) + 1),
    );
    setCurrentPage(page);
  };

  const handleScrollPage = (direction: "prev" | "next") => {
    if (!scrollContainerRef.current) return;
    const pageHeight = getPreviewPageHeight(
      document.getElementById("resume-a4-preview"),
    );
    const targetPage =
      direction === "next"
        ? Math.min(totalPages, currentPage + 1)
        : Math.max(1, currentPage - 1);
    setCurrentPage(targetPage);
    scrollContainerRef.current.scrollTo({
      top: (targetPage - 1) * pageHeight,
      behavior: "smooth",
    });
  };

  // Cycle zoom level when percentage is clicked
  const handleCycleZoom = () => {
    const presets = [0.65, 0.85, 1.0, 1.15];
    const currentIndex = presets.indexOf(zoomLevel);
    const nextIndex = (currentIndex + 1) % presets.length;
    setZoomLevel(presets[nextIndex]);
  };

  // Debounced auto-save effect
  const saveResume = useCallback((dataToSave: ResumeData, revision: number) => {
    setSaveStatus("saving");
    const saveOperation = saveQueueRef.current.then(async () => {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({resumeId:dataToSave.id,expectedUpdatedAt:serverRevisionRef.current,content:dataToSave}),
      });

      const json = await res.json();
      if (!res.ok || !json.success || !json.resume) {
        throw new Error(json.error || "Failed to save resume.");
      }

      serverRevisionRef.current=json.resume.updatedAt;
      setSaveError("");
      try {if(revision===saveRevisionRef.current && dataToSave.id)localStorage.removeItem(`resume-draft:${dataToSave.id}`);} catch {}
      if (!dataToSave.id && json.resume.id) {
        setResumeData((prev) =>
          prev.id ? prev : { ...prev, id: json.resume.id },
        );
      }
    });
    saveQueueRef.current = saveOperation.catch(() => undefined);

    return saveOperation.then(
      () => {
        if (revision === saveRevisionRef.current) setSaveStatus("saved");
      },
      (error: unknown) => {
        if (revision === saveRevisionRef.current) setSaveStatus("unsaved");
        setSaveError(error instanceof Error ? error.message : "Unable to save. Your local draft is preserved.");
        throw error;
      },
    );
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    try {if(resumeData.id)localStorage.setItem(`resume-draft:${resumeData.id}`,JSON.stringify({content:resumeData,baseRevision:serverRevisionRef.current}));} catch {setSaveError("Local draft storage is unavailable. Keep this tab open until saving finishes.");}
    const revision = ++saveRevisionRef.current;
    setSaveStatus("unsaved");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void saveResume(resumeData, revision).catch(() => undefined);
    }, 600);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [resumeData, saveResume]);

  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    await saveResume(resumeData, saveRevisionRef.current);
  }, [resumeData, saveResume]);

  const handleReset = () => {
    setResumeData(initialResume);
  };

  const applyCoachingRevision = async (anchor:BulletAnchor,beforeText:string,afterText:string) => {
    setCoachingBusy(true);
    try {
      await flushSave();
      const r=await fetch("/api/candidate/resume-coaching",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resumeId:resumeData.id,expectedUpdatedAt:serverRevisionRef.current,anchor,beforeText,afterText,confirmFacts:true})});
      const j=await r.json();if(!r.ok)throw new Error(j.error);
      serverRevisionRef.current=j.resume.updatedAt;
      isFirstRender.current=true;
      setResumeData({...j.resume.data,id:j.resume.id,updatedAt:j.resume.updatedAt});
      setSaveStatus("saved");
      try {if(resumeData.id)localStorage.removeItem(`resume-draft:${resumeData.id}`);} catch {}
    } finally {setCoachingBusy(false);}
  };

  const handleRecompile = () => {
    setIsRecompiling(true);
    setTimeout(() => {
      setIsRecompiling(false);
    }, 350);
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      await flushSave();
      const res = await fetch("/api/resumes/active/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resumeData),
      });

      if (!res.ok) {
        throw new Error("Failed to compile PDF.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(resumeData.personalInfo?.fullName || "Resume").replace(/\s+/g, "_")}_Vantory.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Unable to generate your PDF right now. Please try again.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadTex = async () => {
    setIsDownloadingTex(true);
    try {
      await flushSave();
      if (!resumeData.id) throw new Error("Resume has not been saved yet.");

      const res = await fetch(
        `/api/resumes/${encodeURIComponent(resumeData.id)}/pdf?format=tex`,
      );
      if (!res.ok) throw new Error("Failed to export LaTeX source.");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${(resumeData.personalInfo.fullName || "Resume").trim().replace(/\s+/g, "_")}.tex`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Unable to export LaTeX source right now. Please try again.");
    } finally {
      setIsDownloadingTex(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto selection:bg-neutral-900 selection:text-white pb-12">
      {/* Top Toolbar */}
      <label className="block text-sm font-semibold">Resume name
        <input value={resumeData.title} maxLength={120} disabled={coachingBusy} onChange={event=>setResumeData({...resumeData,title:event.target.value})} className="block w-full max-w-lg mt-2 border rounded-lg p-3" placeholder="e.g. Frontend developer resume" />
      </label>
      <div className="flex gap-4 text-sm"><button className="underline" disabled={previewBusy} onClick={async()=>{setPreviewBusy(true);try{await flushSave();const r=await fetch("/api/resumes/active/pdf",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(resumeData)});if(!r.ok)throw new Error("Unable to preview PDF.");setPdfPreviewUrl(URL.createObjectURL(await r.blob()));}catch(e){setSaveError(e instanceof Error?e.message:"Unable to preview PDF.");}finally{setPreviewBusy(false);}}}>{previewBusy?"Preparing PDF?":"Preview exported PDF"}</button>{pdfPreviewUrl && <button className="underline" onClick={()=>setPdfPreviewUrl(undefined)}>Close PDF preview</button>}</div>
      {pdfPreviewUrl && <iframe title="Actual exported resume PDF" src={pdfPreviewUrl} className="w-full h-[800px] border rounded-lg"/>}
      {saveError && <div role="alert" className="p-3 bg-amber-50 text-sm rounded-lg">{saveError} {recoveredDraft ? <button className="underline ml-3" onClick={()=>{serverRevisionRef.current=recoveredBaseRef.current;setResumeData({...recoveredDraft,id:initialResume.id});setRecoveredDraft(null);}}>Restore draft</button>:<><button className="underline ml-3" onClick={()=>void flushSave().catch(()=>undefined)}>Retry save</button><button className="underline ml-3" onClick={async()=>{try{const r=await fetch("/api/resumes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"create"})});const j=await r.json();if(!r.ok)throw new Error(j.error);const saved=await fetch("/api/resumes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resumeId:j.resume.id,expectedUpdatedAt:j.resume.updatedAt,content:{...resumeData,id:j.resume.id,title:`${resumeData.title} (recovered)`}})});if(!saved.ok)throw new Error("Could not save recovered copy. Your local draft remains available.");window.location.assign(`/resume?resumeId=${j.resume.id}`);}catch(e){setSaveError(e instanceof Error?e.message:"Recovery failed.");}}}>Save draft as a new resume</button></>}</div>}
      <fieldset disabled={coachingBusy}><ResumeToolbar
        resumeData={resumeData}
        settings={resumeData.settings}
        onBeforeAnalyze={flushSave}
        onSettingsChange={(settings) =>
          setResumeData({ ...resumeData, settings })
        }
        saveStatus={saveStatus}
        onReset={handleReset}
        onDownloadPdf={handleDownloadPdf}
        onDownloadTex={handleDownloadTex}
        isDownloadingPdf={isDownloadingPdf}
        isDownloadingTex={isDownloadingTex}
      /></fieldset>

      <ResumeCoachingPanel data={resumeData} busy={coachingBusy} onApply={applyCoachingRevision}/>
      <ResumeReviewPanel resumeId={resumeData.id} onBeforeShare={flushSave}/>

      {/* Main Workspace Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Editor Controls */}
        <div className="lg:col-span-6 space-y-6 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono uppercase tracking-wider text-neutral-600 font-bold">
              RESUME CONTENT EDITOR
            </h2>
            <span className="text-xs text-neutral-400 font-mono">
              Structured JSON Source
            </span>
          </div>

          <fieldset disabled={coachingBusy}><ResumeEditor data={resumeData} onChange={setResumeData} /></fieldset>
        </div>

        {/* Right Column: Live A4 Overleaf Preview */}
        <div className="lg:col-span-6 space-y-3 lg:sticky lg:top-20 min-w-0">
          {/* Overleaf Control Bar (Sleek Dark Theme Aligned) */}
          <div className="bg-neutral-950 text-white p-2.5 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xl font-sans text-xs border border-neutral-800">
            {/* Recompile Button */}
            <button
              onClick={handleRecompile}
              disabled={isRecompiling}
              className="bg-white text-neutral-950 hover:bg-neutral-200 active:bg-neutral-300 px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95 disabled:opacity-75"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-neutral-950 ${isRecompiling ? "animate-spin" : ""}`}
              />
              <span>{isRecompiling ? "Compiling..." : "Recompile"}</span>
            </button>

            {/* Page Navigation Indicator < 1 / 1 > */}
            <div className="flex items-center gap-1.5 font-mono text-[11px] bg-neutral-900 px-2.5 py-1 rounded-lg border border-neutral-800 text-neutral-200">
              <button
                onClick={() => handleScrollPage("prev")}
                disabled={currentPage <= 1}
                className="text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <FileText className="w-3.5 h-3.5 text-neutral-400" />
              <span className="font-semibold">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => handleScrollPage("next")}
                disabled={currentPage >= totalPages}
                className="text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* PDF Download & Zoom Control Pill */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-75 border border-neutral-700"
                title="Download PDF"
              >
                <Download
                  className={`w-3.5 h-3.5 ${isDownloadingPdf ? "animate-bounce" : ""}`}
                />
                <span className="hidden sm:inline">
                  {isDownloadingPdf ? "PDF..." : "PDF"}
                </span>
              </button>

              <div className="flex items-center gap-1 text-[11px] font-mono bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                <button
                  onClick={() =>
                    setZoomLevel((z) =>
                      Math.max(0.5, Number((z - 0.05).toFixed(2))),
                    )
                  }
                  className="px-2 py-0.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 font-bold transition-colors cursor-pointer"
                  title="Zoom Out (-5%)"
                >
                  -
                </button>

                <button
                  type="button"
                  onClick={handleCycleZoom}
                  className="px-1.5 min-w-[42px] text-center font-bold text-neutral-100 hover:text-emerald-400 transition-colors cursor-pointer"
                  title="Click to cycle zoom presets"
                >
                  {Math.round(zoomLevel * 100)}%
                </button>

                <button
                  onClick={() =>
                    setZoomLevel((z) =>
                      Math.min(1.3, Number((z + 0.05).toFixed(2))),
                    )
                  }
                  className="px-2 py-0.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 font-bold transition-colors cursor-pointer"
                  title="Zoom In (+5%)"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Paper View Container */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            data-lenis-prevent="true"
            data-lenis-prevent-wheel="true"
            data-lenis-prevent-touch="true"
            className="bg-neutral-900/95 border border-neutral-800 rounded-2xl p-4 sm:p-6 flex justify-start items-start overflow-x-auto overflow-y-auto h-[calc(100vh-170px)] shadow-2xl custom-scrollbar"
          >
            <div
              style={{
                zoom: zoomLevel,
                transition: "zoom 0.2s ease-in-out",
                width: "210mm",
                flexShrink: 0,
                margin: "0 auto",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <ResumePreview data={resumeData} />
            </div>
          </div>
        </div>
      </div>

      {/* Floating AI Text Selection Refiner Menu */}
      {!coachingBusy && <TextAiSelectionMenu
        resumeData={resumeData}
        onUpdateResume={setResumeData}
      />}
    </div>
  );
}
