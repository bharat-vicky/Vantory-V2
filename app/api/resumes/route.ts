import { apiError } from "@/lib/api-error";
import { NextResponse } from "next/server";
import { requireCandidate } from "@/lib/auth/authorization";
import {
  getCandidateResumes,
  createCandidateResume,
  saveCandidateResume,
} from "@/lib/resume/resume-service";
import { parseResumeContent } from "@/lib/resume/serialization";

export async function GET() {
  try {
    const user = await requireCandidate();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 },
      );
    }

    const rawResumes = await getCandidateResumes(user.id);
    const resumes = rawResumes.map(({ contentJson, ...resume }) => ({
      ...resume,
      data: parseResumeContent(contentJson),
    }));

    return NextResponse.json({ success: true, resumes });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load resumes.";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCandidate();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 },
      );
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 1_000_000) {
      return NextResponse.json(
        { success: false, error: "Resume data exceeds the 1 MB limit." },
        { status: 413 },
      );
    }

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 1_000_000) {
      return NextResponse.json(
        { success: false, error: "Resume data exceeds the 1 MB limit." },
        { status: 413 },
      );
    }

    const payload = JSON.parse(rawBody);
    if (payload.action === "create" || payload.action === "duplicate") {
      if(payload.action==="duplicate" && !payload.sourceResumeId) return NextResponse.json({success:false,error:"Choose a source resume."},{status:400});
      const resume=await createCandidateResume(user.id,payload.action==="duplicate" ? payload.sourceResumeId:undefined);
      return NextResponse.json({success:true,resume:{...resume,data:parseResumeContent(resume.contentJson)}});
    }
    const body = payload.content || payload;
    if (
      !body ||
      typeof body !== "object" ||
      !body.personalInfo ||
      typeof body.personalInfo !== "object" ||
      !Array.isArray(body.skills) ||
      !Array.isArray(body.experience) ||
      !Array.isArray(body.education) ||
      !Array.isArray(body.projects) ||
      !Array.isArray(body.certifications) ||
      !Array.isArray(body.achievements)
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid resume data." },
        { status: 400 },
      );
    }

    const containsEmbeddedFiles =
      body.certifications.some(
        (item: { credentialUrl?: unknown }) =>
          typeof item?.credentialUrl === "string" &&
          item.credentialUrl.startsWith("data:"),
      ) ||
      body.achievements.some(
        (item: { proofUrl?: unknown }) =>
          typeof item?.proofUrl === "string" &&
          item.proofUrl.startsWith("data:"),
      );
    if (containsEmbeddedFiles) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Use a credential verification URL; file uploads are not supported.",
        },
        { status: 400 },
      );
    }

    const saved = await saveCandidateResume(user.id, {...payload,content:body});

    return NextResponse.json({ success: true, resume: saved });
  } catch (error: unknown) { return apiError(error); }
}
