import test from "node:test";
import assert from "node:assert/strict";
import type {JobPosting} from "@prisma/client";
import {jobFields,createCompanyJob,cloneCompanyJob,updateCompanyJob,ownedJob} from "../lib/company/job-postings";
import {activeJobWhere,jobAvailable,jobDisplayStatus} from "../lib/jobs/availability";
import {getSavedApplicantFilters,changeSavedApplicantFilters,validateSavedFilters} from "../lib/company/saved-filters";
import {analyticsFilters,summarizeHiring,getHiringAnalytics} from "../lib/company/hiring-analytics";
import {getJobById} from "../lib/jobs/jobs-service";
import {db} from "../lib/db";
import {stubMethod} from "./fixtures";
const owner="111111111111111111111111",id="222222222222222222222222",foreign="333333333333333333333333",now=new Date("2026-10-07T00:00:00.000Z");
const source={id,companyUserId:owner,title:"Engineer",status:"ACTIVE",description:"Synthetic description",requirements:"Synthetic requirements",updatedAt:now,expiresAt:new Date("2030-01-01T00:00:00.000Z"),verificationStatus:"VERIFIED",company:"Source company",workMode:"Remote",type:"Full-time",salaryPeriod:"year",eligibilityJson:'{"minCgpa":6}'} as JobPosting;
const filters={search:" QA ",jobId:"ALL",status:"WITHDRAWN",from:"2026-10-06",to:"2026-10-07",sort:"UPDATED" as const};
const company={id:owner,role:"COMPANY_ADMIN",companyProfile:{id:foreign,companyName:"Owned company",verificationStatus:"VERIFIED",savedApplicantFiltersJson:null}};
async function fixture(run:()=>Promise<void>,stubs:Array<[object,string,unknown]>) {const restores=stubs.map(([target,key,value])=>stubMethod(target,key,value));try{await run();}finally{restores.reverse().forEach(r=>r());}}
test("Draft content and publishing requirements",()=>{
 assert.equal(jobFields({title:"Draft",status:"DRAFT"},undefined,now).description,"");
 for(const body of [{title:""},{title:"Draft"},{title:"Draft",status:"WRONG"},{title:"Draft",status:"CLOSED"},{...source,expiresAt:now.toISOString()},{...source,expiresAt:"2026-02-30T00:00:00.000Z"}])assert.throws(()=>jobFields(body,undefined,now));
 assert.equal(jobFields({...source,expiresAt:null},undefined,now).expiresAt,null);
 assert.throws(()=>jobFields({status:"DRAFT"},source,now));
 assert.throws(()=>jobFields({status:"ACTIVE"},{...source,status:"DRAFT",expiresAt:now},now));
});
test("Job fields enforce ranges, URLs, eligibility and ownership whitelist",()=>{
 for(const changes of [{experienceMin:4,experienceMax:2},{salaryMin:5,salaryMax:3},{salaryMin:-1},{experienceMax:2.5},{companyUrl:"javascript:alert(1)"},{companyUrl:"https://user:pass@example.com"},{eligibility:{minCgpa:12}}])assert.throws(()=>jobFields(changes,source,now));
 const result=jobFields({companyUserId:foreign,company:"Fake",status:"CLOSED"},source,now);
 assert.ok(!("companyUserId" in result));assert.ok(!("company" in result));assert.equal(result.eligibilityJson,source.eligibilityJson);
 assert.equal(jobFields({eligibility:null},source,now).eligibilityJson,null);
});
test("Deadline equality is expired and drafts and unverified jobs never become available",()=>{
 assert.equal(jobDisplayStatus({...source,expiresAt:now},now),"EXPIRED");assert.equal(jobAvailable({...source,expiresAt:now},now),false);
 assert.equal(jobAvailable({...source,expiresAt:new Date(now.getTime()+1)},now),true);
 for(const status of ["DRAFT","CLOSED","PAUSED"])assert.equal(jobDisplayStatus({...source,status,expiresAt:now},now),status);
 assert.equal(jobAvailable({...source,verificationStatus:"PENDING"},now),false);
 assert.deepEqual(activeJobWhere(now).OR,[{expiresAt:null},{expiresAt:{isSet:false}},{expiresAt:{gt:now}}]);
});
test("Draft public details remain hidden even with a known id",async()=>{await fixture(async()=>assert.equal(await getJobById(id),null),[[db.jobPosting,"findUnique",async()=>({...source,status:"DRAFT"})]]);});
test("Create and clone bind company identity, reset expiry and never copy applicants or identifiers",async()=>{
 const creates:any[]=[],audits:any[]=[];
 await fixture(async()=>{
  await createCompanyJob(owner,{title:"Draft",status:"DRAFT",companyUserId:foreign});await cloneCompanyJob(owner,id);
  assert.equal(creates[0].companyUserId,owner);assert.equal(creates[0].company,"Owned company");assert.equal(creates[1].status,"DRAFT");assert.equal(creates[1].expiresAt,null);assert.equal(creates[1].title,"Engineer (copy)");assert.equal(creates[1].eligibilityJson,source.eligibilityJson);
  for(const row of creates){assert.ok(!("id" in row));assert.ok(!("applications" in row));assert.ok(!("postedAt" in row));}assert.equal(audits.length,2);
 },[[db.user,"findUnique",async()=>company],[db.jobPosting,"findUnique",async()=>source],[db,"$transaction",async(fn:any)=>fn({jobPosting:{create:async({data}:any)=>{creates.push(data);return {...data,id:foreign};}},activityLog:{create:async({data}:any)=>audits.push(data)}})]]);
});
test("Update checks owner and version atomically, preserving published date on ordinary saves",async()=>{
 let query:any;
 await fixture(async()=>{
  await assert.rejects(ownedJob(foreign,id),/not found/);await assert.rejects(updateCompanyJob(owner,id,{status:"CLOSED",expectedUpdatedAt:"2020-01-01T00:00:00.000Z"}),/changed/);
  await updateCompanyJob(owner,id,{status:"CLOSED",expectedUpdatedAt:now.toISOString()});assert.deepEqual(query.where,{id,companyUserId:owner,updatedAt:now});assert.equal(query.data.status,"CLOSED");assert.ok(!query.data.postedAt);
 },[[db.jobPosting,"findUnique",async()=>source],[db,"$transaction",async(fn:any)=>fn({jobPosting:{updateMany:async(q:any)=>{query=q;return {count:1};},findUniqueOrThrow:async()=>({...source,status:"CLOSED"})},activityLog:{create:async()=>({})}})]]);
 await fixture(async()=>assert.rejects(updateCompanyJob(owner,id,{status:"CLOSED",expectedUpdatedAt:now.toISOString()}),/changed/),[[db.jobPosting,"findUnique",async()=>source],[db,"$transaction",async(fn:any)=>fn({jobPosting:{updateMany:async()=>({count:0})}})]]);
});
test("First draft publication refreshes posted date",async()=>{
 let data:any;await fixture(async()=>{await updateCompanyJob(owner,id,{status:"ACTIVE",expectedUpdatedAt:now.toISOString()});assert.ok(data.postedAt instanceof Date);},[[db.jobPosting,"findUnique",async()=>({...source,status:"DRAFT"})],[db,"$transaction",async(fn:any)=>fn({jobPosting:{updateMany:async(q:any)=>{data=q.data;return {count:1};},findUniqueOrThrow:async()=>source},activityLog:{create:async()=>({})}})]]);
});
test("Saved filters validate six controls and real calendar dates",()=>{
 assert.equal(validateSavedFilters(filters).search,"QA");for(const changes of [{status:"BOGUS"},{jobId:"bad"},{sort:"bad"},{from:"2026-02-30"},{from:"2026-10-08"},{search:"a".repeat(151)}])assert.throws(()=>validateSavedFilters({...filters,...changes}));
});
test("Named filters upsert, archive, restore and reject stale writes",async()=>{
 let raw:string|null=null;await fixture(async()=>{
  let response=await getSavedApplicantFilters(owner);response=await changeSavedApplicantFilters(owner,{action:"save",name:"QA filter",filters,expectedRevision:response.revision});assert.equal(response.items.length,1);const old=response.revision;
  response=await changeSavedApplicantFilters(owner,{action:"save",name:"qa FILTER",filters:{...filters,status:"ALL"},expectedRevision:response.revision});assert.equal(response.items.length,1);assert.equal(response.items[0].filters.status,"ALL");
  await assert.rejects(changeSavedApplicantFilters(owner,{action:"archive",id:response.items[0].id,expectedRevision:old}),/changed/);
  response=await changeSavedApplicantFilters(owner,{action:"archive",id:response.items[0].id,expectedRevision:response.revision});assert.ok(response.items[0].archivedAt);
  response=await changeSavedApplicantFilters(owner,{action:"restore",id:response.items[0].id,expectedRevision:response.revision});assert.equal(response.items[0].archivedAt,null);
 },[[db.user,"findUnique",async()=>({...company,companyProfile:{...company.companyProfile,savedApplicantFiltersJson:raw}})],[db.companyProfile,"updateMany",async(q:any)=>{assert.equal(q.where.userId,owner);if(raw===null)assert.ok(q.where.OR);else assert.equal(q.where.savedApplicantFiltersJson,raw);raw=q.data.savedApplicantFiltersJson;return {count:1};}]]);
});
test("Foreign preset scopes, CAS conflicts and corrupted data are rejected",async()=>{
 await fixture(async()=>{const base=await getSavedApplicantFilters(owner);await assert.rejects(changeSavedApplicantFilters(owner,{action:"save",name:"QA",filters:{...filters,jobId:foreign},expectedRevision:base.revision}),/owned/);await assert.rejects(changeSavedApplicantFilters(owner,{action:"save",name:"QA",filters,expectedRevision:base.revision}),/changed/);},[[db.user,"findUnique",async()=>company],[db.jobPosting,"findFirst",async()=>null],[db.companyProfile,"updateMany",async()=>({count:0})]]);
 await fixture(async()=>assert.rejects(getSavedApplicantFilters(owner),/kept/),[[db.user,"findUnique",async()=>({...company,companyProfile:{...company.companyProfile,savedApplicantFiltersJson:"broken"}})]]);
});
test("Analytics separates current and recorded stages and deduplicates history",()=>{
 const event=(status:string)=>({status,timestamp:now.toISOString()});const result=summarizeHiring([source],[{jobId:id,status:"WITHDRAWN",createdAt:now,timelineJson:JSON.stringify([event("APPLIED"),event("SHORTLISTED"),event("SHORTLISTED"),event("INTERVIEW"),event("WITHDRAWN")])},{jobId:id,status:"OFFERED",createdAt:now,timelineJson:"broken"}],now);
 assert.equal(result.currentStages.reduce((sum,s)=>sum+s.count,0),2);assert.equal(result.recordedStages.find(s=>s.status==="SHORTLISTED")?.count,1);assert.equal(result.currentStages.find(s=>s.status==="SHORTLISTED")?.count,0);assert.deepEqual(result.historyCoverage,{withTimeline:1,withoutTimeline:1});assert.equal(result.perOpening[0].activePipeline,0);assert.equal(result.perOpening[0].offers,1);assert.ok(summarizeHiring([],[],now).currentStages.every(s=>s.share===null));
});
test("Analytics enforces opening ownership, UTC inclusive dates, and excludes private candidate fields",async()=>{
 let query:any;await fixture(async()=>{
  await assert.rejects(getHiringAnalytics(owner,{jobId:foreign,from:"",to:""}),/not found/);await getHiringAnalytics(owner,{jobId:id,from:"2026-10-06",to:"2026-10-07"});assert.deepEqual(query.where.jobId,{in:[id]});assert.equal(query.where.createdAt.lt.toISOString(),"2026-10-08T00:00:00.000Z");assert.deepEqual(Object.keys(query.select).sort(),["createdAt","jobId","status","timelineJson"]);
 },[[db.jobPosting,"findMany",async(q:any)=>{assert.equal(q.where.companyUserId,owner);return [source];}],[db.jobApplication,"findMany",async(q:any)=>{query=q;return [];}]]);assert.throws(()=>analyticsFilters(new URLSearchParams("from=2026-02-30")));
});
