import { NextResponse } from "next/server";
import { requireCandidate } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { ApiError, apiError, objectId } from "@/lib/api-error";
import { defaultCareer,parseJson } from "@/lib/candidate/profile";

export async function GET() {
  try {
    const user = await requireCandidate();
    const invitations = await db.instituteInvitation.findMany({ where: { email: user.email, status: "PENDING", expiresAt: { gt: new Date() } } });
    const institutes = await db.institute.findMany({ where: { id: { in: invitations.map(i => i.instituteId) } }, select: { id: true, name: true } });
    return NextResponse.json({ success: true, invitations: invitations.map(i => ({ id: i.id, instituteName: institutes.find(n => n.id === i.instituteId)?.name || "Institute", roster: JSON.parse(i.rosterJson), expiresAt: i.expiresAt })) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireCandidate();
    const { invitationId, accept } = await request.json();
    if (!objectId(invitationId) || typeof accept !== "boolean") throw new ApiError("Choose an invitation and accept or decline it.");
    await db.$transaction(async tx => {
      const invitation = await tx.instituteInvitation.findFirst({ where: { id: invitationId, email: user.email, status: "PENDING", expiresAt: { gt: new Date() } } });
      if (!invitation) throw new ApiError("Invitation is unavailable.", 404);
      if (accept) {
        const changed = await tx.user.updateMany({ where: { id: user.id, OR: [{ instituteId: null }, { instituteId: { isSet: false } }, { instituteId: invitation.instituteId }] }, data: { instituteId: invitation.instituteId } });
        if (!changed.count) throw new ApiError("You already belong to another institute.", 409);
        const roster = JSON.parse(invitation.rosterJson);
        const existingProfile=await tx.profile.findUnique({where:{userId:user.id}});
        const career={...parseJson(existingProfile?.careerJson,defaultCareer),mentorConsent:false,instituteAnalyticsConsent:false,consentUpdatedAt:new Date().toISOString()};
        await tx.profile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...roster,careerJson:JSON.stringify(career) }, update: {...roster,careerJson:JSON.stringify(career)} });
      }
      const consumed=await tx.instituteInvitation.updateMany({ where: { id: invitation.id,email:user.email,status:"PENDING",expiresAt:{gt:new Date()},updatedAt:invitation.updatedAt }, data: { status: accept ? "ACCEPTED" : "DECLINED" } });
      if (consumed.count !== 1) throw new ApiError("Invitation changed. Refresh before responding.",409);
    });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
