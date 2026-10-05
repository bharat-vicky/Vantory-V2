import test from "node:test";
import assert from "node:assert/strict";
import {db} from "../lib/db";
import {getCompanyApplications,updateApplicationStatusByCompany,saveApplicationNotesByCompany} from "../lib/company/company-service";

test("Private notes save and clear on withdrawn applications without changing status or timeline",async()=>{
 const revision=new Date("2026-10-05T00:00:00Z");let saved:any;
 const restores=[stubMethod(db.jobApplication,"findUnique",async()=>({status:"WITHDRAWN",updatedAt:revision,job:{companyUserId:"owner"}})),stubMethod(db.jobApplication,"updateMany",async({where,data}:any)=>{assert.equal(where.updatedAt.toISOString(),revision.toISOString());saved=data;return {count:1};})];
 try{await saveApplicationNotesByCompany("owner","app","Private note",revision.toISOString());assert.deepEqual(saved,{notes:"Private note"});await saveApplicationNotesByCompany("owner","app","",revision.toISOString());assert.deepEqual(saved,{notes:null});await assert.rejects(()=>saveApplicationNotesByCompany("foreign","app","note",revision.toISOString()),/another employer/);}finally{restores.reverse().forEach(r=>r());}
});
test("Private notes reject stale revisions and invalid payloads",async()=>{
 const restores=[stubMethod(db.jobApplication,"findUnique",async()=>({job:{companyUserId:"owner"}})),stubMethod(db.jobApplication,"updateMany",async()=>({count:0}))];
 try{await assert.rejects(()=>saveApplicationNotesByCompany("owner","app","note","2026-10-05T00:00:00Z"),/changed/);await assert.rejects(()=>saveApplicationNotesByCompany("owner","app",{},"2026-10-05T00:00:00Z"),/2,000/);}finally{restores.reverse().forEach(r=>r());}
});
import {stubMethod} from "./fixtures";
test("Foreign employer job filter cannot replace owned jobs",async()=>{let read=false;const restores=[stubMethod(db.jobPosting,"findMany",async()=>[{id:"owned-job"}]),stubMethod(db.jobApplication,"findMany",async()=>{read=true;return [];})];try{const apps=await getCompanyApplications("employer",{jobId:"foreign-job"});assert.deepEqual(apps,[]);assert.equal(read,false);}finally{restores.reverse().forEach(r=>r());}});
test("Company status change rejects foreign ownership and unsupported transitions",async()=>{const restore=stubMethod(db.jobApplication,"findUnique",async()=>({id:"app",status:"APPLIED",job:{companyUserId:"owner",company:"Company"},user:{name:"Candidate"}}));try{await assert.rejects(()=>updateApplicationStatusByCompany("foreign","app","SHORTLISTED"),/another employer/);await assert.rejects(()=>updateApplicationStatusByCompany("owner","app","BOGUS"),/Unsupported/);await assert.rejects(()=>updateApplicationStatusByCompany("owner","app","OFFERED"),/Invalid status transition/);}finally{restore();}});
test("Concurrent employer status updates fail visibly instead of overwriting",async()=>{const restores=[stubMethod(db.jobApplication,"findUnique",async()=>({status:"APPLIED",updatedAt:new Date(),timelineJson:"[]",job:{companyUserId:"owner",company:"Company"},user:{name:"Candidate"}})),stubMethod(db.jobApplication,"updateMany",async()=>({count:0}))];try{await assert.rejects(()=>updateApplicationStatusByCompany("owner","app","SHORTLISTED"),/changed/);}finally{restores.reverse().forEach(r=>r());}});

test("Interview stage records no fictional schedule and same-stage notes add no timeline event",async()=>{
 const updatedAt=new Date("2026-10-05T00:00:00Z");let status="SHORTLISTED",saved:any;
 const restores=[stubMethod(db.jobApplication,"findUnique",async()=>({status,updatedAt,timelineJson:"[]",job:{companyUserId:"owner",company:"Company"},user:{name:"Candidate"}})),stubMethod(db.jobApplication,"updateMany",async({data}:any)=>{saved=data;return {count:1};}),stubMethod(db.activityLog,"create",async()=>({}))];
 try{await updateApplicationStatusByCompany("owner","app","INTERVIEW","",updatedAt.toISOString());assert.equal(JSON.parse(saved.timelineJson)[0].title,"Moved to interview stage");status="INTERVIEW";await updateApplicationStatusByCompany("owner","app","INTERVIEW","private",updatedAt.toISOString());assert.deepEqual(saved,{notes:"private"});await assert.rejects(()=>updateApplicationStatusByCompany("owner","app","SELECTED","private","2026-10-04T00:00:00Z"),/changed/);}finally{restores.reverse().forEach(r=>r());}
});
