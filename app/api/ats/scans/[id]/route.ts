import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/authorization";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }

    const { id } = await params;
    const scan = await db.atsScan.findFirst({
      where: { id, userId: user.id },
    });

    if (!scan) {
      return NextResponse.json({ success: false, error: "Scan report not found." }, { status: 404 });
    }

    let snapshot = {};
    try {
      snapshot = JSON.parse(scan.reportSnapshotJson);
    } catch {
      snapshot = {
        scanId: scan.id,
        jobMatchScore: scan.overallScore,
        resumeQualityScore: scan.resumeQualityScore,
        targetJobTitle: scan.targetJobTitle,
        companyName: scan.companyName,
      };
    }

    snapshot={...snapshot,scanId:scan.id,resumeId:scan.resumeId || undefined,assessmentStatus:scan.scoringEngineVersion === "3.1.0" ? "RULE_BASED":"HISTORICAL_UNVALIDATED"};
    return NextResponse.json({
      success: true,
      scan: {
        id: scan.id,
        resumeId:scan.resumeId,
        targetJobTitle: scan.targetJobTitle,
        companyName: scan.companyName,
        jobDescription: scan.jobDescription,
        overallScore: scan.overallScore,
        resumeQualityScore: scan.resumeQualityScore,
        snapshot,
        createdAt: scan.createdAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error.";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.atsScan.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Scan not found or unauthorized." }, { status: 404 });
    }

    await db.atsScan.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "ATS scan report deleted." });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error.";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
