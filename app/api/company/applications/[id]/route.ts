import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/authorization";
import { updateApplicationStatusByCompany } from "@/lib/company/company-service";
import { ApplicationState } from "@/lib/application-state";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: applicationId } = await params;
    const user = await getCurrentUser();
    if (
      !user ||
      (user.role !== "COMPANY_ADMIN" && user.role !== "SUPER_ADMIN")
    ) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Company Admin role required." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { status, note } = body;

    if (!status || !Object.values(ApplicationState).includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid application status." },
        { status: 400 },
      );
    }

    const updated = await updateApplicationStatusByCompany(
      user.id,
      applicationId,
      status,
      note,
    );
    return NextResponse.json({ success: true, application: updated });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to update application status.";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 400 },
    );
  }
}
