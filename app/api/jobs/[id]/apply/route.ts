import { NextResponse } from "next/server";
import { apiError, ApiError } from "@/lib/api-error";
import { requireCandidate as getCurrentUser } from "@/lib/auth/authorization";
import { applyToJob } from "@/lib/jobs/jobs-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }

    const { id: jobId } = await params;
    const body = await request.json();
    const { resumeId, coverNote } = body;

    if (!resumeId || typeof resumeId !== "string") {
      return NextResponse.json(
        { success: false, error: "Please select a Vantory Resume to apply." },
        { status: 400 }
      );
    }

    if(typeof body.expectedResumeRevision!=="string" || !Number.isFinite(Date.parse(body.expectedResumeRevision)))throw new ApiError("Refresh and review the selected resume version before submitting.");
    const application = await applyToJob(user.id, jobId, resumeId, coverNote, body.expectedResumeRevision);

    return NextResponse.json({
      success: true,
      applicationId: application.id,
      status: application.status,
      message: "Application submitted successfully!",
    });
  } catch (error: unknown) {
    return apiError(error);
  }
}
