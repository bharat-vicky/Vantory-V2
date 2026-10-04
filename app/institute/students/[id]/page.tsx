"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Briefcase,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { Sidebar } from "@/components/shell/sidebar";
import { Header } from "@/components/shell/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StudentDetail {
  id: string;
  name: string;
  email: string;
  profile: {
    headline: string | null;
    bio: string | null;
    phone: string | null;
    location: string | null;
    avatarUrl: string | null;
    skills: string | null;
    experienceYears: number | null;
    education: string | null;
    department: string;
    course: string;
    graduationYear: number;
    studentId: string | null;
    placementStatus: string;
    completionScore: number;
  } | null;
  readiness: {
    isProfileReady: boolean;
    isResumeReady: boolean;
    isAtsReady: boolean;
    isInterviewReady: boolean;
    isPlacementReady: boolean;
    readinessCategory: "Checklist Complete" | "Needs Improvement" | "Not Ready";
  };
  resumes: Array<{
    id: string;
    title: string;
    templateId: string;
    contentJson: string;
    updatedAt: string;
  }>;
  atsScans: Array<{
    id: string;
    targetJobTitle: string;
    companyName: string | null;
    overallScore: number;
    createdAt: string;
  }>;
  interviews: Array<{
    id: string;
    jobRole: string;
    type: string;
    totalScore: number | null;
    isCompleted: boolean;
    createdAt: string;
  }>;
  applications: Array<{
    id: string;
    jobId: string;
    jobTitle: string;
    companyName: string;
    location: string;
    status: string;
    appliedAt: string;
  }>;
}

