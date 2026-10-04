import { NextResponse } from "next/server";
import { requireCandidate } from "@/lib/auth/authorization";
import { ApiError,apiError,objectId } from "@/lib/api-error";
import { db } from "@/lib/db";
import { parseResumeContent,serializeResumeContent } from "@/lib/resume/serialization";
import { changeAnchoredBullet } from "@/lib/resume/coaching";
import { checkRateLimit } from "@/lib/rate-limit";
export async function GET(request:Request){try{
  const u=await requireCandidate();const id=new URL(request.url).searchParams.get("resumeId");if(!objectId(id))throw new ApiError("Select a resume.");
  const owned=await db.resume.findFirst({where:{id,userId:u.id}});if(!owned)throw new ApiError("Resume not found.",404);
  const changes=await db.resumeFeedbackChange.findMany({where:{userId:u.id,resumeId:id},orderBy:{createdAt:"desc"},take:30});
  return NextResponse.json({success:true,changes:changes.map(c=>({...c,anchor:JSON.parse(c.anchorJson),checks:JSON.parse(c.checksJson)}))});
}catch(e){return apiError(e);}}
export async function POST(request:Request){try{
  const u=await requireCandidate();const raw=await request.text();if(raw.length>10000)throw new ApiError("Revision request is too large.",413);
  let b;try{b=JSON.parse(raw);}catch{throw new ApiError("Invalid revision request.");}
  if(!objectId(b?.resumeId) || typeof b.expectedUpdatedAt!=="string" || !Number.isFinite(Date.parse(b.expectedUpdatedAt)))throw new ApiError("Reload the resume before revising.",409);
  if(b.confirmFacts!==true)throw new ApiError("Confirm that this revision accurately describes your work.");
  if(!checkRateLimit(`resume-coaching:${u.id}`,30,15*60000).allowed)throw new ApiError("Revision limit reached. Try again later.",429);
  const existing=await db.resume.findFirst({where:{id:b.resumeId,userId:u.id}});if(!existing)throw new ApiError("Resume not found.",404);
  const revised=changeAnchoredBullet(parseResumeContent(existing.contentJson),b.anchor,b.beforeText,b.afterText);
  const saved=await db.$transaction(async tx=>{
    const updated=await tx.resume.updateMany({where:{id:existing.id,userId:u.id,updatedAt:new Date(b.expectedUpdatedAt)},data:{contentJson:serializeResumeContent(revised.data)}});
    if(updated.count!==1)throw new ApiError("This resume changed in another tab. Your proposed edit is preserved; reload before applying it.",409);
    const resume=await tx.resume.findUniqueOrThrow({where:{id:existing.id}});
    await tx.resumeFeedbackChange.create({data:{userId:u.id,resumeId:existing.id,anchorJson:JSON.stringify(b.anchor),beforeText:b.beforeText,afterText:b.afterText.trim(),beforeRevision:existing.updatedAt,afterRevision:resume.updatedAt,checksJson:JSON.stringify({version:"writing.v1",before:revised.before,after:revised.after})}});
    return resume;
  });
  return NextResponse.json({success:true,resume:{...saved,data:parseResumeContent(saved.contentJson)},checks:{before:revised.before,after:revised.after}});
}catch(e){return apiError(e);}}
