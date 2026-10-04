/** Opt-in localhost integration checks. Creates and removes its own private QA fixtures. */
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {loadEnvConfig} from "@next/env";

async function main(){
  if(process.env.VANTORY_RUN_SMOKE!=="1")throw new Error("Set VANTORY_RUN_SMOKE=1 to run localhost fixture checks.");
  const base=process.env.VANTORY_SMOKE_URL || "http://localhost:3000";
  if(!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base))throw new Error("Smoke checks accept a localhost URL only.");
  loadEnvConfig(process.cwd(),true);
  const {PrismaClient}=await import("@prisma/client");const db=new PrismaClient();
  const {signToken}=await import("../lib/auth/jwt");
  const {emptyResumeData}=await import("../lib/resume/types");
  const prefix=`Vantory QA ${randomUUID()}`;
  const users:string[]=[];let instituteId:string|undefined,checks=0;
  async function request(path:string,cookie?:string,body?:unknown,expected=200){
    const response=await fetch(base+path,{method:body===undefined?"GET":"POST",headers:{...(cookie?{cookie}:{}),...(body!==undefined?{"content-type":"application/json"}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
    assert.equal(response.status,expected,`${path}: expected ${expected}, got ${response.status}`);checks++;
    return response.headers.get("content-type")?.includes("application/json")?response.json():{html:await response.text()};
  }
  try{
    const institute=await db.institute.create({data:{name:prefix,verificationStatus:"VERIFIED",isOnboarded:true}});instituteId=institute.id;
    const cookies:Record<string,string>={};
    for(const role of ["CANDIDATE","INSTITUTE_ADMIN","COMPANY_ADMIN"]){
      const user=await db.user.create({data:{name:`${prefix} ${role}`,email:`${randomUUID()}@example.invalid`,role,instituteId:role==="COMPANY_ADMIN"?null:instituteId,emailVerifiedAt:new Date()}});users.push(user.id);
      await db.profile.create({data:{userId:user.id,careerJson:JSON.stringify({track:"SOFTWARE",targetRoles:[],mentorConsent:role==="CANDIDATE",instituteAnalyticsConsent:false})}});
      const sessionId=randomUUID();await db.authSession.create({data:{userId:user.id,sessionId,expiresAt:new Date(Date.now()+30*60000)}});
      cookies[role]=`vantory_session=${await signToken({userId:user.id,role,email:user.email,sessionId})}`;
    }
    const candidate=cookies.CANDIDATE,coach=cookies.INSTITUTE_ADMIN,company=cookies.COMPANY_ADMIN;
    for(const path of ["/api/candidate/career-studio","/api/candidate/preparation","/api/candidate/pitch","/api/candidate/resume-reviews","/api/institute/resume-reviews"])await request(path,undefined,undefined,401);
    await request("/api/candidate/career-studio",company,undefined,403);await request("/api/institute/resume-reviews",candidate,undefined,403);
    for(const path of ["/career-studio","/preparation","/resume","/institute/resume-reviews"])await request(path,path.startsWith("/institute")?coach:candidate);
    const created=await request("/api/resumes",candidate,{action:"create"});
    const original="Built a Python orders API using FastAPI and validated responses with automated tests.";
    const content={...emptyResumeData,title:prefix,personalInfo:{...emptyResumeData.personalInfo,fullName:"QA Candidate",email:"qa@example.invalid"},skills:[{id:"skills",category:"Technical",skills:["Python","SQL"]}],projects:[{id:"project",title:"Orders API",description:"Coursework",techStack:["Python"],bullets:[original]}]};
    const saved=await request("/api/resumes",candidate,{resumeId:created.resume.id,expectedUpdatedAt:created.resume.updatedAt,content});const resumeId=saved.resume.id;
    const revised=await request("/api/candidate/resume-coaching",candidate,{resumeId,expectedUpdatedAt:saved.resume.updatedAt,anchor:{section:"projects",itemId:"project",bulletIndex:0},beforeText:original,afterText:original+" I checked invalid inputs.",confirmFacts:true});
    await request("/api/candidate/resume-coaching",candidate,{resumeId,expectedUpdatedAt:saved.resume.updatedAt,anchor:{section:"projects",itemId:"project",bulletIndex:0},beforeText:original,afterText:"Built another API using Python and tested it.",confirmFacts:true},409);
    const history=await request(`/api/candidate/resume-coaching?resumeId=${resumeId}`,candidate);assert.equal(history.changes.length,1);
    const studio=await request(`/api/candidate/career-studio?resumeId=${resumeId}`,candidate);assert.equal(studio.roles.length,4);
    const draft={kind:"COVER_LETTER",targetRole:"Backend Developer",company:"QA Company",jobDescription:"Required Python and SQL.",motivation:"I enjoy reliable APIs.",exampleIds:["project:project:0"]};
    const seeded=await request("/api/candidate/career-studio",candidate,{action:"seed",resumeId,resumeRevision:revised.resume.updatedAt,draft});assert.ok(seeded.draft.body.includes(original));
    const document=await request("/api/candidate/career-studio",candidate,{action:"save",resumeId,resumeRevision:revised.resume.updatedAt,draft:seeded.draft,confirmFacts:true});
    await request("/api/candidate/career-studio",candidate,{action:"save",resumeId,resumeRevision:revised.resume.updatedAt,draft:seeded.draft,confirmFacts:true,documentId:document.document.id,expectedUpdatedAt:saved.resume.updatedAt},409);
    const prep=await request("/api/candidate/preparation",candidate);const topic=prep.topics.find((t:{id:string})=>t.id==="software-frontend");
    const quiz={topicId:topic.id,action:"quiz",requestKey:randomUUID(),quizSet:topic.quizSet,answers:topic.quiz.map((q:{id:string})=>({id:q.id,choice:0}))};
    await request("/api/candidate/preparation",candidate,quiz);const replay=await request("/api/candidate/preparation",candidate,quiz);assert.equal(replay.replayed,true);
    const next=await request("/api/candidate/preparation",candidate);assert.equal(next.attempts.length,1);assert.equal(next.topics.find((t:{id:string})=>t.id===topic.id).quizSet,"B");
    const pitch={targetRole:"Backend Developer",transcript:"I want a backend developer role. I built a project and tested its API.",durationSeconds:60,requestKey:randomUUID()};await request("/api/candidate/pitch",candidate,pitch);await request("/api/candidate/pitch",candidate,pitch);assert.equal((await request("/api/candidate/pitch",candidate)).attempts.length,1);
    const review=await request("/api/candidate/resume-reviews",candidate,{action:"request",resumeId});
    const queue=await request("/api/institute/resume-reviews",coach);assert.equal(queue.requests.length,1);
    await request(`/api/institute/resume-reviews?id=${review.review.id}`,coach);
    await request("/api/institute/resume-reviews",coach,{id:review.review.id,text:"Explain which invalid input cases you checked.",anchor:{section:"projects",itemId:"project",bulletIndex:0}});
    const candidateReviews=await request("/api/candidate/resume-reviews",candidate);const comment=candidateReviews.requests[0].comments[0];assert.ok(comment);
    await request("/api/candidate/resume-reviews",candidate,{action:"resolve",id:review.review.id,commentId:comment.id});
    await request("/api/candidate/resume-reviews",candidate,{action:"revoke",id:review.review.id});
    await request(`/api/institute/resume-reviews?id=${review.review.id}`,coach,undefined,404);
    assert.equal((await request("/api/institute/resume-reviews",coach)).requests.length,0);
    console.log(`Passed ${checks} localhost HTTP checks, including document revisions, quiz retries, pitch history and coach revocation.`);
  }finally{
    if(users.length){
      const where={userId:{in:users}};
      // Only IDs created by this run are eligible for cleanup. No existing user records are targeted.
      const reviews=await db.resumeReviewRequest.findMany({where,select:{id:true}});
      if(reviews.length)await db.resumeReviewComment.deleteMany({where:{requestId:{in:reviews.map(r=>r.id)}}});
      await db.resumeReviewRequest.deleteMany({where});await db.resumeFeedbackChange.deleteMany({where});await db.careerDocument.deleteMany({where});await db.pitchAttempt.deleteMany({where});await db.preparationAttempt.deleteMany({where});await db.preparationTask.deleteMany({where});await db.resume.deleteMany({where});await db.profile.deleteMany({where});await db.authSession.deleteMany({where});await db.user.deleteMany({where:{id:{in:users}}});
    }
    if(instituteId)await db.institute.delete({where:{id:instituteId}});
    await db.$disconnect();console.log("Private QA fixtures removed.");
  }
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Smoke check failed.");process.exitCode=1;});
