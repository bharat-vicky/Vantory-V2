import { NextResponse } from "next/server";
import { generateLatexSource } from "@/lib/resume/latex/renderer";
import { ResumeData } from "@/lib/resume/types";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/authorization";
import { parseResumeContent } from "@/lib/resume/serialization";
import { compileResumePdf } from "@/lib/resume/pdf-compiler";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    const { id } = await params;
    const url = new URL(request.url);
    const format = url.searchParams.get("format");

    const resume = await db.resume.findFirst({
      where: { id, userId: user.id },
    });

    if (!resume) {
      return NextResponse.json(
        { success: false, error: "Resume not found" },
        { status: 404 },
      );
    }

    const resumeData = parseResumeContent(resume.contentJson);

    if (format === "tex") {
      const latexSource = generateLatexSource(resumeData);
      const fileName = `${(resumeData.personalInfo?.fullName || "Resume").trim().replace(/[^\w.-]+/g, "_")}.tex`;
      return new NextResponse(latexSource, {
        status: 200,
        headers: {
          "Content-Type": "application/x-tex; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    if (format === "json") {
      return NextResponse.json(
        { success: true, title: resume.title, resumeData },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }

    // Authoritative PDF Compilation
    const pdfResult = await compileResumePdf(resumeData);

    return new NextResponse(new Uint8Array(pdfResult.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdfResult.fileName}"`,
        "Content-Length": pdfResult.buffer.length.toString(),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "PDF load failed.";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401, headers: { "Cache-Control": "private, no-store" } },
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

    const body: ResumeData = JSON.parse(rawBody);
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
        { success: false, error: "Invalid ResumeData payload" },
        { status: 400 },
      );
    }

    const pdfResult = await compileResumePdf(body);

    return new NextResponse(new Uint8Array(pdfResult.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdfResult.fileName}"`,
        "Content-Length": pdfResult.buffer.length.toString(),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: unknown) {
    console.error("PDF Compilation Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "PDF generation failed.";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
