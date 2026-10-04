import test from "node:test";
import assert from "node:assert/strict";
import {annualSalary,discoveryPipeline} from "../lib/jobs/discovery";
import {readApplicationSnapshot} from "../lib/jobs/snapshots";
import {setSavedJob,applyToJob} from "../lib/jobs/jobs-service";
import {jobPreparationDescription} from "../lib/jobs/context";
import {parseJobDescription} from "../lib/ats/parser/job-parser";
import {Prisma} from "@prisma/client";
import {checkEligibility,validateEligibility} from "../lib/jobs/eligibility";
import {defaultCareer} from "../lib/candidate/profile";
import {db} from "../lib/db";
import {stubMethod} from "./fixtures";
test("Discovery normalizes pay periods and leaves unknown periods incomparable",()=>{assert.equal(annualSalary(25000,"month"),300000);assert.equal(annualSalary(300000,"year"),300000);assert.equal(annualSalary(500,"hour"),null);});
test("Discovery escapes regex input, keeps availability constraints and validates pagination",()=>{const p=discoveryPipeline({query:"C++ (test)",sortBy:"relevance",salaryRange:"25k-50k"},["SQL"]);const json=JSON.stringify(p.pipeline);assert.match(json,/expiresAt/);assert.match(json,/VERIFIED/);assert.equal((p.pipeline[0] as any).$match.$and[1].$or[0].title.$regex,"C\\+\\+ \\(test\\)");assert.match(json,/annualMax/);assert.match(json,/relevance/);assert.throws(()=>discoveryPipeline({page:NaN}),/pagination/);});
test("Saved job DELETE is idempotent and never creates a record",async()=>{let deletes=0;const restore=stubMethod(db.savedJob,"deleteMany",async()=>{deletes++;return {count:0};});try{const id="111111111111111111111111";assert.deepEqual(await setSavedJob("owner",id,false),{isSaved:false});assert.deepEqual(await setSavedJob("owner",id,false),{isSaved:false});assert.equal(deletes,2);}finally{restore();}});
test("Submitted resume snapshot stays fixed and historical missing snapshots remain unavailable",()=>{const submitted={id:"r",title:"Original",templateId:"classic",contentJson:'{"summary":"Original"}',updatedAt:"2026-01-01"};const app={job:{title:"Current job"},resume:{title:"Edited"},resumeSnapshotJson:JSON.stringify(submitted),jobSnapshotJson:JSON.stringify({title:"Original job"})};const read=readApplicationSnapshot(app);assert.equal(read.resume?.title,"Original");assert.equal(read.job.title,"Original job");assert.equal(readApplicationSnapshot({...app,resumeSnapshotJson:null}).resume,null);});
test("Missing academic evidence is unknown, not an invented eligibility pass",()=>{const c=validateEligibility({graduationYears:[2027],minCgpa:6,maxBacklogs:0});assert.equal(checkEligibility(c,null,defaultCareer).status,"UNKNOWN");assert.equal(checkEligibility(c,{graduationYear:2027,course:"BTech"},{...defaultCareer,cgpa:7,activeBacklogs:0}).status,"MET");assert.equal(checkEligibility(c,{graduationYear:2026,course:"BTech"},{...defaultCareer,cgpa:7,activeBacklogs:0}).status,"NOT_MET");assert.throws(()=>validateEligibility({minCgpa:11}));});

test("Job preparation shares required and preferred qualifications without promoting preferred skills",()=>{
 const text=jobPreparationDescription({description:"Junior analyst",requirements:"SQL and Excel",preferredRequirements:"Python",skills:"SQL, Excel, Python"});
 const parsed=parseJobDescription(text);
 assert.ok(parsed.requiredSkills.includes("SQL"));
 assert.ok(parsed.preferredSkills.includes("Python"));
 assert.ok(!parsed.requiredSkills.includes("Python"));
 const inline=parseJobDescription("SQL required. Python preferred.");
 assert.ok(inline.requiredSkills.includes("SQL"));
 assert.ok(inline.preferredSkills.includes("Python"));
});

test("Apply refuses a resume changed after review and returns the winning concurrent submission",async()=>{
 const jobId="111111111111111111111111",resumeId="222222222222222222222222";
 const revision=new Date("2026-09-01T00:00:00Z");let lookups=0;
 const restores=[
  stubMethod(db.jobPosting,"findUnique",async()=>({id:jobId,status:"ACTIVE",verificationStatus:"VERIFIED",expiresAt:null,updatedAt:revision})),
  stubMethod(db.resume,"findFirst",async()=>({id:resumeId,updatedAt:revision})),
  stubMethod(db.jobApplication,"findUnique",async()=>++lookups===1?null:{id:"winning-application"}),
  stubMethod(db,"$transaction",async()=>{throw new Prisma.PrismaClientKnownRequestError("duplicate",{code:"P2002",clientVersion:"fixture"});}),
 ];
 try{
  await assert.rejects(()=>applyToJob("owner",jobId,resumeId,"",new Date("2026-08-01").toISOString()),/resume changed/);
  lookups=0;
  assert.equal((await applyToJob("owner",jobId,resumeId,"",revision.toISOString())).id,"winning-application");
 }finally{restores.reverse().forEach(r=>r());}
});
