import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import {
  parseStructuredResume,
  parsePlainTextResume,
} from "@/lib/ats/parser/resume-parser";
import { parseJobDescription } from "@/lib/ats/parser/job-parser";
import { generateATSReportSnapshot } from "@/lib/ats/scoring/scoring-engine";
import { sanitizeJdInput } from "@/lib/ats/security/prompt-guard";
import {
  MAX_ATS_REQUEST_BYTES,
  validateATSAnalysisInput,
} from "@/lib/ats/security/analysis-request";
import { checkRateLimit } from "@/lib/rate-limit";
import { ResumeData } from "@/lib/resume/types";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 },
      );
    }

    const rateLimit = checkRateLimit(
      `ats-analysis:${user.id}`,
      12,
      15 * 60 * 1000,
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `ATS analysis limit reached. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds || 60) },
        },
      );
    }

    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > MAX_ATS_REQUEST_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: "ATS analysis request exceeds the 6 MB limit.",
        },
        { status: 413 },
      );
    }

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_ATS_REQUEST_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: "ATS analysis request exceeds the 6 MB limit.",
        },
        { status: 413 },
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON in analysis request." },
        { status: 400 },
      );
    }
    const validation = validateATSAnalysisInput(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 },
      );
    }
    const {
      resumeId,
      resumeData,
      uploadedResumeText,
      jobDescription,
      targetJobTitle,
      companyName,
    } = validation.data;

    // 1. Obtain Parsed Resume (Prefer structured ResumeData if resumeId is provided)
    let parsedResume;
    let selectedResumeId: string | null = null;
    let selectedResumeRevision: string | undefined;
    let resumeSnapshotStr = "{}";

    if (resumeData !== undefined) {
      if (resumeId !== undefined && typeof resumeId !== "string") {
        return NextResponse.json(
          { success: false, error: "Invalid resume ID." },
          { status: 400 },
        );
      }

      if (resumeId) {
        const ownedResume = await db.resume.findFirst({
          where: { id: resumeId, userId: user.id },
          select: { id: true },
        });
        if (!ownedResume) {
          return NextResponse.json(
            { success: false, error: "Resume not found." },
            { status: 404 },
          );
        }
        selectedResumeId = ownedResume.id;
      }

      parsedResume = parseStructuredResume(resumeData as ResumeData);
      resumeSnapshotStr = JSON.stringify(resumeData);
    } else if (resumeId !== undefined) {
      const dbResume = await db.resume.findFirst({
        where: { id: resumeId, userId: user.id },
      });

      if (!dbResume) {
        return NextResponse.json(
          { success: false, error: "Resume not found." },
          { status: 404 },
        );
      }

      selectedResumeId = dbResume.id;
      selectedResumeRevision = dbResume.updatedAt.toISOString();
      resumeSnapshotStr = dbResume.contentJson;
      try {
        const structuredData: ResumeData = JSON.parse(dbResume.contentJson);
        parsedResume = parseStructuredResume(structuredData);
        resumeSnapshotStr = dbResume.contentJson;
      } catch {
        parsedResume = parsePlainTextResume(dbResume.contentJson);
      }
    }

    if (!parsedResume && uploadedResumeText !== undefined) {
      parsedResume = parsePlainTextResume(uploadedResumeText);
      resumeSnapshotStr = JSON.stringify(parsedResume);
    }

    if (!parsedResume) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No valid resume found. Please select an existing resume or upload one.",
        },
        { status: 400 },
      );
    }

    // 2. Parse Job Description (Sanitize prompt injection attempts)
    const cleanJdText = sanitizeJdInput(jobDescription);
    const parsedJd = parseJobDescription(cleanJdText, targetJobTitle);
    parsedJd.companyName = companyName?.trim() || parsedJd.companyName;

    // 3. Orchestrate Analysis Pipeline & Generate Snapshot
    const scanId=randomBytes(12).toString("hex");
    const snapshot = generateATSReportSnapshot(parsedResume, parsedJd,scanId);
    snapshot.resumeId=selectedResumeId || undefined;
    snapshot.resumeRevision=selectedResumeRevision;

    // 4. Save Scan Snapshot to Database
    const savedScan = await db.atsScan.create({
      data: {
        id:scanId,
        userId: user.id,
        resumeId: selectedResumeId,
        targetJobTitle: parsedJd.title,
        companyName: parsedJd.companyName || null,
        jobDescription: cleanJdText,
        overallScore: snapshot.jobMatchScore,
        resumeQualityScore: snapshot.resumeQualityScore,
        confidenceScore: snapshot.matchConfidenceScore,
        confidenceLevel: snapshot.confidenceLevel,
        keywordMatch: snapshot.breakdown.keywordCoverage,
        skillsMatch: snapshot.breakdown.skillsMatch,
        experienceMatch: snapshot.breakdown.experienceRelevance,
        educationMatch: snapshot.breakdown.educationMatch,
        formattingScore: snapshot.breakdown.atsParseability,
        scoringEngineVersion: snapshot.scoringEngineVersion,
        taxonomyVersion: snapshot.taxonomyVersion,
        analysisStatus: "COMPLETED",
        reportSnapshotJson: JSON.stringify(snapshot),
        resumeSnapshotJson: resumeSnapshotStr,
        feedbackJson: JSON.stringify(snapshot.recommendations),
      },
    });

    snapshot.scanId = savedScan.id;

    return NextResponse.json({
      success: true,
      scanId: savedScan.id,
      snapshot,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal ATS Server Error.";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
