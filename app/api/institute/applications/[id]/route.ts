import { NextRequest, NextResponse } from "next/server";
import { requireInstituteAdmin } from "@/lib/auth/authorization";
import { updateInstituteApplicationStatus } from "@/lib/institute/institute-service";
import {
  ApplicationState,
  type ApplicationState as ApplicationStateType,
} from "@/lib/application-state";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireInstituteAdmin();
    const { id } = await params;
    const body = await req.json();

    const status = body.status as ApplicationStateType;
    if (!status) {
      return NextResponse.json(
        { success: false, error: "Status field is required." },
        { status: 400 },
      );
    }

    const updated = await updateInstituteApplicationStatus(
      admin.id,
      id,
      status,
    );
    return NextResponse.json({ success: true, application: updated });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Internal Server Error";
    const status = msg.includes("Unauthorized")
      ? 401
      : msg.includes("Forbidden")
        ? 403
        : 400;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
