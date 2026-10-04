import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/authorization";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }

    const scans = await db.atsScan.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        targetJobTitle: true,
        companyName: true,
        overallScore: true,
        resumeQualityScore: true,
        confidenceScore: true,
        confidenceLevel: true,
        scoringEngineVersion: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      scans: scans.map((s) => ({
        id: s.id,
        targetJobTitle: s.targetJobTitle,
        companyName: s.companyName || undefined,
        jobMatchScore: s.scoringEngineVersion==="3.1.0"?s.overallScore:null,
        resumeQualityScore: s.scoringEngineVersion==="3.1.0"?s.resumeQualityScore:null,
        confidenceScore: s.scoringEngineVersion==="3.1.0"?s.confidenceScore:null,
        confidenceLevel: s.scoringEngineVersion==="3.1.0"?s.confidenceLevel:"Historical / unvalidated",
        createdAt: s.createdAt.toISOString(),
      })),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error.";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
