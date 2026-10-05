import test from "node:test";
import {PATCH as updateProfile} from "../app/api/candidate/profile/route";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {assessBullet,normalizedBulletScore} from "../lib/resume/bullet-feedback";
import {changeAnchoredBullet} from "../lib/resume/coaching";
import {emptyResumeData,ResumeData} from "../lib/resume/types";
import {parseStructuredResume} from "../lib/ats/parser/resume-parser";
import {parseJobDescription} from "../lib/ats/parser/job-parser";
import {generateATSReportSnapshot} from "../lib/ats/scoring/scoring-engine";
import {selectPracticeQuestion,PRACTICE_QUESTIONS} from "../lib/interview/question-library";
import {buildInterviewContext} from "../lib/interview/context-builder";
import {FollowUpEngine} from "../lib/interview/follow-up-engine";
import {QuestionEvaluation} from "../lib/interview/types";
import {endSession} from "../lib/interview/session-service";
import {interviewPracticePlan,bestForKind} from "../lib/preparation/plan";
import {TOPICS,gradeQuiz} from "../lib/preparation/curriculum";
import {quizForAttempt,quizSet} from "../lib/preparation/quiz-variants";
import {validateCareerDraft,seedCareerDraft,careerDocumentChecks,roleEvidence} from "../lib/candidate/career-studio";
import {pitchChecks} from "../lib/candidate/pitch";
import {reviewAccess,authorizedReview} from "../lib/resume/reviews";
import {defaultCareer} from "../lib/candidate/profile";
import {signToken} from "../lib/auth/jwt";
import {getSession} from "../lib/auth/session";
import {getCurrentUser} from "../lib/auth/authorization";
import {cookies} from "next/headers";
import {db} from "../lib/db";
import {stubMethod} from "./fixtures";
import * as studioRoute from "../app/api/candidate/career-studio/route";
import * as coachingRoute from "../app/api/candidate/resume-coaching/route";
import * as pitchRoute from "../app/api/candidate/pitch/route";
import * as prepRoute from "../app/api/candidate/preparation/route";
import {practiceInputHash} from "../lib/preparation/route-handlers";
import * as reviewsRoute from "../app/api/candidate/resume-reviews/route";
import * as coachRoute from "../app/api/institute/resume-reviews/route";

const require=createRequire(import.meta.url);
const {RequestCookies}=require("next/dist/compiled/@edge-runtime/cookies");
const owner="111111111111111111111111",resumeId="222222222222222222222222",instituteId="333333333333333333333333",revision=new Date("2026-10-03T00:00:00Z");
const bullet="Built an API using Python and validated response codes with automated tests.";
const resume:ResumeData={...emptyResumeData,personalInfo:{...emptyResumeData.personalInfo,fullName:"Maya Rao",email:"maya@example.test"},skills:[{id:"skills",category:"Technical",skills:["Python","SQL"]}],education:[{id:"edu",degree:"BTech",institution:"College",location:"",startDate:"2023",endDate:"2027"}],projects:[{id:"project",title:"Orders API",description:"",techStack:["Python"],bullets:[bullet]}]};
const evaluation:QuestionEvaluation={assessmentVersion:"rubric.v2",technicalAccuracy:40,relevance:70,depth:40,completeness:40,evidenceScore:0,communication:70,overallScore:52,feedback:"Missing join semantics",strengths:[],missingElements:["Retaining unmatched customers"],improvementSuggestions:["Practise LEFT JOIN"],exampleAnswerStructure:"Explain unmatched rows",credibilityConcern:false,assessedDimensions:["technicalAccuracy","relevance","completeness"]};
function post(path:string,body:unknown){return new Request(`http://localhost${path}`,{method:"POST",body:JSON.stringify(body),headers:{"content-type":"application/json"}});}
async function authenticated<T>(role:string,run:()=>Promise<T>){
  const sessionId=crypto.randomUUID();const token=await signToken({userId:owner,role,email:"fixture@example.test",sessionId});
  const restores=[stubMethod(require("next/headers"),"cookies",async()=>new RequestCookies(new Headers({cookie:`vantory_session=${token}`}))),stubMethod(db.authSession,"findUnique",async()=>({userId:owner,revokedAt:null,expiresAt:new Date(Date.now()+60000)})),stubMethod(db.user,"findUnique",async()=>({id:owner,name:"Fixture",email:"fixture@example.test",role,isActive:true,emailVerifiedAt:revision,createdAt:revision,instituteId,profile:{careerJson:JSON.stringify({...defaultCareer,mentorConsent:true})}}))];
  try{assert.ok((await cookies()).get("vantory_session"),"fixture cookie available");assert.ok(await getSession(),"fixture session authenticated");assert.ok(await getCurrentUser(),"fixture user authenticated");return await run();}finally{restores.reverse().forEach(r=>r());}
}

