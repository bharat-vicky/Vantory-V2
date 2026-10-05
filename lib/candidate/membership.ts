import {db} from "@/lib/db";
import {ApiError,objectId} from "@/lib/api-error";
import {defaultCareer,parseJson} from "@/lib/candidate/profile";
export async function candidateMembership(userId:string) {
  const user=await db.user.findUnique({where:{id:userId},include:{institute:true,profile:true}});
  if (!user) throw new ApiError("Account unavailable.",404);
  const career=parseJson(user.profile?.careerJson,defaultCareer);
  const accepted=user.instituteId ? await db.instituteInvitation.findFirst({where:{instituteId:user.instituteId,email:user.email,status:"ACCEPTED"},orderBy:{updatedAt:"desc"},select:{updatedAt:true}}) : null;
  return {institute:user.institute ? {id:user.institute.id,name:user.institute.name,verificationStatus:user.institute.verificationStatus || "PENDING",acceptedAt:accepted?.updatedAt.toISOString() || null} : null,
    updatedAt:user.updatedAt.toISOString(),mentorConsent:career.mentorConsent,instituteAnalyticsConsent:career.instituteAnalyticsConsent};
}
export async function leaveCandidateInstitute(userId:string,body:Record<string,unknown>) {
  if (!body || typeof body !== "object") throw new ApiError("Confirm your institute membership.");
  if (body.confirm !== true || !objectId(body.instituteId) || typeof body.expectedUpdatedAt !== "string") throw new ApiError("Confirm the institute membership you want to leave.");
  await db.$transaction(async tx=>{
    const user=await tx.user.findUnique({where:{id:userId},include:{profile:true}});
    if (!user || user.instituteId !== body.instituteId || user.updatedAt.toISOString() !== body.expectedUpdatedAt) throw new ApiError("Membership changed. Refresh before leaving.",409);
    const changed=await tx.user.updateMany({where:{id:userId,instituteId:user.instituteId,updatedAt:user.updatedAt},data:{instituteId:null}});
    if (changed.count !== 1) throw new ApiError("Membership changed. Refresh before leaving.",409);
    const career={...parseJson(user.profile?.careerJson,defaultCareer),mentorConsent:false,instituteAnalyticsConsent:false,consentUpdatedAt:new Date().toISOString()};
    await tx.profile.upsert({where:{userId},create:{userId,careerJson:JSON.stringify(career)},update:{careerJson:JSON.stringify(career)}});
    await tx.resumeReviewRequest.updateMany({where:{userId,status:{in:["OPEN","REVIEWED"]}},data:{status:"REVOKED"}});
    await tx.instituteInvitation.updateMany({where:{instituteId:user.instituteId!,email:user.email,status:"ACCEPTED"},data:{status:"LEFT"}});
    await tx.activityLog.create({data:{userId,type:"INSTITUTE_MEMBERSHIP_LEFT",title:"Left institute placement roster",detail:"Institute sharing disabled and active reviews revoked."}});
  });
}
