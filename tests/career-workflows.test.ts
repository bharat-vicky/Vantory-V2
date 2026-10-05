import test from "node:test";
import assert from "node:assert/strict";
import {db} from "../lib/db";
import {stubMethod} from "./fixtures";
import {interviewUtc,validateInterview,applicationInterview,interviewCalendar,type InterviewSchedule} from "../lib/jobs/interview-schedule";
import {scheduleCompanyInterview} from "../lib/company/interview-service";
import {candidateMembership,leaveCandidateInstitute} from "../lib/candidate/membership";
import {listInstituteInvitations,changeInstituteInvitation} from "../lib/institute/invitations";
import {defaultCareer} from "../lib/candidate/profile";

const appId="111111111111111111111111",instituteId="222222222222222222222222",revision=new Date("2026-10-05T00:00:00Z");
const schedule:InterviewSchedule={state:"SCHEDULED",startsAt:"2027-01-10T04:30:00Z",timeZone:"Asia/Kolkata",durationMinutes:45,mode:"ONLINE",joiningDetails:"https://meet.example.test/qa",interviewer:"QA interviewer",message:"Synthetic test only",updatedAt:revision.toISOString(),sequence:1};
test("Interview wall times convert across zones and reject invalid or ambiguous DST times",()=>{
 assert.equal(interviewUtc("2027-01-10T10:00","Asia/Kolkata").toISOString(),"2027-01-10T04:30:00.000Z");
 assert.equal(interviewUtc("2027-07-10T10:00","America/New_York").toISOString(),"2027-07-10T14:00:00.000Z");
 assert.throws(()=>interviewUtc("2027-03-14T02:30","America/New_York"),/does not exist/);
 assert.throws(()=>interviewUtc("2027-11-07T01:30","America/New_York"),/occurs twice/);
 assert.throws(()=>interviewUtc("2027-01-10T10:00","invalid"),/IANA/);
});
test("Interview validation requires future times, bounded duration and safe meeting links",()=>{
 const input={localDateTime:"2026-10-10T10:00",timeZone:"Asia/Kolkata",durationMinutes:30,mode:"ONLINE",joiningDetails:"https://meet.example.test/test",interviewer:"",message:""};
 assert.equal(validateInterview(input,revision).mode,"ONLINE");
 assert.throws(()=>validateInterview({...input,joiningDetails:"javascript:alert(1)"},revision),/HTTPS/);
 assert.throws(()=>validateInterview({...input,joiningDetails:"https://secret@meet.example.test"},revision),/HTTPS/);
 assert.throws(()=>validateInterview({...input,durationMinutes:0},revision),/duration/);
 assert.throws(()=>validateInterview(input,new Date("2027-01-01")),/future/);
});
test("Calendar exports have stable identity, correct UTC times and escape injection",()=>{
 const calendar=interviewCalendar(appId,"Engineer\nBEGIN:VEVENT","Employer",{...schedule,message:"Line1\nLine2, " + "学生".repeat(80)});
 assert.match(calendar,/DTSTART:20270110T043000Z/);assert.match(calendar,/DTEND:20270110T051500Z/);
 assert.match(calendar,/Engineer\\nBEGIN:VEVENT/);assert.equal(calendar.split("\r\n").filter(line=>line === "BEGIN:VEVENT").length,1);
 assert.ok(calendar.split("\r\n").every(line=>Buffer.byteLength(line)<=75));
 const cancelled=interviewCalendar(appId,"Engineer","Employer",{...schedule,state:"CANCELLED",sequence:2});
 assert.match(cancelled,/STATUS:CANCELLED/);assert.match(cancelled,/SEQUENCE:2/);assert.match(cancelled,new RegExp(`UID:${appId}@vantory.app`));
});
test("Interview reader selects latest event and prevents terminal applications showing active meetings",()=>{
 const events=JSON.stringify([{kind:"INTERVIEW_SCHEDULE",interview:schedule},{kind:"INTERVIEW_SCHEDULE",interview:{...schedule,state:"CANCELLED",sequence:2}}]);
 assert.equal(applicationInterview(events,"INTERVIEW")?.state,"CANCELLED");
 assert.equal(applicationInterview(JSON.stringify([{kind:"INTERVIEW_SCHEDULE",interview:schedule}]),"WITHDRAWN")?.state,"CANCELLED");
 assert.equal(applicationInterview("invalid","INTERVIEW"),null);
});
test("Employer scheduling rejects foreign ownership, terminal states and stale revisions",async()=>{
 let status="WITHDRAWN";const restore=stubMethod(db.jobApplication,"findUnique",async()=>({status,updatedAt:revision,job:{companyUserId:"owner"}}));
 try{await assert.rejects(()=>scheduleCompanyInterview("foreign",appId,{action:"cancel",expectedUpdatedAt:revision.toISOString()}),/unavailable/);await assert.rejects(()=>scheduleCompanyInterview("owner",appId,{action:"cancel",expectedUpdatedAt:revision.toISOString()}),/shortlisted/);status="INTERVIEW";await assert.rejects(()=>scheduleCompanyInterview("owner",appId,{action:"cancel",expectedUpdatedAt:"stale"}),/changed/);}finally{restore();}
});
test("Scheduling and cancellation preserve private notes and conditional update checks",async()=>{
 const localDateTime=new Date(Date.now()+86400000).toISOString().slice(0,16);let app:any={status:"SHORTLISTED",updatedAt:revision,timelineJson:"[]",notes:"Private",job:{companyUserId:"owner",company:"QA"}},lastWrite:any;
 const restores=[stubMethod(db.jobApplication,"findUnique",async()=>app),stubMethod(db.jobApplication,"updateMany",async({where,data}:any)=>{assert.equal(where.updatedAt,revision);assert.equal(data.notes,undefined);lastWrite=data;app={...app,...data};return {count:1};})];
 try{const saved=await scheduleCompanyInterview("owner",appId,{action:"schedule",expectedUpdatedAt:revision.toISOString(),interview:{localDateTime,timeZone:"UTC",durationMinutes:30,mode:"ONSITE",joiningDetails:"QA room",interviewer:"",message:""}});assert.equal(saved.status,"INTERVIEW");assert.equal(saved.interview?.state,"SCHEDULED");await scheduleCompanyInterview("owner",appId,{action:"cancel",expectedUpdatedAt:revision.toISOString()});assert.equal(applicationInterview(lastWrite.timelineJson,"INTERVIEW")?.state,"CANCELLED");assert.equal(app.notes,"Private");}finally{restores.reverse().forEach(r=>r());}
});
test("Scheduling does not silently overwrite a concurrent withdrawal",async()=>{
 const restores=[stubMethod(db.jobApplication,"findUnique",async()=>({status:"INTERVIEW",updatedAt:revision,timelineJson:JSON.stringify([{kind:"INTERVIEW_SCHEDULE",interview:schedule}]),job:{companyUserId:"owner"}})),stubMethod(db.jobApplication,"updateMany",async()=>({count:0}))];
 try{await assert.rejects(()=>scheduleCompanyInterview("owner",appId,{action:"cancel",expectedUpdatedAt:revision.toISOString()}),/changed/);}finally{restores.reverse().forEach(r=>r());}
});
test("Leaving an institute atomically disables both consent flags and revokes active reviews",async()=>{
 const calls:string[]=[];const restore=stubMethod(db,"$transaction",async(fn:any)=>fn({user:{findUnique:async()=>({instituteId,email:"qa@example.test",updatedAt:revision,profile:{careerJson:JSON.stringify({...defaultCareer,mentorConsent:true,instituteAnalyticsConsent:true})}}),updateMany:async({data}:any)=>{assert.equal(data.instituteId,null);calls.push("unlink");return {count:1};}},profile:{upsert:async({update}:any)=>{const career=JSON.parse(update.careerJson);assert.equal(career.mentorConsent,false);assert.equal(career.instituteAnalyticsConsent,false);calls.push("consent");}},resumeReviewRequest:{updateMany:async({where,data}:any)=>{assert.deepEqual(where.status.in,["OPEN","REVIEWED"]);assert.equal(data.status,"REVOKED");calls.push("reviews");}},instituteInvitation:{updateMany:async({data}:any)=>{assert.equal(data.status,"LEFT");calls.push("history");}},activityLog:{create:async()=>{calls.push("audit");}}}));
 try{await leaveCandidateInstitute("candidate",{confirm:true,instituteId,expectedUpdatedAt:revision.toISOString()});assert.deepEqual(calls,["unlink","consent","reviews","history","audit"]);await assert.rejects(()=>leaveCandidateInstitute("candidate",{confirm:false,instituteId,expectedUpdatedAt:revision.toISOString()}),/Confirm/);}finally{restore();}
});
test("Membership exposes only the joined institute and current saved sharing state",async()=>{
 const restores=[stubMethod(db.user,"findUnique",async()=>({updatedAt:revision,email:"qa@example.test",instituteId,institute:{id:instituteId,name:"College",verificationStatus:"PENDING",contactPhone:"private"},profile:{careerJson:JSON.stringify(defaultCareer)}})),stubMethod(db.instituteInvitation,"findFirst",async()=>({updatedAt:revision}))];
 try{const result=await candidateMembership("candidate");assert.equal(result.institute?.name,"College");assert.equal(result.mentorConsent,false);assert.equal("contactPhone" in result.institute!,false);}finally{restores.reverse().forEach(r=>r());}
});
function adminFixture(){return stubMethod(db.user,"findUnique",async()=>({role:"INSTITUTE_ADMIN",instituteId,institute:{id:instituteId}}));}
test("Invitation list is tenant-scoped and distinguishes expired from pending",async()=>{
 const restores=[adminFixture(),stubMethod(db.instituteInvitation,"count",async({where}:any)=>{assert.equal(where.instituteId,instituteId);assert.equal(where.status,"PENDING");assert.ok(where.expiresAt.lte instanceof Date);return 1;}),stubMethod(db.instituteInvitation,"findMany",async()=>[{id:appId,name:"QA",email:"qa@example.test",status:"PENDING",expiresAt:revision,updatedAt:revision}])];
 try{const result=await listInstituteInvitations("admin",new URLSearchParams({status:"EXPIRED"}));assert.equal(result.invitations[0].status,"EXPIRED");assert.equal(result.total,1);}finally{restores.reverse().forEach(r=>r());}
});
test("Invitation actions reject accepted memberships and stale writes",async()=>{
 let status="ACCEPTED";const restores=[adminFixture(),stubMethod(db.instituteInvitation,"findFirst",async({where}:any)=>{assert.equal(where.instituteId,instituteId);return {id:appId,status};}),stubMethod(db.instituteInvitation,"updateMany",async()=>({count:0}))];
 try{await assert.rejects(()=>changeInstituteInvitation("admin",{id:appId,action:"renew",expectedUpdatedAt:revision.toISOString()}),/Accepted/);status="PENDING";await assert.rejects(()=>changeInstituteInvitation("admin",{id:appId,action:"revoke",expectedUpdatedAt:revision.toISOString()}),/changed/);}finally{restores.reverse().forEach(r=>r());}
});
test("Revoked invitations can be renewed without changing membership or consent",async()=>{
 let state="REVOKED",saved:any;const restores=[adminFixture(),stubMethod(db.instituteInvitation,"findFirst",async()=>({id:appId,status:state})),stubMethod(db.instituteInvitation,"updateMany",async({where,data}:any)=>{assert.equal(where.instituteId,instituteId);assert.equal(where.updatedAt.toISOString(),revision.toISOString());saved=data;state=data.status;return {count:1};})];
 try{await changeInstituteInvitation("admin",{id:appId,action:"renew",expectedUpdatedAt:revision.toISOString()});assert.equal(saved.status,"PENDING");assert.ok(saved.expiresAt.getTime()>Date.now()+29*86400000);await changeInstituteInvitation("admin",{id:appId,action:"revoke",expectedUpdatedAt:revision.toISOString()});assert.deepEqual(saved,{status:"REVOKED"});}finally{restores.reverse().forEach(r=>r());}
});
test("Leaving a stale or different institute membership fails before consent changes",async()=>{
 let wrote=false;const restore=stubMethod(db,"$transaction",async(fn:any)=>fn({user:{findUnique:async()=>({instituteId:"foreign",updatedAt:revision}),updateMany:async()=>{wrote=true;return {count:1};}}}));
 try{await assert.rejects(()=>leaveCandidateInstitute("candidate",{confirm:true,instituteId,expectedUpdatedAt:revision.toISOString()}),/Membership changed/);assert.equal(wrote,false);}finally{restore();}
});
