import { checkRateLimit } from "@/lib/rate-limit";
import { randomUUID } from "node:crypto";
import { InterviewSession, MockInterviewQuestion } from "@prisma/client";
import { db } from "@/lib/db";
import { ApiError, objectId } from "@/lib/api-error";
import { InterviewEngine } from "./interview-engine";
import { EvaluatedQuestion, InterviewSetupConfig, InterviewSessionState, CandidateIntelligenceProfile } from "./types";
export const ASSESSMENT_VERSION = "rubric.v2";
export function sessionConfig(s: InterviewSession): InterviewSetupConfig {
  return { resumeId:s.resumeId || undefined,targetJobTitle:s.targetJobTitle,companyName:s.companyName || undefined,jobDescription:s.jobDescription,interviewType:s.interviewType as InterviewSetupConfig["interviewType"],difficulty:s.difficulty as InterviewSetupConfig["difficulty"],interviewerStyle:s.interviewerStyle as InterviewSetupConfig["interviewerStyle"],durationMinutes:s.durationMinutes };
}
export function sessionData(s: InterviewSession): {state:InterviewSessionState;profile:CandidateIntelligenceProfile;resumeContent?:string;resumeRevision?:string} {
  const data = JSON.parse(s.sessionStateJson);
  if (!data.profile || !(data.state || data).sessionId) throw new ApiError("This older session cannot be resumed. Start a new practice interview.",409);
  return {state:data.state || data,profile:data.profile,resumeContent:data.resumeContent,resumeRevision:data.resumeRevision};
}
export function questionDto(q: MockInterviewQuestion): EvaluatedQuestion {
  return {id:q.id,sessionId:q.sessionId,questionIndex:q.questionIndex,category:q.category,questionText:q.questionText,candidateAnswerText:q.candidateAnswerText || undefined,audioDurationSeconds:q.audioDurationSeconds ?? undefined,evaluation:q.evaluationJson ? JSON.parse(q.evaluationJson):undefined,isFollowUp:q.isFollowUp,followUpParentId:q.followUpParentId || undefined};
}
export async function ownedSession(userId:string,id:string) {
  if (!objectId(id)) throw new ApiError("Invalid session ID.");
  const s = await db.interviewSession.findFirst({where:{id,userId},include:{questions:{orderBy:{questionIndex:"asc"}}}});
  if (!s) throw new ApiError("Session not found.",404);
  return s;
}
export async function resumeSession(userId:string,id:string) {
  const s = await ownedSession(userId,id);
  return {sessionId:s.id,status:s.status,startedAt:s.startedAt,durationMinutes:s.durationMinutes,assessmentVersion:s.assessmentVersion,currentQuestion:s.questions.find(q=>q.questionIndex===s.currentQuestionIndex && !q.responseJson),answeredQuestions:s.questions.filter(q=>q.responseJson).map(questionDto),report:s.reportSnapshotJson ? JSON.parse(s.reportSnapshotJson):null};
}
export async function startSession(userId:string,id:string) {
  const s = await ownedSession(userId,id);
  if (s.status !== "CREATED") return {success:true,...await resumeSession(userId,id)};
  const initial = JSON.parse(s.sessionStateJson);
  let resumeContent = initial.resumeContent || initial.uploadedResumeText;
  if (s.resumeId && !resumeContent) {
    const r = await db.resume.findFirst({where:{id:s.resumeId,userId}});
    if (!r) throw new ApiError("Selected resume is not available.",404);
    resumeContent = r.contentJson;
  }
  const initialized = await InterviewEngine.initializeSession(id,sessionConfig(s),resumeContent);
  await db.$transaction(async tx=>{
    const updated = await tx.interviewSession.updateMany({where:{id,userId,status:"CREATED"},data:{status:"ACTIVE",startedAt:new Date(),currentQuestionIndex:1,assessmentVersion:ASSESSMENT_VERSION,sessionStateJson:JSON.stringify({version:3,state:initialized.state,profile:initialized.profile,resumeContent,resumeRevision:initial.resumeRevision})}});
    if (updated.count!==1) throw new ApiError("Session already started. Resume it from history.",409);
    await tx.mockInterviewQuestion.create({data:{sessionId:id,questionIndex:1,...initialized.openingQuestion}});
  });
  return {success:true,...await resumeSession(userId,id)};
}
export async function answerSession(userId:string,id:string,body:Record<string,unknown>) {
  const answer = typeof body.candidateAnswerText === "string" ? body.candidateAnswerText.trim():"";
  if (!objectId(body.questionId) || !answer || answer.length>12000) throw new ApiError("Select the current question and provide an answer of up to 12,000 characters.");
  const duration = body.audioDurationSeconds===undefined ? undefined:Number(body.audioDurationSeconds);
  if (duration!==undefined && (!Number.isFinite(duration) || duration<0 || duration>7200)) throw new ApiError("Invalid recording duration.");
  const s = await ownedSession(userId,id);
  const q = s.questions.find(q=>q.id===body.questionId);
  if (!q) throw new ApiError("Question not found.",404);
  if (q.responseJson) {
    if (q.candidateAnswerText!==answer) throw new ApiError("This question was already answered. Resume the current question.",409);
    return JSON.parse(q.responseJson);
  }
  if (s.status!=="ACTIVE" || q.questionIndex!==s.currentQuestionIndex) throw new ApiError("This question is not active.",409);
  const limit = checkRateLimit(`interview-answer:${userId}`, 40, 15 * 60 * 1000);
  if (!limit.allowed) throw new ApiError("Assessment limit reached. Try again later.",429);
  const lock = randomUUID();
  const locked = await db.interviewSession.updateMany({where:{id,userId,status:"ACTIVE",currentQuestionIndex:q.questionIndex,OR:[{answerLock:null},{answerLock:{isSet:false}},{lockExpiresAt:{lt:new Date()}}]},data:{answerLock:lock,lockExpiresAt:new Date(Date.now()+90000)}});
  if (locked.count!==1) throw new ApiError("Another submission is being processed. Wait, then retry.",409,"BUSY");
  try {
    const {state,profile,resumeContent,resumeRevision} = sessionData(s);
    state.elapsedSeconds=s.startedAt ? Math.floor((Date.now()-s.startedAt.getTime())/1000):state.elapsedSeconds;
    const processed=await InterviewEngine.processCandidateAnswer({sessionId:id,config:sessionConfig(s),profile,state,currentQuestion:questionDto(q),candidateAnswerText:answer,audioDurationSeconds:duration,allPreviousQuestions:s.questions.map(questionDto)});
    return await db.$transaction(async tx=>{
      const won=await tx.interviewSession.updateMany({where:{id,userId,answerLock:lock,status:"ACTIVE"},data:{currentQuestionIndex:processed.updatedState.currentQuestionIndex,currentDifficulty:processed.updatedState.currentDifficulty,sessionStateJson:JSON.stringify({version:3,state:processed.updatedState,profile,resumeContent,resumeRevision}),answerLock:null,lockExpiresAt:null}});
      if (won.count!==1) throw new ApiError("Session changed; recover it from history.",409);
      const next=processed.nextQuestion ? await tx.mockInterviewQuestion.create({data:{sessionId:id,questionIndex:processed.updatedState.currentQuestionIndex,category:processed.nextQuestion.category,questionText:processed.nextQuestion.questionText,isFollowUp:processed.nextQuestion.isFollowUp,followUpParentId:processed.nextQuestion.parentId}}):undefined;
      const response={success:true,evaluatedQuestion:processed.evaluatedQuestion,nextQuestion:next,isInterviewComplete:processed.isInterviewComplete};
      await tx.mockInterviewQuestion.update({where:{id:q.id},data:{candidateAnswerText:answer,audioDurationSeconds:duration===undefined ? null:Math.round(duration),evaluationJson:JSON.stringify(processed.evaluatedQuestion.evaluation),responseJson:JSON.stringify(response)}});
      return response;
    });
  } finally { await db.interviewSession.updateMany({where:{id,userId,answerLock:lock},data:{answerLock:null,lockExpiresAt:null}}); }
}
export async function endSession(userId:string,id:string) {
  const s=await ownedSession(userId,id);
  if (s.reportSnapshotJson) return JSON.parse(s.reportSnapshotJson);
  if (s.status!=="ACTIVE") throw new ApiError("Start the interview before ending it.",409);
  if (s.answerLock && s.lockExpiresAt && s.lockExpiresAt>new Date()) throw new ApiError("An answer is still being processed. Retry in a moment.",409);
  const {profile}=sessionData(s);
  const prior=await db.interviewSession.findMany({where:{userId,status:"COMPLETED",assessmentVersion:ASSESSMENT_VERSION,targetJobTitle:s.targetJobTitle,interviewType:s.interviewType,difficulty:s.difficulty,id:{not:id},overallScore:{not:null}},select:{overallScore:true}});
  const previousAverage=prior.length ? Math.round(prior.reduce((a,p)=>a+p.overallScore!,0)/prior.length):undefined;
  const report=InterviewEngine.finalizeReport({sessionId:id,profile,allEvaluatedQuestions:s.questions.map(questionDto),previousAverage});
  await db.$transaction(async tx=>{
  const updated=await tx.interviewSession.updateMany({where:{id,userId,status:"ACTIVE",updatedAt:s.updatedAt},data:{status:"COMPLETED",overallScore:report.overallScore,readinessScore:report.readinessScore,readinessLevel:report.readinessLevel,technicalScore:report.categoryBreakdown.technicalScore,communicationScore:report.categoryBreakdown.communicationScore,roleAlignmentScore:report.categoryBreakdown.roleAlignmentScore,projectKnowledgeScore:report.categoryBreakdown.projectKnowledgeScore,behavioralScore:report.categoryBreakdown.behavioralScore,reportSnapshotJson:JSON.stringify(report),prepPlanJson:JSON.stringify(report.preparationPlan)}});
  if(updated.count!==1) throw new ApiError("Session changed. Refresh and retry ending it.",409);
  for(const day of report.preparationPlan) if(day.topicId) {
    const sourceJson=JSON.stringify({kind:"interview",sessionId:id,questionIndex:day.sourceQuestionIndex,reason:day.whyItMatters,targetRole:s.targetJobTitle});
    await tx.preparationTask.upsert({where:{userId_topicId:{userId,topicId:day.topicId}},create:{userId,topicId:day.topicId,targetJobId:s.jobId,status:"TODO",sourceJson},update:{sourceJson,targetJobId:s.jobId}});
  }
  });
  return report;
}
