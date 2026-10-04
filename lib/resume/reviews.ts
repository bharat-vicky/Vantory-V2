import {db} from "@/lib/db";
import {ApiError} from "@/lib/api-error";
import {defaultCareer,parseJson} from "@/lib/candidate/profile";
import type {CareerProfile} from "@/lib/candidate/profile";
export function reviewAccess(request:{instituteId:string;status:string;expiresAt:Date},student:{instituteId:string|null;profile?:{careerJson:string|null}|null},instituteId:string,now=new Date()) {
  return request.instituteId===instituteId && student.instituteId===instituteId && request.status!=="REVOKED" && request.expiresAt>now && parseJson<CareerProfile>(student.profile?.careerJson,defaultCareer).mentorConsent===true;
}
export async function linkedInstitute(userId:string){const user=await db.user.findUnique({where:{id:userId},select:{instituteId:true,profile:{select:{careerJson:true}}}});if(!user?.instituteId)throw new ApiError("Link your institute to request a career-team review.",409);return user;}
export async function authorizedReview(requestId:string,adminId:string){
  const admin=await linkedInstitute(adminId);
  const request=await db.resumeReviewRequest.findUnique({where:{id:requestId},include:{comments:{orderBy:{createdAt:"asc"}}}});
  if(!request)throw new ApiError("Review not found.",404);
  const student=await db.user.findUnique({where:{id:request.userId},select:{instituteId:true,profile:{select:{careerJson:true}}}});
  if(!student || !reviewAccess(request,student,admin.instituteId!))throw new ApiError("This review is unavailable or its sharing permission expired.",404);
  return request;
}
