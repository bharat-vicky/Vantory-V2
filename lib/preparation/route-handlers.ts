import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { requireCandidate } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { ApiError, apiError } from "@/lib/api-error";
import { TOPICS,publicTopic,gradeQuiz } from "./curriculum";
import { EXERCISES,executeAssessment } from "./execution";
import {executionConfiguration} from "./execution-config";
import { bestForKind } from "./plan";
import { quizForAttempt,quizSet } from "./quiz-variants";
import { checkRateLimit } from "@/lib/rate-limit";
import { defaultCareer,parseJson } from "@/lib/candidate/profile";
import {ROLE_PLANS,readPlan,validatePlan,roleProgress} from "./role-plans";

export function practiceInputHash(b:{topicId:string;action:string;quizSet?:string;answers?:unknown;code?:string}){return createHash("sha256").update(JSON.stringify({topicId:b.topicId,action:b.action,quizSet:b.action==="quiz"?b.quizSet:null,answers:b.action==="quiz"?b.answers:null,code:b.action==="execute"?b.code:null})).digest("hex");}

export async function GET(){try{
  const u=await requireCandidate();
  const [p,tasks,attempts]=await Promise.all([db.profile.findUnique({where:{userId:u.id}}),db.preparationTask.findMany({where:{userId:u.id}}),db.preparationAttempt.findMany({where:{userId:u.id},orderBy:{createdAt:"desc"},take:100})]);
  const career=parseJson(p?.careerJson,defaultCareer);
  const plan=readPlan(p?.preparationPlanJson,career.track);
  return NextResponse.json({success:true,draftScope:u.id,track:career.track,plan,roles:ROLE_PLANS,progress:roleProgress(plan,TOPICS,tasks),topics:TOPICS.map(t=>{const n=tasks.find(task=>task.topicId===t.id)?.quizAttempts || 0;return {...publicTopic({...t,quiz:quizForAttempt(t,n)}),quizSet:quizSet(n)};}),tasks:tasks.map(t=>({...t,evidence:parseJson(t.evidenceJson,null),source:parseJson(t.sourceJson,null)})),attempts:attempts.map(a=>({...a,result:parseJson(a.resultJson,null)})),exercises:EXERCISES,executionAvailable:executionConfiguration().available},{headers:{"Cache-Control":"private, no-store"}});
}catch(e){return apiError(e);}}

export async function PATCH(request:Request){try{
 const u=await requireCandidate();
 const raw=await request.text();if(raw.length>1000)throw new ApiError("Plan request is too large.",413);
 let plan;try{plan=validatePlan(JSON.parse(raw));}catch(e){throw new ApiError(e instanceof Error?e.message:"Invalid plan.");}
 if(!checkRateLimit(`preparation-plan:${u.id}`,30,15*60000).allowed)throw new ApiError("Too many plan changes. Try later.",429);
 await db.profile.upsert({where:{userId:u.id},create:{userId:u.id,preparationPlanJson:JSON.stringify(plan)},update:{preparationPlanJson:JSON.stringify(plan)}});
 return NextResponse.json({success:true,plan},{headers:{"Cache-Control":"private, no-store"}});
}catch(e){return apiError(e);}}

export async function POST(request:Request){try{
  const u=await requireCandidate();
  const raw=await request.text();if(raw.length>30000)throw new ApiError("Practice request is too large.",413);
  let b;try{b=JSON.parse(raw);}catch{throw new ApiError("Invalid practice request.");}
  const topic=TOPICS.find(t=>t.id===b?.topicId);if(!topic)throw new ApiError("Topic not found.",404);
  if(!["quiz","execute","start"].includes(b.action))throw new ApiError("Invalid practice action.");
  if(b.action==="start"){
    const task=await db.preparationTask.upsert({where:{userId_topicId:{userId:u.id,topicId:topic.id}},create:{userId:u.id,topicId:topic.id,status:"IN_PROGRESS"},update:{status:"IN_PROGRESS"}});
    return NextResponse.json({success:true,task});
  }
  if(typeof b.requestKey!=="string" || !/^[\w-]{16,80}$/.test(b.requestKey))throw new ApiError("A submission identifier is required.");
  const existing=await db.preparationAttempt.findUnique({where:{userId_requestKey:{userId:u.id,requestKey:b.requestKey}}});
  const inputHash=practiceInputHash(b);
  if(existing){if(existing.topicId!==topic.id || existing.kind!==b.action || existing.inputHash!==inputHash)throw new ApiError("Submission identifier was already used for different input.",409);return NextResponse.json({success:true,result:JSON.parse(existing.resultJson),replayed:true});}
  if(!checkRateLimit(`preparation:${u.id}`,20,15*60000).allowed)throw new ApiError("Practice limit reached. Try again later.",429);
  let result;
  const current=await db.preparationTask.findUnique({where:{userId_topicId:{userId:u.id,topicId:topic.id}}});
  if(b.action==="quiz"){
    if(b.quizSet!==quizSet(current?.quizAttempts || 0))throw new ApiError("This check changed after another submission. Reload the questions.",409);
    try{result=gradeQuiz({...topic,quiz:quizForAttempt(topic,current?.quizAttempts || 0)},b.answers);}catch(e){throw new ApiError(e instanceof Error?e.message:"Invalid answers.");}
  }
  else {if(!topic.exercise || typeof b.code!=="string")throw new ApiError("This topic has no code assessment.");result=await executeAssessment(topic.exercise,b.code);}
  const task=await db.$transaction(async tx=>{
    await tx.preparationAttempt.create({data:{userId:u.id,topicId:topic.id,kind:b.action,score:result.score,resultJson:JSON.stringify(result),requestKey:b.requestKey,inputHash}});
    const previous=await tx.preparationTask.findUnique({where:{userId_topicId:{userId:u.id,topicId:topic.id}}});
    if(b.action==="quiz" && (previous?.quizAttempts || 0)!==(current?.quizAttempts || 0))throw new ApiError("Another check was submitted. Reload before reassessing.",409);
    const bestQuizScore=b.action==="quiz"?bestForKind(previous?.bestQuizScore,result.score):previous?.bestQuizScore;
    const bestExecutionScore=b.action==="execute"?bestForKind(previous?.bestExecutionScore,result.score):previous?.bestExecutionScore;
    const data={status:result.score>=80?"ASSESSED":"IN_PROGRESS",bestQuizScore,bestExecutionScore,quizAttempts:(previous?.quizAttempts || 0)+(b.action==="quiz"?1:0),bestScore:null,evidenceJson:JSON.stringify({...result,at:new Date().toISOString(),kind:b.action})};
    return tx.preparationTask.upsert({where:{userId_topicId:{userId:u.id,topicId:topic.id}},create:{userId:u.id,topicId:topic.id,...data,attempts:1},update:{...data,attempts:{increment:1}}});
  });
  return NextResponse.json({success:true,result,task});
}catch(e){return apiError(e);}}
