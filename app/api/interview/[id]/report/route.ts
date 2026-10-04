import { NextResponse } from "next/server";
import { requireCandidate } from "@/lib/auth/authorization";
import { ApiError, apiError } from "@/lib/api-error";
import { ownedSession } from "@/lib/interview/session-service";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {try {
 const u=await requireCandidate();const s=await ownedSession(u.id,(await params).id);
 if(s.status!=="COMPLETED" || !s.reportSnapshotJson) throw new ApiError("Resume or end this session to see its report.",409);
 const report=JSON.parse(s.reportSnapshotJson);
 if(s.assessmentVersion!=="rubric.v2") {report.assessmentStatus="HISTORICAL_UNVALIDATED";report.overallScore=null;report.readinessScore=null;report.readinessLevel="Not assessed";report.categoryBreakdown=Object.fromEntries(Object.keys(report.categoryBreakdown || {}).map(k=>[k,null]));report.roleReadinessBreakdown={};report.historyProgression={previousAverage:null,currentAverage:null,improvement:null};report.questionReviews=[];report.strongestAreas=[];report.areasToImprove=["Start a new rubric-based practice session."];report.preparationPlan=[];}
 return NextResponse.json({success:true,report});
} catch(e){return apiError(e);}}
