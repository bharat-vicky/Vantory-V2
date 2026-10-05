import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/authorization";
import { updateApplicationStatusByCompany, saveApplicationNotesByCompany } from "@/lib/company/company-service";
import { apiError } from "@/lib/api-error";
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
    if (status === undefined) {
      const application = await saveApplicationNotesByCompany(user.id, applicationId, note, body.expectedUpdatedAt);
      return NextResponse.json({success:true,application});
    }

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
      body.expectedUpdatedAt,
    );
    return NextResponse.json({ success: true, application: updated });
  } catch (error: unknown) {
    return apiError(error);
  }
}
