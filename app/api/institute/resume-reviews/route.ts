import {NextResponse} from "next/server";
import {requireInstituteAdmin} from "@/lib/auth/authorization";
import {ApiError,apiError,objectId} from "@/lib/api-error";
import {db} from "@/lib/db";
import {linkedInstitute,authorizedReview,reviewAccess} from "@/lib/resume/reviews";
import {parseResumeContent} from "@/lib/resume/serialization";
import {checkRateLimit} from "@/lib/rate-limit";
export async function GET(request:Request){try{
  const admin=await requireInstituteAdmin();const id=new URL(request.url).searchParams.get("id");
  if(id){if(!objectId(id))throw new ApiError("Invalid review.");const review=await authorizedReview(id,admin.id);return NextResponse.json({success:true,review:{...review,snapshot:parseResumeContent(review.snapshotJson)}});}
  const institute=await linkedInstitute(admin.id);
  const students=await db.user.findMany({where:{instituteId:institute.instituteId},select:{id:true,name:true,instituteId:true,profile:{select:{careerJson:true}}}});
  const requests=await db.resumeReviewRequest.findMany({where:{instituteId:institute.instituteId!,userId:{in:students.map(s=>s.id)},status:{not:"REVOKED"},expiresAt:{gt:new Date()}},orderBy:{createdAt:"desc"},take:100,select:{id:true,userId:true,instituteId:true,title:true,status:true,expiresAt:true,createdAt:true}});
  return NextResponse.json({success:true,requests:requests.filter(r=>{const student=students.find(s=>s.id===r.userId);return student && reviewAccess(r,student,institute.instituteId!);}).map(r=>({...r,studentName:students.find(s=>s.id===r.userId)?.name}))});
}catch(e){return apiError(e);}}
export async function POST(request:Request){try{
  const admin=await requireInstituteAdmin();const raw=await request.text();if(raw.length>5000)throw new ApiError("Comment request is too large.",413);
  let b;try{b=JSON.parse(raw);}catch{throw new ApiError("Invalid review comment.");}
  if(!objectId(b?.id) || typeof b.text!=="string" || !b.text.trim() || b.text.length>2000)throw new ApiError("Provide a review and a comment of up to 2,000 characters.");
  if(!checkRateLimit(`coach-comment:${admin.id}`,50,15*60000).allowed)throw new ApiError("Comment limit reached. Try again later.",429);
  const review=await authorizedReview(b.id,admin.id);const snapshot=parseResumeContent(review.snapshotJson);
  const anchor=b.anchor;if(anchor){if(!["experience","projects"].includes(anchor.section) || typeof anchor.itemId!=="string" || !Number.isInteger(anchor.bulletIndex) || anchor.bulletIndex<0)throw new ApiError("Invalid comment anchor.");const items=anchor.section==="projects"?snapshot.projects:snapshot.experience;const item=items.find(i=>i.id===anchor.itemId);if(!item || typeof item.bullets[anchor.bulletIndex]!=="string")throw new ApiError("Selected bullet was not found in the shared snapshot.");}
  await db.$transaction(async tx=>{const changed=await tx.resumeReviewRequest.updateMany({where:{id:review.id,status:{not:"REVOKED"},expiresAt:{gt:new Date()}},data:{status:"REVIEWED"}});if(!changed.count)throw new ApiError("Sharing permission expired.",409);await tx.resumeReviewComment.create({data:{requestId:review.id,reviewerId:admin.id,text:b.text.trim(),anchorJson:anchor?JSON.stringify(anchor):null}});});
  return NextResponse.json({success:true});
}catch(e){return apiError(e);}}
