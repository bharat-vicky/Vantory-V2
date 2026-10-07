import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {ROLE_PLANS,readPlan,validatePlan,roleProgress} from "../lib/preparation/role-plans";
import {TOPICS,publicTopic,gradeQuiz} from "../lib/preparation/curriculum";
import {quizForAttempt} from "../lib/preparation/quiz-variants";
import {EXERCISES,executionCases} from "../lib/preparation/exercise-bank";
import {executeAssessment} from "../lib/preparation/execution";
import * as route from "../app/api/candidate/preparation/route";
import {db} from "../lib/db";
import {stubMethod} from "./fixtures";
import {signToken} from "../lib/auth/jwt";

const require=createRequire(import.meta.url);
const {RequestCookies}=require("next/dist/compiled/@edge-runtime/cookies");
const userId="111111111111111111111111";
async function authenticated(role:string,run:()=>Promise<void>){
 const token=await signToken({userId,role,email:"fixture@example.test",sessionId:crypto.randomUUID()});
 const restores=[stubMethod(require("next/headers"),"cookies",async()=>new RequestCookies(new Headers({cookie:"vantory_session="+token}))),stubMethod(db.authSession,"findUnique",async()=>({userId,revokedAt:null,expiresAt:new Date(Date.now()+60000)})),stubMethod(db.user,"findUnique",async()=>({id:userId,role,isActive:true,emailVerifiedAt:new Date(),createdAt:new Date()}))];
 try{await run();}finally{restores.reverse().forEach(r=>r());}
}
const patch=(body:unknown)=>new Request("http://localhost/api/candidate/preparation",{method:"PATCH",body:JSON.stringify(body)});

