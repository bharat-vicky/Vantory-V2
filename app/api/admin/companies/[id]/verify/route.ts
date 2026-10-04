import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { ApiError, apiError, objectId } from "@/lib/api-error";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getCurrentUser();
    if (!admin) throw new ApiError("Please sign in.", 401);
    if (admin.role !== "SUPER_ADMIN") throw new ApiError("Organizational review requires platform administrator access.", 403);
    const { id } = await params;
    const { evidence, verified } = await request.json();
    if (!objectId(id) || typeof verified !== "boolean" || typeof evidence !== "string" || evidence.trim().length < 20) throw new ApiError("Document the organization and domain checks performed before approving or rejecting verification.");
    const profile = await db.companyProfile.findUnique({ where: { id } });
    if (!profile) throw new ApiError("Company not found.", 404);
    await db.$transaction(async tx => {
      await tx.companyProfile.update({ where: { id }, data: { verificationStatus: verified ? "VERIFIED" : "REJECTED" } });
      await tx.jobPosting.updateMany({ where: { companyUserId: profile.userId }, data: { verificationStatus: verified ? "VERIFIED" : "REJECTED" } });
      await tx.activityLog.create({ data: { userId: admin.id, type: "COMPANY_VERIFICATION", title: `Reviewed ${profile.companyName}`, detail: JSON.stringify({ profileId: id, verified, evidence: evidence.trim().slice(0, 4000) }) } });
    });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
