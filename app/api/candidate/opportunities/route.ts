import {NextResponse} from "next/server";
import {requireCandidate} from "@/lib/auth/authorization";
import {db} from "@/lib/db";
import {ApiError,apiError,objectId} from "@/lib/api-error";
import {isApplicationState} from "@/lib/application-state";
export async function GET(){try{const u=await requireCandidate();const opportunities=await db.candidateOpportunity.findMany({where:{userId:u.id},orderBy:{updatedAt:"desc"}});return NextResponse.json({success:true,opportunities});}catch(e){return apiError(e);}}
export async function POST(request:Request){try{
 const u=await requireCandidate();const b=await request.json();
 const text=(v:unknown,max:number,required=false)=>{if(v!==undefined && v!==null && typeof v!=="string")throw new ApiError("Invalid opportunity details.");const s=typeof v==="string"?v.trim():"";if(s.length>max || required && !s)throw new ApiError("Check required fields and text limits.");return s;};
 const title=text(b.title,150,true),company=text(b.company,150,true),url=text(b.url,2000),jobDescription=text(b.jobDescription,30000),notes=text(b.notes,4000);
 if(url){const parsed=new URL(url);if(parsed.protocol!=="https:" && parsed.protocol!=="http:")throw new ApiError("Use a web URL.");}
 const status=b.status || "SAVED";if(status!=="SAVED" && !isApplicationState(status))throw new ApiError("Unsupported status.");
 const date=(v:unknown)=>{if(v===null || v==="" || v===undefined)return null;if(typeof v!=="string" || !Number.isFinite(Date.parse(v)))throw new ApiError("Invalid date.");return new Date(v);};
 const data={title,company,url:url || null,jobDescription,notes:notes || null,status,deadline:date(b.deadline),interviewAt:date(b.interviewAt)};
 let opportunity;
 if(b.id){if(!objectId(b.id))throw new ApiError("Invalid opportunity.");const existing=await db.candidateOpportunity.findFirst({where:{id:b.id,userId:u.id}});if(!existing)throw new ApiError("Opportunity not found.",404);if(b.expectedUpdatedAt!==existing.updatedAt.toISOString())throw new ApiError("Opportunity changed. Reload before editing.",409);const timeline=JSON.parse(existing.timelineJson);if(existing.status!==status)timeline.push({status,at:new Date().toISOString(),source:"CANDIDATE_REPORTED"});const changed=await db.candidateOpportunity.updateMany({where:{id:b.id,userId:u.id,updatedAt:existing.updatedAt},data:{...data,timelineJson:JSON.stringify(timeline)}});if(changed.count!==1)throw new ApiError("Opportunity changed. Reload and retry.",409);opportunity=await db.candidateOpportunity.findUnique({where:{id:b.id}});}
 else opportunity=await db.candidateOpportunity.create({data:{userId:u.id,...data,timelineJson:JSON.stringify([{status,at:new Date().toISOString(),source:"CANDIDATE_REPORTED"}])}});
 return NextResponse.json({success:true,opportunity});
}catch(e){return apiError(e);}}