test("Role plans have valid unique topics and flexible ordered days",()=>{
 for(const role of ROLE_PLANS){
  const p=roleProgress({roleId:role.id,durationDays:14},TOPICS,[]);
  assert.equal(new Set(role.topicIds).size,role.topicIds.length);
  assert.equal(p.steps[0].day,1);assert.equal(p.steps.at(-1)?.day,14);
  assert.equal(p.knowledge,0);assert.equal(p.execution,0);assert.equal(p.nextTopicId,role.topicIds[0]);
  assert.ok(p.steps.every((s,i)=>i===0 || s.day>p.steps[i-1].day));
 }
 assert.deepEqual(readPlan(null,"DATA"),{roleId:"analyst",durationDays:28});
 assert.deepEqual(readPlan("broken","SOFTWARE"),{roleId:"backend",durationDays:28});
 for(const value of [null,[],{}, {roleId:"unknown",durationDays:14},{roleId:"backend",durationDays:"14"},{roleId:"backend",durationDays:0}])assert.throws(()=>validatePlan(value));
});
test("A knowledge pass or partial code score alone cannot complete a coding topic",()=>{
 const config={roleId:"backend",durationDays:28 as const};
 let p=roleProgress(config,TOPICS,[{topicId:"python-frequency",bestQuizScore:100,bestExecutionScore:75}]);
 assert.equal(p.knowledge,1);assert.equal(p.execution,0);assert.equal(p.checked,0);
 p=roleProgress(config,TOPICS,[{topicId:"python-frequency",bestQuizScore:100,bestExecutionScore:100}]);
 assert.equal(p.checked,1);
 const all=ROLE_PLANS[1].topicIds.map(topicId=>({topicId,bestQuizScore:100,bestExecutionScore:100}));
 assert.equal(roleProgress(config,TOPICS,all).nextTopicId,null);
 assert.equal(roleProgress(config,TOPICS,[{topicId:"data-dashboard",bestQuizScore:100}]).checked,0);
});
test("All eight exercises have real boundary cases and both quiz sets keep keys private",()=>{
 assert.equal(Object.keys(EXERCISES).length,8);
 for(const [id,definition] of Object.entries(EXERCISES)){
  const topic=TOPICS.find(t=>t.exercise===id)!;assert.ok(topic);
  assert.ok(executionCases(id as keyof typeof EXERCISES).length>=2);
  assert.ok(definition.starter);assert.ok(definition.statement);
  for(const n of [0,1]){
   const quiz=quizForAttempt(topic,n);
   assert.equal(gradeQuiz({...topic,quiz},quiz.map(q=>({id:q.id,choice:q.answer}))).score,100);
   assert.ok(publicTopic({...topic,quiz}).quiz.every(q=>!("answer" in q) && !("explanation" in q)));
  }
 }
});
test("New Python and SQL exercises use the correct isolated runtime and real output checks",async()=>{
 const originalFetch=globalThis.fetch,oldUrl=process.env.JUDGE0_URL,oldToken=process.env.JUDGE0_TOKEN;
 process.env.JUDGE0_URL="https://runner.example";process.env.JUDGE0_TOKEN="fixture";
 try{
  for(const exercise of ["frequency","brackets","intervals","sql-paid","sql-ranking","sql-monthly"] as const){
   let index=0;const cases=executionCases(exercise);
   globalThis.fetch=async(_url,options)=>{
    const body=JSON.parse(String(options?.body));
    assert.equal(body.language_id,EXERCISES[exercise].language==="python"?71:82);
    assert.equal(body.enable_network,false);assert.equal(body.cpu_time_limit,2);assert.ok(body.max_processes_and_or_threads<=8);
    if(EXERCISES[exercise].language==="sql")assert.match(body.source_code,/CREATE TABLE/);
    return new Response(JSON.stringify({status:{id:3},stdout:cases[index++].expected}));
   };
   const result=await executeAssessment(exercise,EXERCISES[exercise].language==="python"?"print('fixture')":"SELECT 1;");
   assert.equal(result.score,100);assert.equal(index,cases.length);
   globalThis.fetch=async()=>new Response(JSON.stringify({status:{id:3},stdout:"incorrect"}));
   assert.equal((await executeAssessment(exercise,EXERCISES[exercise].language==="python"?"print('fixture')":"SELECT 1;")).score,0);
  }
  for(const exercise of ["sql-paid","sql-ranking","sql-monthly"] as const)await assert.rejects(()=>executeAssessment(exercise,"DROP TABLE customers"),/SELECT/);
 }finally{globalThis.fetch=originalFetch;process.env.JUDGE0_URL=oldUrl;process.env.JUDGE0_TOKEN=oldToken;}
});
test("Plan API rejects missing authentication, other roles and invalid requests before writes",async()=>{
 assert.equal((await route.PATCH(patch({roleId:"backend",durationDays:14}))).status,401);
 await authenticated("COMPANY_ADMIN",async()=>assert.equal((await route.PATCH(patch({roleId:"backend",durationDays:14}))).status,403));
 await authenticated("CANDIDATE",async()=>{
  assert.equal((await route.PATCH(patch({roleId:"bad",durationDays:14}))).status,400);
  assert.equal((await route.PATCH(new Request("http://localhost/api/candidate/preparation",{method:"PATCH",body:"x".repeat(1001)}))).status,413);
 });
});
test("Saving a plan touches only the authenticated user's plan field, preserving profile and scores",async()=>{
 const restore=stubMethod(db.profile,"upsert",async(args:any)=>{
  assert.deepEqual(args.where,{userId});
  assert.deepEqual(Object.keys(args.update),["preparationPlanJson"]);
  assert.deepEqual(JSON.parse(args.update.preparationPlanJson),{roleId:"analyst",durationDays:14});
  assert.equal(args.create.userId,userId);
 });
 try{await authenticated("CANDIDATE",async()=>{const r=await route.PATCH(patch({roleId:"analyst",durationDays:14,userId:"foreign",careerJson:"overwrite"}));assert.equal(r.status,200);assert.equal(r.headers.get("Cache-Control"),"private, no-store");});}finally{restore();}
});
test("Preparation GET reads only owned practice, returns saved plan and excludes answer keys and hidden cases",async()=>{
 const restores=[stubMethod(db.profile,"findUnique",async({where}:any)=>{assert.equal(where.userId,userId);return {careerJson:'{"track":"DATA"}',preparationPlanJson:'{"roleId":"data-engineer","durationDays":14}'};}),stubMethod(db.preparationTask,"findMany",async({where}:any)=>{assert.equal(where.userId,userId);return [{topicId:"sql-ranking",bestQuizScore:100,bestExecutionScore:100,quizAttempts:1,evidenceJson:"bad",sourceJson:null}];}),stubMethod(db.preparationAttempt,"findMany",async({where,take}:any)=>{assert.equal(where.userId,userId);assert.equal(take,100);return [];} )];
 try{await authenticated("CANDIDATE",async()=>{
  const r=await route.GET();assert.equal(r.status,200);assert.equal(r.headers.get("Cache-Control"),"private, no-store");
  const j=await r.json();assert.equal(j.draftScope,userId);assert.equal(j.plan.roleId,"data-engineer");assert.equal(j.progress.checked,1);
  assert.equal(j.topics.length,18);assert.ok(j.topics.every((t:any)=>t.quiz.every((q:any)=>!("answer" in q))));
  assert.ok(Object.values(j.exercises).every((e:any)=>!("expected" in e) && !("setup" in e)));
 });}finally{restores.reverse().forEach(r=>r());}
});
