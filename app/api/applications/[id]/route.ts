import { apiError } from "@/lib/api-error";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/authorization";
import { getApplicationDetails, withdrawApplication } from "@/lib/jobs/jobs-service";

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
    const application = await getApplicationDetails(user.id, id);

    if (!application) {
      return NextResponse.json({ success: false, error: "Application not found or unauthorized." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      application,
    });
  } catch (error: unknown) {
    return apiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, status } = body;

    // Strict Security Guard: Block any attempted candidate status escalation (e.g. OFFERED, SHORTLISTED)
    if (status && status !== "WITHDRAWN") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Candidates cannot arbitrarily modify application status." },
        { status: 403 }
      );
    }

    if (action === "withdraw" || status === "WITHDRAWN") {
      const updated = await withdrawApplication(user.id, id);
      return NextResponse.json({
        success: true,
        message: "Application withdrawn.",
        status: updated.status,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
  } catch (error: unknown) {
    return apiError(error);
  }
}
