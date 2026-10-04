"use client";

import React from "react";
import { History, Play, ChevronRight, Calendar } from "lucide-react";

export interface PastSessionItem {
  id: string;
  targetJobTitle: string;
  companyName?: string;
  interviewType: string;
  difficulty: string;
  durationMinutes: number;
  status: string;
  overallScore?: number;
  readinessScore?: number;
  readinessLevel?: string;
  createdAt: string;
}

export interface InterviewHistoryViewProps {
  sessions: PastSessionItem[];
  stats: {
    totalInterviews: number;
    completedCount: number;
    averageScore: number | null;
  };
  onSelectSession: (id: string) => void;
  onStartNew: () => void;
}

export function InterviewHistoryView({ sessions, stats, onSelectSession, onStartNew }: InterviewHistoryViewProps) {
  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto font-sans">
      {/* Top Header & Stats Card */}
      <div className="bg-white border border-neutral-200/80 shadow-sm rounded-3xl p-6 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-950 text-white flex items-center justify-center font-bold shadow-md shrink-0">
              <History className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-950">MOCK INTERVIEW HISTORY & PROGRESS</h1>
              <p className="text-xs sm:text-sm text-neutral-500 font-medium">
                Resume unfinished sessions and review assessed answers and past reports.
              </p>
            </div>
          </div>

          <button
            onClick={onStartNew}
            className="px-5 py-3 bg-neutral-950 text-white font-extrabold text-xs rounded-2xl hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-md shrink-0 cursor-pointer"
          >
            <Play className="w-4 h-4 text-white fill-white" />
            <span>New Mock Interview</span>
          </button>
        </div>

        {/* 3 Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-2xl space-y-1">
            <span className="text-[10px] font-mono text-neutral-500 uppercase block font-bold">TOTAL INTERVIEWS</span>
            <div className="text-3xl font-black text-neutral-950 font-mono tracking-tighter">{stats.totalInterviews}</div>
          </div>

          <div className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-2xl space-y-1">
            <span className="text-[10px] font-mono text-neutral-500 uppercase block font-bold">COMPLETED SESSIONS</span>
            <div className="text-3xl font-black text-neutral-950 font-mono tracking-tighter">{stats.completedCount}</div>
          </div>

          <div className="p-4 bg-neutral-950 text-white rounded-2xl space-y-1 shadow-md">
            <span className="text-[10px] font-mono text-neutral-400 uppercase block font-bold">AVERAGE PRACTICE SCORE</span>
            <div className="text-3xl font-black text-white font-mono tracking-tighter">
              {stats.averageScore ?? "Not assessed"}
              {stats.averageScore!=null && <span className="text-xs font-normal text-neutral-400">/100</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Session History List */}
      <div className="bg-white border border-neutral-200/80 shadow-sm rounded-3xl p-6 sm:p-7 space-y-4">
        <h3 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider border-b border-neutral-200 pb-3 flex items-center justify-between">
          <span>RECENT INTERVIEW SESSIONS ({sessions.length})</span>
          <Calendar className="w-4 h-4 text-neutral-950" />
        </h3>

        {sessions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm font-bold text-neutral-950">No Past Mock Interviews Found</p>
            <p className="text-xs text-neutral-500 font-medium">Click &quot;New Mock Interview&quot; above to start your first session.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => onSelectSession(s.id)}
                className="p-4 sm:p-5 bg-neutral-50/80 border border-neutral-200/80 rounded-2xl hover:border-neutral-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-sm text-neutral-950 group-hover:underline">
                      {s.targetJobTitle}
                    </span>
                    {s.companyName && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-neutral-200 text-neutral-900 rounded-lg">
                        {s.companyName}
                      </span>
                    )}
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-neutral-950 text-white rounded-lg">
                      {s.interviewType}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-neutral-500">
                    Difficulty: {s.difficulty} • Duration: {s.durationMinutes} min • Date: {new Date(s.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {s.overallScore != null ? (
                    <div className="text-right font-mono">
                      <span className="text-[10px] text-neutral-500 block font-bold">Practice score</span>
                      <span className="text-base font-black text-neutral-950">{s.overallScore}/100</span>
                    </div>
                  ) : (
                    <span className="text-xs font-mono font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-xl">
                      {s.status==="COMPLETED" ? "Historical / unvalidated" : "Resume interview"}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-950 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
