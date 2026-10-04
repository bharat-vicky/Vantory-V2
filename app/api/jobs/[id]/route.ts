import { apiError } from "@/lib/api-error";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/authorization";
import { getJobById } from "@/lib/jobs/jobs-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const job = await getJobById(id, user?.id);
    if (!job) {
      return NextResponse.json({ success: false, error: "Job posting not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      job,
    });
  } catch (error: unknown) {
    return apiError(error);
  }
}
