import { jobPreparationDescription } from "@/lib/jobs/context";
import { checkRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { requireCandidate } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { ApiError, apiError, objectId } from "@/lib/api-error";
export async function POST(request:Request) {try {
 const user=await requireCandidate(); const b=await request.json();
 const str=(v:unknown,max:number)=>typeof v==="string" ? v.trim().slice(0,max):"";
 const title=str(b.targetJobTitle,150), jd=str(b.jobDescription,30000);
 if(!title || !jd) throw new ApiError("Target title and job description are required.");
 const type=b.interviewType || "FULL", difficulty=b.difficulty || "Medium", style=b.interviewerStyle || "Professional", duration=Number(b.durationMinutes || 20);
 if(!["FULL","TECHNICAL","BEHAVIORAL","RESUME_BASED","JOB_SPECIFIC"].includes(type) || !["Easy","Medium","Hard","Expert"].includes(difficulty) || !["Professional","Friendly","Strict","FAANG-style","Startup-style"].includes(style) || !Number.isInteger(duration) || duration<5 || duration>60) throw new ApiError("Invalid interview configuration.");
 if(!process.env.GEMINI_API_KEY) throw new ApiError("Interview assessment is temporarily unavailable. Try again later.",503,"AI_UNAVAILABLE");
 let resumeContent=str(b.uploadedResumeText,50000);let resumeRevision:string|undefined;
 if(b.resumeId) {if(!objectId(b.resumeId)) throw new ApiError("Invalid resume ID.");const r=await db.resume.findFirst({where:{id:b.resumeId,userId:user.id}});if(!r) throw new ApiError("Resume not found.",404);resumeContent=r.contentJson;resumeRevision=r.updatedAt.toISOString();}
 if(b.jobId) {if(!objectId(b.jobId)) throw new ApiError("Invalid job ID.");const j=await db.jobPosting.findFirst({where:{id:b.jobId,status:"ACTIVE",verificationStatus:"VERIFIED"}});if(!j || (j.expiresAt && j.expiresAt<new Date())) throw new ApiError("Job is not available.",404);if(jobPreparationDescription(j)!==jd || j.title!==title) throw new ApiError("Job context changed. Refresh the job workspace.",409);}
 const limit=checkRateLimit(`interview-create:${user.id}`,8,15*60*1000);if(!limit.allowed)throw new ApiError("Interview creation limit reached. Try again later.",429);
 const session=await db.interviewSession.create({data:{userId:user.id,resumeId:b.resumeId || null,jobId:b.jobId || null,targetJobTitle:title,jobRole:title,companyName:str(b.companyName,150) || null,jobDescription:jd,interviewType:type,difficulty,interviewerStyle:style,durationMinutes:duration,currentDifficulty:difficulty,assessmentVersion:"rubric.v2",sessionStateJson:JSON.stringify({version:3,resumeContent,resumeRevision})}});
 return NextResponse.json({success:true,sessionId:session.id});
} catch(e){return apiError(e);}}
export async function GET() {
  try {
    const user = await requireCandidate();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }

    const sessions = await db.interviewSession.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        targetJobTitle: true,
        companyName: true,
        interviewType: true,
        difficulty: true,
        durationMinutes: true,
        status: true,
        overallScore: true,
        readinessScore: true,
        readinessLevel: true,
        createdAt: true,
        assessmentVersion: true,
      },
    });

    const completed = sessions.filter((s) => s.status === "COMPLETED" && s.assessmentVersion === "rubric.v2" && s.overallScore != null);
    const avgScore = completed.length > 0
      ? Math.round(completed.reduce((sum, s) => sum + (s.overallScore || 0), 0) / completed.length)
      : null;

    return NextResponse.json({
      success: true,
      sessions: sessions.map(s=>s.assessmentVersion === "rubric.v2" ? s:{...s,overallScore:null,readinessScore:null,readinessLevel:"Historical / unvalidated"}),
      stats: {
        totalInterviews: sessions.length,
        completedCount: completed.length,
        averageScore: avgScore,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to fetch interview history." },
      { status: 500 }
    );
  }
}
