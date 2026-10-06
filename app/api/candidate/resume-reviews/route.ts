import {NextResponse} from "next/server";
import {requireCandidate} from "@/lib/auth/authorization";
import {db} from "@/lib/db";
import {ApiError,apiError,objectId} from "@/lib/api-error";
import {linkedInstitute} from "@/lib/resume/reviews";
import {defaultCareer,parseJson} from "@/lib/candidate/profile";
import {parseResumeContent} from "@/lib/resume/serialization";
import {checkRateLimit} from "@/lib/rate-limit";
export async function GET(){try{const u=await requireCandidate();const requests=await db.resumeReviewRequest.findMany({where:{userId:u.id},orderBy:{createdAt:"desc"},take:30,include:{comments:{orderBy:{createdAt:"asc"}}}});return NextResponse.json({success:true,requests});}catch(e){return apiError(e);}}
export async function POST(request:Request){try{
  const u=await requireCandidate();const raw=await request.text();if(raw.length>3000)throw new ApiError("Review request is too large.",413);
  let b;try{b=JSON.parse(raw);}catch{throw new ApiError("Invalid review request.");}
  if(b?.action==="revoke"){
    if(!objectId(b.id))throw new ApiError("Invalid review.");const updated=await db.resumeReviewRequest.updateMany({where:{id:b.id,userId:u.id},data:{status:"REVOKED"}});if(!updated.count)throw new ApiError("Review not found.",404);return NextResponse.json({success:true});
  }
  if(b?.action==="resolve" || b?.action==="reopen"){
    if(!objectId(b.id) || !objectId(b.commentId))throw new ApiError("Invalid review comment.");const owned=await db.resumeReviewRequest.findFirst({where:{id:b.id,userId:u.id}});if(!owned)throw new ApiError("Review not found.",404);const changed=await db.resumeReviewComment.updateMany({where:{id:b.commentId,requestId:owned.id},data:{resolvedAt:b.action==="reopen" ? null : new Date()}});if(!changed.count)throw new ApiError("Comment not found.",404);return NextResponse.json({success:true});
  }
  if(b?.action!=="request" || !objectId(b.resumeId))throw new ApiError("Choose a resume for review.");
  const user=await linkedInstitute(u.id);if(!parseJson(user.profile?.careerJson,defaultCareer).mentorConsent)throw new ApiError("Enable mentor sharing in your profile before requesting review.",409);
  const resume=await db.resume.findFirst({where:{id:b.resumeId,userId:u.id}});if(!resume)throw new ApiError("Resume not found.",404);
  if(b.previousReviewId!==undefined){
    if(!objectId(b.previousReviewId) || typeof b.expectedResumeUpdatedAt!=="string")throw new ApiError("Choose a saved revision for review.");
    if(b.expectedInstituteId!==user.instituteId)throw new ApiError("Your institute membership changed. Refresh before sharing.",409);
    const previous=await db.resumeReviewRequest.findFirst({where:{id:b.previousReviewId,userId:u.id,resumeId:resume.id}});
    if(!previous)throw new ApiError("Previous review not found.",404);
    if(resume.updatedAt.toISOString()!==b.expectedResumeUpdatedAt)throw new ApiError("Your saved resume changed. Refresh before sharing it.",409);
    if(previous.resumeRevision.getTime()===resume.updatedAt.getTime())throw new ApiError("Revise and save your resume before requesting another review.",409);
    const active=await db.resumeReviewRequest.findFirst({where:{userId:u.id,resumeId:resume.id,instituteId:user.instituteId!,resumeRevision:resume.updatedAt,status:{in:["OPEN","REVIEWED"]},expiresAt:{gt:new Date()}}});
    if(active)throw new ApiError("This saved revision already has an active review. Open it in your inbox.",409);
  }
  if(!checkRateLimit(`resume-review:${u.id}`,5,86400000).allowed)throw new ApiError("Review request limit reached. Try again tomorrow.",429);
  const review=await db.resumeReviewRequest.create({data:{userId:u.id,instituteId:user.instituteId!,resumeId:resume.id,resumeRevision:resume.updatedAt,title:resume.title,snapshotJson:JSON.stringify(parseResumeContent(resume.contentJson)),expiresAt:new Date(Date.now()+7*86400000)}});
  return NextResponse.json({success:true,review});
}catch(e){return apiError(e);}}
