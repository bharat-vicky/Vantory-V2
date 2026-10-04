import test from "node:test";
import assert from "node:assert/strict";
import {TOPICS,publicTopic,gradeQuiz} from "../lib/preparation/curriculum";
import {executeAssessment} from "../lib/preparation/execution";
import {executionConfiguration} from "../lib/preparation/execution-config";

test("Execution availability rejects malformed URLs, insecure endpoints and invalid language IDs",()=>{
 assert.equal(executionConfiguration({}).available,false);
 for(const url of ["not a URL","http://runner.example","https://user:password@runner.example","https://runner.example?token=secret"]){assert.equal(executionConfiguration({JUDGE0_URL:url,JUDGE0_TOKEN:"fixture"}).available,false);}
 assert.equal(executionConfiguration({JUDGE0_URL:"https://runner.example",JUDGE0_TOKEN:"fixture",JUDGE0_SQL_LANGUAGE_ID:"NaN"}).available,false);
 assert.equal(executionConfiguration({JUDGE0_URL:"https://runner.example",JUDGE0_TOKEN:"fixture"}).available,true);
});
import {calendarEvent} from "../lib/candidate/calendar";
import {validateCareer,profileCompletion,defaultCareer} from "../lib/candidate/profile";
import {preservesResumeFacts} from "../lib/ai/factual-rewrite";
test("Public knowledge checks do not disclose answer keys; all topics can be assessed",()=>{for(const t of TOPICS){assert.ok(t.quiz.length>=3);assert.equal('answer' in publicTopic(t).quiz[0],false);assert.equal(gradeQuiz(t,t.quiz.map(q=>({id:q.id,choice:q.answer}))).score,100);assert.throws(()=>gradeQuiz(t,[]));}});
test("Incorrect and duplicate choices cannot create a passing knowledge score",()=>{const t=TOPICS[0];const answers=t.quiz.map(q=>({id:q.id,choice:(q.answer+1)%q.options.length}));assert.equal(gradeQuiz(t,answers).score,0);assert.throws(()=>gradeQuiz(t,[answers[0],answers[0],answers[0]]));});
test("Execution remains unavailable without a configured isolated backend",async()=>{await assert.rejects(()=>executeAssessment("arrays","print(2)"),/unavailable/);await assert.rejects(()=>executeAssessment("sql","DROP TABLE customers"),/SELECT/);});
test("Execution sends only bounded, network-disabled sandbox submissions and checks real output",async()=>{const orig=globalThis.fetch;process.env.JUDGE0_URL="https://runner.example";process.env.JUDGE0_TOKEN="fixture";let requests=0;globalThis.fetch=async (_url,options)=>{const body=JSON.parse(String(options?.body));assert.equal(body.enable_network,false);assert.equal(body.cpu_time_limit,2);assert.equal(body.wall_time_limit,5);assert.equal(body.additional_files,undefined);requests++;const values=["2","null","-1","null"];return new Response(JSON.stringify({stdout:values[requests-1],status:{id:3,description:"Accepted"},time:"0.01"}));};try{const result=await executeAssessment("arrays","fixture code");assert.equal(requests,4);assert.equal(result.score,100);}finally{globalThis.fetch=orig;process.env.JUDGE0_URL="";process.env.JUDGE0_TOKEN="";}});
test("Academic values are bounded and empty profile has zero completion",()=>{assert.equal(profileCompletion({},defaultCareer),0);assert.throws(()=>validateCareer({...defaultCareer,cgpa:15}));assert.throws(()=>validateCareer({...defaultCareer,activeBacklogs:0.5}));assert.equal(validateCareer({...defaultCareer,cgpa:7}).cgpa,7);});
test("Factual rewrite rejects fabricated quantities and technologies",()=>{assert.equal(preservesResumeFacts("Built an app using Python","Built an app using Python for 1000 users"),false);assert.equal(preservesResumeFacts("Built an app using Python","Built an app using Python and Docker"),false);});
test("Calendar events escape candidate text and use UTC dates",()=>{const data=calendarEvent({id:"safe",title:"Role\nBEGIN:VEVENT",company:"A,B",at:new Date("2026-10-04T10:00:00Z")});assert.match(data,/DTSTART:20261004T100000Z/);assert.equal(data.split("BEGIN:VEVENT").length,3);assert.ok(data.includes("Role\\nBEGIN:VEVENT"));assert.ok(data.includes("A\\,B"));assert.match(data,/BEGIN:VALARM/);});
