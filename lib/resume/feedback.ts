import {db} from "@/lib/db";
import {ApiError,objectId} from "@/lib/api-error";
import {defaultCareer,parseJson} from "@/lib/candidate/profile";
import {parseResumeContent} from "@/lib/resume/serialization";
import type {ResumeData} from "@/lib/resume/types";

export function feedbackStatus(review:{status:string;expiresAt:Date},now=new Date()) {
  if(review.status === "REVOKED")return "REVOKED";
  if(review.expiresAt<=now)return "EXPIRED";
  return review.status === "REVIEWED" ? "REVIEWED" : "REQUESTED";
}
export function commentContext(raw:string|null,snapshot:ResumeData):{label:string;bullet:string}|null {
  try {const anchor=JSON.parse(raw || "null");if(!anchor || !["projects","experience"].includes(anchor.section) || !Number.isInteger(anchor.bulletIndex) || anchor.bulletIndex<0)return null;
    const section=anchor.section as "projects"|"experience",item=snapshot[section].find(i=>i.id===anchor.itemId);
    const bullet=item?.bullets[anchor.bulletIndex];if(!item || typeof bullet!=="string")return null;
    return {label:section === "projects" ? `Project: ${"title" in item ? item.title : ""}` : `Experience: ${"role" in item ? item.role : ""}`,bullet};
  }catch{return null;}
}
async function membership(userId:string) {
  const user=await db.user.findUnique({where:{id:userId},select:{instituteId:true,profile:{select:{careerJson:true}}}});
  return {instituteId:user?.instituteId || null,mentorConsent:parseJson(user?.profile?.careerJson,defaultCareer).mentorConsent===true};
}
export async function candidateFeedback(userId:string,params:URLSearchParams) {
  const id=params.get("id"),now=new Date();
  const joined=await membership(userId);
  if(id) {
    if(!objectId(id))throw new ApiError("Invalid review.");
    const review=await db.resumeReviewRequest.findFirst({where:{id,userId},include:{comments:{orderBy:{createdAt:"asc"}}}});
    if(!review)throw new ApiError("Review not found.",404);
    const [resume,institute,currentInstitute]=await Promise.all([db.resume.findFirst({where:{id:review.resumeId,userId},select:{id:true,title:true,updatedAt:true}}),db.institute.findUnique({where:{id:review.instituteId},select:{name:true}}),joined.instituteId ? db.institute.findUnique({where:{id:joined.instituteId},select:{name:true}}) : Promise.resolve(null)]);
    const snapshot=parseResumeContent(review.snapshotJson);
    return {review:{id:review.id,resumeId:review.resumeId,title:review.title,status:feedbackStatus(review,now),createdAt:review.createdAt,expiresAt:review.expiresAt,resumeRevision:review.resumeRevision,instituteName:institute?.name || "Previous institute",currentInstituteName:currentInstitute?.name || null,currentInstituteId:joined.instituteId,sharingActive:joined.mentorConsent && joined.instituteId===review.instituteId && !["REVOKED","EXPIRED"].includes(feedbackStatus(review,now)),resumeAvailable:!!resume,revisionChanged:!!resume && resume.updatedAt.getTime()!==review.resumeRevision.getTime(),currentRevision:resume?.updatedAt || null,canRequestAgain:!!resume && joined.mentorConsent && !!currentInstitute,comments:review.comments.map(c=>({id:c.id,text:c.text,createdAt:c.createdAt,resolvedAt:c.resolvedAt,context:commentContext(c.anchorJson,snapshot)}))}};
  }
  const status=params.get("status") || "ALL",search=(params.get("search") || "").trim(),page=Math.max(1,Math.min(1000,Number(params.get("page")) || 1));
  if(!["ALL","REQUESTED","REVIEWED","REVOKED","EXPIRED"].includes(status) || search.length>150 || !Number.isInteger(page))throw new ApiError("Invalid inbox filter.");
  const where={userId,...(search ? {title:{contains:search,mode:"insensitive" as const}} : {}),...(status === "EXPIRED" ? {status:{not:"REVOKED"},expiresAt:{lte:now}} : status === "REVOKED" ? {status:"REVOKED"} : status !== "ALL" ? {status:status === "REQUESTED" ? "OPEN" : "REVIEWED",expiresAt:{gt:now}} : {})};
  const [total,reviews]=await Promise.all([db.resumeReviewRequest.count({where}),db.resumeReviewRequest.findMany({where,orderBy:{createdAt:"desc"},skip:(page-1)*25,take:25,select:{id:true,resumeId:true,instituteId:true,title:true,status:true,expiresAt:true,createdAt:true,resumeRevision:true,comments:{orderBy:{createdAt:"desc"},select:{id:true,text:true,resolvedAt:true,createdAt:true}}}})]);
  const institutes=reviews.length ? await db.institute.findMany({where:{id:{in:[...new Set(reviews.map(r=>r.instituteId))]}},select:{id:true,name:true}}) : [];
  return {total,page,reviews:reviews.map(r=>({id:r.id,resumeId:r.resumeId,title:r.title,status:feedbackStatus(r,now),createdAt:r.createdAt,expiresAt:r.expiresAt,resumeRevision:r.resumeRevision,instituteName:institutes.find(i=>i.id===r.instituteId)?.name || "Previous institute",commentCount:r.comments.length,openComments:r.comments.filter(c=>!c.resolvedAt).length,preview:r.comments[0]?.text.slice(0,180) || null})),sharing:joined};
}
export async function feedbackReminders(userId:string) {
  const joined=await membership(userId);if(!joined.mentorConsent || !joined.instituteId)return [];
  const reviews=await db.resumeReviewRequest.findMany({where:{userId,instituteId:joined.instituteId,status:"REVIEWED",expiresAt:{gt:new Date()},comments:{some:{resolvedAt:null}}},orderBy:{updatedAt:"desc"},take:10,select:{id:true,title:true,comments:{where:{resolvedAt:null},orderBy:{createdAt:"desc"},select:{createdAt:true}}}});
  return reviews.filter(r=>r.comments.length).map(r=>({id:`feedback-${r.id}`,title:`Resume feedback: ${r.title} · ${r.comments.length} to address`,at:r.comments[0].createdAt.toISOString(),href:`/feedback/${r.id}`}));
}