export default function InstituteStudentDetailPage() {
  const params = useParams();
  const studentId = params?.id as string;

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStudentDetail() {
      try {
        const res = await fetch(`/api/institute/students/${studentId}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to load student detail.");
        }

        setStudent(json.student);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Access denied.");
      } finally {
        setLoading(false);
      }
    }
    if (studentId) fetchStudentDetail();
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex h-screen bg-[#FAFAFA] text-neutral-950 font-sans overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center font-mono text-xs text-neutral-400">
          Loading student career record...
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="flex h-screen bg-[#FAFAFA] text-neutral-950 font-sans overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-neutral-950" />
          <h2 className="text-2xl font-black tracking-tight text-neutral-950">
            {error || "Student Record Not Found"}
          </h2>
          <p className="text-xs text-neutral-500 max-w-md">
            You do not have authorization to view this student record or it does not exist in your institute directory.
          </p>
          <Link href="/institute/students">
            <Button variant="primary" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Student Roster
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#FAFAFA] text-neutral-950 font-sans overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar" data-lenis-prevent="true">
        <Header />

        <main className="p-6 sm:p-10 space-y-8 max-w-7xl mx-auto w-full">
          {/* Top Navigation */}
          <div className="flex items-center justify-between">
            <Link href="/institute/students" className="inline-flex items-center gap-2 text-xs font-bold text-neutral-600 hover:text-neutral-950">
              <ArrowLeft className="w-4 h-4" /> Back to Roster
            </Link>

            <Badge
              variant={student.readiness.isPlacementReady ? "success" : "dark"}
              className="font-mono text-xs px-3 py-1"
            >
              {student.readiness.readinessCategory}
            </Badge>
          </div>

          {/* Student Banner Header */}
          <Card className="border border-neutral-200/90 rounded-3xl bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-neutral-950 text-white font-semibold flex items-center justify-center text-2xl shadow-md shrink-0">
                  {student.name.charAt(0).toUpperCase()}
                </div>
                <div className="space-y-1">
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-950">
                    {student.name}
                  </h1>
                  <p className="text-xs text-neutral-500 font-mono">
                    {student.profile?.department} • {student.profile?.course} (Class of {student.profile?.graduationYear})
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-600 pt-1 font-medium">
                    <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-neutral-400" /> {student.email}</span>
                    {student.profile?.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-neutral-400" /> {student.profile.phone}</span>}
                    {student.profile?.location && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-neutral-400" /> {student.profile.location}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant="subtle" className="font-mono text-xs">
                  Placement Status: {student.profile?.placementStatus || "LOOKING"}
                </Badge>
              </div>
            </div>

            {/* 4 Dimension Readiness Breakdown Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-neutral-100">
              <div className="p-3 bg-neutral-50 rounded-2xl space-y-1 border border-neutral-200/80">
                <div className="text-[10px] font-mono text-neutral-400 font-bold uppercase">PROFILE SCORE</div>
                <div className="text-lg font-black text-neutral-950">{student.profile?.completionScore}%</div>
                <div className="text-[10px] text-emerald-700 font-mono">
                  {student.readiness.isProfileReady ? "✓ Ready (>= 80%)" : "Needs Completion"}
                </div>
              </div>

              <div className="p-3 bg-neutral-50 rounded-2xl space-y-1 border border-neutral-200/80">
                <div className="text-[10px] font-mono text-neutral-400 font-bold uppercase">VANTORY RESUMES</div>
                <div className="text-lg font-black text-neutral-950">{student.resumes.length} Ready</div>
                <div className="text-[10px] text-emerald-700 font-mono">
                  {student.readiness.isResumeReady ? "✓ Available" : "No Resume"}
                </div>
              </div>

              <div className="p-3 bg-neutral-50 rounded-2xl space-y-1 border border-neutral-200/80">
                <div className="text-[10px] font-mono text-neutral-400 font-bold uppercase">AVERAGE ATS SCORE</div>
                <div className="text-lg font-black text-neutral-950">
                  {student.atsScans.length > 0
                    ? Math.round(
                        student.atsScans.reduce((sum, s) => sum + s.overallScore, 0) / student.atsScans.length
                      )
                    : 0}
                  /100
                </div>
                <div className="text-[10px] text-emerald-700 font-mono">
                  {student.readiness.isAtsReady ? "✓ Verified (>= 75)" : "Below 75 Threshold"}
                </div>
              </div>

              <div className="p-3 bg-neutral-50 rounded-2xl space-y-1 border border-neutral-200/80">
                <div className="text-[10px] font-mono text-neutral-400 font-bold uppercase">AI MOCK INTERVIEW</div>
                <div className="text-lg font-black text-neutral-950">
                  {student.interviews.length > 0 ? "Completed" : "Pending"}
                </div>
                <div className="text-[10px] text-emerald-700 font-mono">
                  {student.readiness.isInterviewReady ? "✓ Qualified (>= 70)" : "Pending Practice"}
                </div>
              </div>
            </div>
          </Card>

          {/* Detailed Tabs / Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Resumes & ATS Scans Card */}
            <Card className="border border-neutral-200/90 rounded-3xl bg-white p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-4">
                <FileText className="w-5 h-5 text-neutral-950" />
                <h3 className="text-lg font-black text-neutral-950">Student Resumes & ATS Scans</h3>
              </div>

              {student.resumes.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-mono font-bold text-neutral-500 uppercase">Vantory Resumes</h4>
                  {student.resumes.map((r) => (
                    <div key={r.id} className="p-4 bg-neutral-50/80 border border-neutral-200/80 rounded-2xl flex items-center justify-between">
                      <div>
                        <div className="text-sm font-extrabold text-neutral-950">{r.title}</div>
                        <div className="text-[10px] font-mono text-neutral-500 mt-0.5">Template: {r.templateId}</div>
                      </div>
                      <Badge variant="subtle" className="font-mono text-[10px]">Verified Resume</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs font-mono text-neutral-400">No active resumes created yet.</div>
              )}

              {student.atsScans.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-neutral-100">
                  <h4 className="text-xs font-mono font-bold text-neutral-500 uppercase">Recent ATS Scans</h4>
                  {student.atsScans.map((s) => (
                    <div key={s.id} className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-neutral-950">{s.targetJobTitle}</div>
                        <div className="text-[10px] text-neutral-500 font-mono">{s.companyName || "Target Employer"}</div>
                      </div>
                      <div className="font-black text-emerald-700 font-mono text-sm">{s.overallScore}/100</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Applications & Interview History Card */}
            <Card className="border border-neutral-200/90 rounded-3xl bg-white p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-4">
                <Briefcase className="w-5 h-5 text-neutral-950" />
                <h3 className="text-lg font-black text-neutral-950">Job Applications & AI Interviews</h3>
              </div>

              {student.applications.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-mono font-bold text-neutral-500 uppercase">Job Application History</h4>
                  {student.applications.map((a) => (
                    <div key={a.id} className="p-4 bg-neutral-50/80 border border-neutral-200/80 rounded-2xl flex items-center justify-between">
                      <div>
                        <div className="text-sm font-extrabold text-neutral-950">{a.jobTitle}</div>
                        <div className="text-xs text-neutral-500">{a.companyName} • {a.location}</div>
                      </div>
                      <Badge variant={a.status === "OFFERED" ? "success" : "dark"} className="font-mono text-[10px]">
                        {a.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-xs font-mono text-neutral-400">No job applications submitted yet.</div>
              )}

              {student.interviews.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-neutral-100">
                  <h4 className="text-xs font-mono font-bold text-neutral-500 uppercase">AI Mock Interview Sessions</h4>
                  {student.interviews.map((i) => (
                    <div key={i.id} className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-neutral-950">{i.jobRole}</div>
                        <div className="text-[10px] text-neutral-500 font-mono">{i.type} Interview</div>
                      </div>
                      <div className="font-black text-emerald-700 font-mono text-sm">
                        {i.totalScore != null ? `${i.totalScore}/100` : i.isCompleted ? "Completed" : "In Progress"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