test("Writing checks reject the negative counterexample and never claim an unobserved metric",()=>{
  assert.equal(assessBullet(bullet).verdict,"STRONG");
  const negative=assessBullet("Built nothing useful using Python with no working tests.");assert.equal(negative.verdict,"WEAK");assert.ok(negative.criteria.contradictory);assert.doesNotMatch(assessBullet("Built an API using Python for a class project.").suggestion,/measurable outcome/);assert.ok(assessBullet(bullet).suggestion.includes("do not verify"));
});
test("Repeated bullets do not inflate quality and fresher projects satisfy work evidence",()=>{
  const score=(r:ResumeData)=>generateATSReportSnapshot(parseStructuredResume(r),parseJobDescription("Required Python; no work experience required."));const a=score(resume),b=score({...resume,projects:[{...resume.projects[0],bullets:[bullet,bullet,bullet]}]});assert.equal(a.resumeQualityScore,b.resumeQualityScore);assert.equal(a.breakdown.resumeStructure,100);assert.equal(a.atsParseabilityAudit.layoutAssessed,false);assert.ok(a.unassessedDimensions?.includes("layoutGeometry"));assert.equal(normalizedBulletScore([assessBullet(bullet),assessBullet(bullet)]),assessBullet(bullet).score);
});
test("Role requirements and difficulty produce different questions without repeats",async()=>{
  const profile=await buildInterviewContext({targetJobTitle:"Frontend Developer",jobDescription:"Required React and TypeScript.",interviewType:"TECHNICAL",difficulty:"Easy",durationMinutes:10,interviewerStyle:"Professional"});
  const easy=selectPracticeQuestion(profile,"Easy",[])!,expert=selectPracticeQuestion(profile,"Expert",[])!;assert.match(easy.prompt,/React/);assert.notEqual(easy.prompt,expert.prompt);assert.equal(expert.difficulty,"Expert");assert.notEqual(selectPracticeQuestion(profile,"Easy",[easy.prompt])?.prompt,easy.prompt);assert.ok(PRACTICE_QUESTIONS.length>=48);
});
test("Concise complete answers and unassessed dimensions do not trigger follow-ups",()=>{
  assert.equal(FollowUpEngine.shouldTriggerFollowUp({candidateAnswerText:"O(1) average.",evaluation:{...evaluation,depth:100,completeness:100,technicalAccuracy:100,missingElements:[]},followUpCount:0}),false);
  assert.equal(FollowUpEngine.shouldTriggerFollowUp({candidateAnswerText:"A valid example",evaluation:{...evaluation,assessedDimensions:["relevance"]},followUpCount:0}),false);
  assert.equal(FollowUpEngine.shouldTriggerFollowUp({candidateAnswerText:"I don't know",evaluation,followUpCount:0}),true);
});
test("Interview omissions map to a real exercise with the source question",()=>{
  const plan=interviewPracticePlan([{id:"q",sessionId:"s",questionIndex:2,category:"Technical",questionText:PRACTICE_QUESTIONS.find(q=>q.id==="sql-easy")!.prompt,evaluation,candidateAnswerText:"SQL",isFollowUp:false}]);assert.equal(plan[0].topicId,"data-sql");assert.equal(plan[0].sourceQuestionIndex,2);assert.match(plan[0].practiceUrl!,/topicId=data-sql/);
});
test("Alternate knowledge checks are different and graded against their own keys",()=>{
  for(const topic of TOPICS){const other=quizForAttempt(topic,1);assert.notEqual(other[0].id,topic.quiz[0].id);assert.equal(gradeQuiz({...topic,quiz:other},other.map(q=>({id:q.id,choice:q.answer}))).score,100);assert.throws(()=>gradeQuiz({...topic,quiz:other},topic.quiz.map(q=>({id:q.id,choice:q.answer}))));}assert.equal(quizSet(2),"A");assert.equal(bestForKind(null,40),40);
});
test("Anchored changes reject stale text and cannot edit a different or missing bullet",()=>{
  const anchor={section:"projects" as const,itemId:"project",bulletIndex:0};const updated=changeAnchoredBullet(resume,anchor,bullet,`${bullet} I checked invalid input.`);assert.equal(resume.projects[0].bullets[0],bullet);assert.notEqual(updated.data.projects[0].bullets[0],bullet);assert.throws(()=>changeAnchoredBullet(resume,anchor,"stale",bullet),/changed/);assert.throws(()=>changeAnchoredBullet(resume,{...anchor,itemId:"foreign"},bullet,"Other text"),/changed/);
});
test("Career drafts reuse only selected facts and reject invented example references",()=>{
  const draft=validateCareerDraft({kind:"COVER_LETTER",targetRole:"Backend Developer",company:"Example",jobDescription:"Required Python and Docker.",motivation:"I enjoy building reliable APIs.",exampleIds:["project:project:0"]});const seeded=seedCareerDraft(resume,draft);assert.ok(seeded.body.includes(bullet));assert.doesNotMatch(seeded.body,/Docker|1000|production/);assert.throws(()=>seedCareerDraft(resume,{...draft,exampleIds:["foreign"]}),/changed/);const check=careerDocumentChecks(resume,{...seeded,body:seeded.body+" I use Docker."});assert.deepEqual(check.unsupportedClaims,["Docker"]);
});
test("Role evidence distinguishes resume claims, knowledge and executed practice",()=>{
  const roles=roleEvidence(resume,[{topicId:"software-arrays",kind:"quiz",score:100,createdAt:revision}]);const python=roles.find(r=>r.id==="backend")!.skills.find(s=>s.skill==="Python")!;assert.equal(python.practice,"KNOWLEDGE_CHECK");assert.equal(python.described,true);assert.equal(roles.find(r=>r.id==="analyst")!.skills.find(s=>s.skill==="Power BI")!.practice,"NOT_ASSESSED");
});
test("Pitch checks expose pattern limitations and reject invalid durations",()=>{
  const check=pitchChecks("I want a frontend role. I built a project and tested its form.","Frontend Developer",60);assert.equal(check.durationSeconds,60);assert.ok(check.note.includes("not scored"));assert.ok(check.checks.every(c=>c.present));assert.throws(()=>pitchChecks("text","role",0));assert.throws(()=>pitchChecks("text","role",Infinity));
});
test("Coach access is denied for revoked, expired, cross-institute or withdrawn consent",()=>{
  const review={instituteId,status:"OPEN",expiresAt:new Date(Date.now()+60000)},student={instituteId,profile:{careerJson:JSON.stringify({...defaultCareer,mentorConsent:true})}};assert.equal(reviewAccess(review,student,instituteId),true);assert.equal(reviewAccess({...review,status:"REVOKED"},student,instituteId),false);assert.equal(reviewAccess({...review,expiresAt:revision},student,instituteId,new Date("2026-10-04")),false);assert.equal(reviewAccess(review,student,"foreign"),false);assert.equal(reviewAccess(review,{...student,profile:{careerJson:JSON.stringify(defaultCareer)}},instituteId),false);
});
test("New candidate APIs reject unauthenticated requests before database operations",async()=>{
  for(const fn of [()=>studioRoute.GET(new Request("http://localhost/api/candidate/career-studio")),()=>coachingRoute.GET(new Request(`http://localhost/api/candidate/resume-coaching?resumeId=${resumeId}`)),()=>pitchRoute.GET(),()=>prepRoute.GET(),()=>reviewsRoute.GET(),()=>coachRoute.GET(new Request("http://localhost/api/institute/resume-reviews"))])assert.equal((await fn()).status,401);
});
test("Company users cannot use candidate documents or review APIs",async()=>{
  await authenticated("COMPANY_ADMIN",async()=>{assert.equal((await studioRoute.POST(post("/api/candidate/career-studio",{}))).status,403);assert.equal((await coachRoute.GET(new Request("http://localhost/api/institute/resume-reviews"))).status,403);});
});
test("Owned resume checks reject foreign career documents and stale source revisions",async()=>{
  const restore=stubMethod(db.resume,"findFirst",async({where}:any)=>where.id===resumeId?{id:resumeId,userId:owner,updatedAt:revision,contentJson:JSON.stringify(resume)}:null);
  try{await authenticated("CANDIDATE",async()=>{assert.equal((await studioRoute.POST(post("/api/candidate/career-studio",{action:"seed",resumeId:"444444444444444444444444"}))).status,404);assert.equal((await studioRoute.POST(post("/api/candidate/career-studio",{action:"seed",resumeId,resumeRevision:new Date("2026-01-01").toISOString()}))).status,409);});}finally{restore();}
});
test("Career document save requires confirmation and uses owner plus revision on update",async()=>{
  let writes=0;const restores=[stubMethod(db.resume,"findFirst",async()=>({id:resumeId,updatedAt:revision,contentJson:JSON.stringify(resume)})),stubMethod(db.careerDocument,"updateMany",async({where}:any)=>{writes++;assert.equal(where.userId,owner);assert.ok(where.updatedAt instanceof Date);return {count:0};})];
  try{await authenticated("CANDIDATE",async()=>{const base={action:"save",resumeId,resumeRevision:revision.toISOString(),draft:{kind:"LINKEDIN",targetRole:"Backend Developer",body:"My own project",exampleIds:[]}};assert.equal((await studioRoute.POST(post("/api/candidate/career-studio",base))).status,400);assert.equal((await studioRoute.POST(post("/api/candidate/career-studio",{...base,confirmFacts:true,documentId:"444444444444444444444444",expectedUpdatedAt:revision.toISOString()}))).status,409);assert.equal(writes,1);});}finally{restores.reverse().forEach(r=>r());}
});
test("Preparation retries return a recorded result without rerunning the execution",async()=>{
  const restore=stubMethod(db.preparationAttempt,"findUnique",async()=>({topicId:"software-arrays",kind:"execute",inputHash:practiceInputHash({topicId:"software-arrays",action:"execute"}),resultJson:JSON.stringify({score:25})}));
  try{await authenticated("CANDIDATE",async()=>{const response=await prepRoute.POST(post("/api/candidate/preparation",{topicId:"software-arrays",action:"execute",requestKey:"fixture-retry-000000"}));assert.equal(response.status,200);assert.equal((await response.json()).replayed,true);});}finally{restore();}
});
test("Quiz submission persists an immutable attempt and never promotes quiz score to execution",async()=>{
  let saved:any;const topic=TOPICS[0];const restores=[stubMethod(db.preparationAttempt,"findUnique",async()=>null),stubMethod(db.preparationTask,"findUnique",async()=>({quizAttempts:0,bestQuizScore:50,bestExecutionScore:20})),stubMethod(db,"$transaction",async(fn:any)=>fn({preparationAttempt:{create:async({data}:any)=>{assert.equal(data.kind,"quiz");assert.equal(data.userId,owner);return data;}},preparationTask:{findUnique:async()=>({quizAttempts:0,bestQuizScore:50,bestExecutionScore:20}),upsert:async({update}:any)=>{saved=update;return update;}}}))];
  try{await authenticated("CANDIDATE",async()=>{const response=await prepRoute.POST(post("/api/candidate/preparation",{action:"quiz",topicId:topic.id,quizSet:"A",requestKey:"fixture-quiz-000000",answers:topic.quiz.map(q=>({id:q.id,choice:q.answer}))}));assert.equal(response.status,200);assert.equal(saved.bestQuizScore,100);assert.equal(saved.bestExecutionScore,20);assert.equal(saved.bestScore,null);assert.equal(saved.quizAttempts,1);});}finally{restores.reverse().forEach(r=>r());}
});
test("AI career feedback rejects invented quote anchors and preserves the draft on outage",async()=>{
  const restore=stubMethod(db.resume,"findFirst",async()=>({id:resumeId,updatedAt:revision,contentJson:JSON.stringify(resume)}));const original=globalThis.fetch;
  try{await authenticated("CANDIDATE",async()=>{const body={action:"review",resumeId,resumeRevision:revision.toISOString(),draft:{kind:"LINKEDIN",targetRole:"Backend Developer",body:"I built a coursework API.",exampleIds:[]}};assert.equal((await studioRoute.POST(post("/api/candidate/career-studio",body))).status,503);process.env.GEMINI_API_KEY="fixture";globalThis.fetch=async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({findings:[{quote:"I managed 100 people",issue:"Unsupported",action:"Clarify"}]})}]},finishReason:"STOP"}]}));assert.equal((await studioRoute.POST(post("/api/candidate/career-studio",body))).status,503);});}finally{restore();globalThis.fetch=original;process.env.GEMINI_API_KEY="";}
});
test("Revoking a review is owner-scoped and comments cannot resolve across requests",async()=>{
  const restores=[stubMethod(db.resumeReviewRequest,"updateMany",async({where}:any)=>{assert.equal(where.userId,owner);return {count:0};}),stubMethod(db.resumeReviewRequest,"findFirst",async()=>null)];
  try{await authenticated("CANDIDATE",async()=>{assert.equal((await reviewsRoute.POST(post("/api/candidate/resume-reviews",{action:"revoke",id:resumeId}))).status,404);assert.equal((await reviewsRoute.POST(post("/api/candidate/resume-reviews",{action:"resolve",id:resumeId,commentId:instituteId}))).status,404);});}finally{restores.reverse().forEach(r=>r());}
});

