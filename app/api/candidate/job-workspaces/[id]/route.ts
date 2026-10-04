import { jobPreparationDescription } from "@/lib/jobs/context";
import {NextResponse} from "next/server";
import {requireCandidate} from "@/lib/auth/authorization";
import {db} from "@/lib/db";
import {ApiError,apiError,objectId} from "@/lib/api-error";
import {defaultCareer,parseJson} from "@/lib/candidate/profile";
import {checkEligibility,Eligibility} from "@/lib/jobs/eligibility";
import {TOPICS} from "@/lib/preparation/curriculum";
import {textDemonstratesSkill} from "@/lib/ats/taxonomy/text-skills";
export async function GET(_r:Request,{params}:{params:Promise<{id:string}>}){try{
 const u=await requireCandidate();const {id}=await params;if(!objectId(id))throw new ApiError("Invalid job ID.");
 const [job,workspace,resumes,profile,application]=await Promise.all([db.jobPosting.findUnique({where:{id}}),db.candidateJobWorkspace.findUnique({where:{userId_jobId:{userId:u.id,jobId:id}}}),db.resume.findMany({where:{userId:u.id},select:{id:true,title:true,updatedAt:true},orderBy:{updatedAt:"desc"}}),db.profile.findUnique({where:{userId:u.id}}),db.jobApplication.findUnique({where:{userId_jobId:{userId:u.id,jobId:id}},select:{id:true,status:true}})]);
 if(!job)throw new ApiError("Job not found.",404);
 const selected=resumes.find(r=>r.id===workspace?.resumeId);const scan=workspace?.scanId?await db.atsScan.findFirst({where:{id:workspace.scanId,userId:u.id}}):null;
 const snapshot=scan?.reportSnapshotJson ? JSON.parse(scan.reportSnapshotJson):null;
 const stale=!!scan && (!selected || snapshot?.resumeRevision!==selected.updatedAt.toISOString() || scan.jobDescription!==jobPreparationDescription(job) || scan.scoringEngineVersion!=="3.1.0");
 const interviewRecord=selected?await db.interviewSession.findFirst({where:{userId:u.id,jobId:id,resumeId:selected.id,assessmentVersion:"rubric.v2"},orderBy:{createdAt:"desc"},select:{id:true,status:true,sessionStateJson:true,jobDescription:true}}):null;
 const interview=interviewRecord?{id:interviewRecord.id,status:interviewRecord.status,stale:JSON.parse(interviewRecord.sessionStateJson).resumeRevision!==selected?.updatedAt.toISOString() || interviewRecord.jobDescription!==jobPreparationDescription(job)}:null;
 const gaps=(!stale?snapshot?.gaps:[]) || [];
 const prep=TOPICS.filter(t=>t.skills.some(s=>gaps.some((g:string)=>textDemonstratesSkill(g,s)) || textDemonstratesSkill(job.skills,s))).map(t=>({id:t.id,title:t.title}));
 const criteria=job.eligibilityJson?JSON.parse(job.eligibilityJson) as Eligibility:null;
 return NextResponse.json({success:true,job:{id:job.id,title:job.title,company:job.company,description:jobPreparationDescription(job),isAvailable:job.status==="ACTIVE" && job.verificationStatus==="VERIFIED" && (!job.expiresAt || job.expiresAt>=new Date())},workspace,resumes,selectedResume:selected,scan:scan?{id:scan.id,score:scan.overallScore,stale}:null,interview,application,preparation:prep,eligibility:checkEligibility(criteria,profile,parseJson(profile?.careerJson,defaultCareer))});
}catch(e){return apiError(e);}}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{
 const u=await requireCandidate();const {id}=await params;const b=await request.json();if(!objectId(id) || !objectId(b.resumeId))throw new ApiError("Choose a valid job and resume.");
 const job=await db.jobPosting.findUnique({where:{id}});const resume=await db.resume.findFirst({where:{id:b.resumeId,userId:u.id}});if(!job || !resume)throw new ApiError("Job or resume not found.",404);
 if(b.scanId){if(!objectId(b.scanId))throw new ApiError("Invalid scan.");const s=await db.atsScan.findFirst({where:{id:b.scanId,userId:u.id,resumeId:resume.id,jobDescription:jobPreparationDescription(job)}});if(!s || JSON.parse(s.reportSnapshotJson).resumeRevision!==resume.updatedAt.toISOString())throw new ApiError("Scan context changed. Rescan before attaching it.",409);}
 const workspace=await db.candidateJobWorkspace.upsert({where:{userId_jobId:{userId:u.id,jobId:id}},create:{userId:u.id,jobId:id,resumeId:resume.id,scanId:b.scanId || null},update:{resumeId:resume.id,scanId:b.scanId || null}});
 return NextResponse.json({success:true,workspace});
}catch(e){return apiError(e);}}