test("A retry key cannot be reused to score changed execution input",async()=>{
  const body={topicId:"software-arrays",action:"execute",requestKey:"changed-input-000000",code:"original"};const restore=stubMethod(db.preparationAttempt,"findUnique",async()=>({topicId:body.topicId,kind:body.action,inputHash:practiceInputHash(body),resultJson:"{\"score\":100}"}));
  try{await authenticated("CANDIDATE",async()=>{assert.equal((await prepRoute.POST(post("/api/candidate/preparation",{...body,code:"different"}))).status,409);});}finally{restore();}
});
test("Guided resume edits write their audit in the same transaction and enforce revision conflicts",async()=>{
  let count=0,audit:any,updatedContent="";const afterText="Built an orders API using Python and tested invalid input with automated tests.";
  const restores=[stubMethod(db.resume,"findFirst",async()=>({id:resumeId,userId:owner,updatedAt:revision,contentJson:JSON.stringify(resume)})),stubMethod(db,"$transaction",async(fn:any)=>fn({resume:{updateMany:async({where,data}:any)=>{assert.equal(where.userId,owner);updatedContent=data.contentJson;return {count};},findUniqueOrThrow:async()=>({id:resumeId,updatedAt:new Date(revision.getTime()+1),contentJson:updatedContent})},resumeFeedbackChange:{create:async({data}:any)=>{audit=data;return data;}}}))];
  try{await authenticated("CANDIDATE",async()=>{const body={resumeId,expectedUpdatedAt:revision.toISOString(),anchor:{section:"projects",itemId:"project",bulletIndex:0},beforeText:bullet,afterText,confirmFacts:true};assert.equal((await coachingRoute.POST(post("/api/candidate/resume-coaching",body))).status,409);assert.equal(Boolean(audit),false);count=1;assert.equal((await coachingRoute.POST(post("/api/candidate/resume-coaching",body))).status,200);assert.equal(audit.beforeText,bullet);assert.equal(audit.afterText,afterText);assert.equal(audit.userId,owner);assert.equal(JSON.parse(updatedContent).projects[0].bullets[0],afterText);});}finally{restores.reverse().forEach(r=>r());}
});
test("Ending a session atomically saves its report and exercise-linked gap tasks",async()=>{
  const profile=await buildInterviewContext({targetJobTitle:"Data Analyst",jobDescription:"Required SQL",interviewType:"TECHNICAL",difficulty:"Easy",durationMinutes:10,interviewerStyle:"Professional"});let saved=false,task:any;const id="555555555555555555555555";
  const session={id,userId:owner,jobId:null,targetJobTitle:"Data Analyst",interviewType:"TECHNICAL",difficulty:"Easy",status:"ACTIVE",updatedAt:revision,answerLock:null,sessionStateJson:JSON.stringify({state:{sessionId:id},profile}),questions:[{id:"q",sessionId:id,questionIndex:1,category:"Technical Fundamentals",questionText:PRACTICE_QUESTIONS.find(q=>q.id==="sql-easy")!.prompt,candidateAnswerText:"JOIN drops missing customers",evaluationJson:JSON.stringify(evaluation),isFollowUp:false}]};
  const restores=[stubMethod(db.interviewSession,"findFirst",async()=>session),stubMethod(db.interviewSession,"findMany",async()=>[]),stubMethod(db,"$transaction",async(fn:any)=>fn({interviewSession:{updateMany:async()=>{saved=true;return {count:1};}},preparationTask:{upsert:async({create}:any)=>{assert.equal(saved,true);task=create;return create;}}}))];
  try{const report=await endSession(owner,id);assert.equal(report.preparationPlan[0].topicId,"data-sql");assert.equal(task.userId,owner);assert.equal(JSON.parse(task.sourceJson).sessionId,id);}finally{restores.reverse().forEach(r=>r());}
});
test("Institute review lookup rechecks the candidate's current sharing consent",async()=>{
  const restores=[stubMethod(db.user,"findUnique",async({where}:any)=>({instituteId,profile:{careerJson:JSON.stringify({...defaultCareer,mentorConsent:where.id===owner})}})),stubMethod(db.resumeReviewRequest,"findUnique",async()=>({id:resumeId,userId:"444444444444444444444444",instituteId,status:"OPEN",expiresAt:new Date(Date.now()+60000),comments:[]}))];
  try{await assert.rejects(()=>authorizedReview(resumeId,owner),/unavailable/);}finally{restores.reverse().forEach(r=>r());}
});

test("Incomplete profiles save nullable fields and preserve explicit sharing off",async()=>{
 let saved:any;
 const restores=[stubMethod(db.profile,"findUnique",async()=>({bio:null,phone:null,careerJson:JSON.stringify(defaultCareer)})),stubMethod(db.profile,"upsert",async({update}:any)=>{saved=update;return update;})];
 try{await authenticated("CANDIDATE",async()=>{
   const request=new Request("http://localhost/api/candidate/profile",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({profile:{bio:null,phone:null,githubUrl:null,graduationYear:null},career:defaultCareer})});
   assert.equal((await updateProfile(request)).status,200);assert.equal(saved.bio,null);assert.equal(JSON.parse(saved.careerJson).mentorConsent,false);assert.equal(JSON.parse(saved.careerJson).instituteAnalyticsConsent,false);
   const invalid=new Request("http://localhost/api/candidate/profile",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({profile:{bio:42}})});
   assert.equal((await updateProfile(invalid)).status,400);
 });}finally{restores.reverse().forEach(r=>r());}
});
