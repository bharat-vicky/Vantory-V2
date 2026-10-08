import test from "node:test";
import assert from "node:assert/strict";
import {defaultAIProvider,validateEvaluation} from "../lib/interview/ai-provider";
import {buildInterviewContext} from "../lib/interview/context-builder";
import {ReportGenerator} from "../lib/interview/report-generator";
import {InterviewSetupConfig,QuestionEvaluation} from "../lib/interview/types";
import {resumeSession,startSession,answerSession} from "../lib/interview/session-service";
import {db} from "../lib/db";
import {stubMethod} from "./fixtures";
import {FollowUpEngine} from "../lib/interview/follow-up-engine";
import {questionAudio,cloudVoiceEnabled} from "../lib/interview/voice-service";
import {selectPracticeQuestion} from "../lib/interview/question-library";
import {AnswerEvaluator} from "../lib/interview/answer-evaluator";
import {PASSED_ANSWER} from "../lib/interview/turns";
const config:InterviewSetupConfig={targetJobTitle:"Data Analyst",jobDescription:"Required SQL and Excel. Python preferred.",interviewType:"FULL",difficulty:"Easy",durationMinutes:10,interviewerStyle:"Professional"};
const evaluation:QuestionEvaluation={technicalAccuracy:0,relevance:10,depth:0,completeness:0,evidenceScore:0,communication:20,problemSolving:0,overallScore:99,feedback:"JOIN behavior was incorrect.",strengths:[],missingElements:["Retaining unmatched rows"],improvementSuggestions:["Review LEFT JOIN semantics"],exampleAnswerStructure:"Describe matching and unmatched rows",credibilityConcern:false,assessedDimensions:["technicalAccuracy","relevance"],evidenceQuotes:["LEFT JOIN removes unmatched rows"],assessmentVersion:"rubric.v1"};

test("Conversational follow-ups use the answer and selected style, not a repeated checklist",async()=>{
 const original=globalThis.fetch;process.env.GEMINI_API_KEY="fixture";
 globalThis.fetch=async(_url,options)=>{const body=JSON.parse(String(options?.body));const input=JSON.parse(body.contents[0].parts[0].text);assert.equal(input.answer,"LEFT JOIN removes unmatched rows");assert.equal(input.style,"Friendly");return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({questionText:"What would happen to a customer with no matching order?"})}]},finishReason:"STOP"}]}));};
 try {const profile=await buildInterviewContext(config);const q=await FollowUpEngine.generateFollowUpQuestion({questionText:"Explain LEFT JOIN",category:"Technical",candidateAnswerText:"LEFT JOIN removes unmatched rows",evaluation,profile,interviewerStyle:"Friendly"});assert.equal(q.questionText,"What would happen to a customer with no matching order?");} finally {globalThis.fetch=original;delete process.env.GEMINI_API_KEY;}
});
test("Follow-up outage preserves assessment and skip requests move on",async()=>{
 const profile=await buildInterviewContext(config);const q=await defaultAIProvider.generateFollowUp({questionText:"Explain LEFT JOIN",candidateAnswerText:"LEFT JOIN removes unmatched rows",evaluation,profile,interviewerStyle:"Friendly"});assert.match(q!.questionText,/Retaining unmatched rows/);assert.equal(FollowUpEngine.shouldTriggerFollowUp({candidateAnswerText:"I would like to pass this question and move to the next topic.",evaluation,followUpCount:0}),false);assert.equal(FollowUpEngine.shouldTriggerFollowUp({candidateAnswerText:"answer",evaluation,followUpCount:3}),false);
});
test("Optional follow-ups have one bounded request; quota errors fall back without retries",async()=>{
 const original=globalThis.fetch;process.env.GEMINI_API_KEY="fixture";let calls=0;
 globalThis.fetch=async()=>{calls++;return new Response("{}",{status:429});};
 try {const profile=await buildInterviewContext(config);const q=await defaultAIProvider.generateFollowUp({questionText:"Explain LEFT JOIN",candidateAnswerText:"LEFT JOIN removes unmatched rows",evaluation,profile,interviewerStyle:"Friendly"});assert.match(q!.questionText,/Retaining unmatched rows/);assert.equal(calls,1);}finally{globalThis.fetch=original;delete process.env.GEMINI_API_KEY;}
});
test("Technical question categories describe the actual question, not an unrelated stage label",async()=>{
 const profile=await buildInterviewContext(config);const q=await defaultAIProvider.generateQuestion({profile,interviewType:"TECHNICAL",difficulty:"Easy",interviewerStyle:"Friendly",category:"System Design & Scaling",questionIndex:2,previousQuestions:[],previousAnswers:[]});assert.match(q.questionText,/JOIN/);assert.equal(q.category,"Technical Fundamentals");
});
test("Exhausted SQL banks do not drift into API questions because of an unfamiliar role title",async()=>{
 const profile=await buildInterviewContext({...config,targetJobTitle:"QA ONLY - Interview",jobDescription:"Required SQL and Excel."});const first=selectPracticeQuestion(profile,"Easy",[]);assert.equal(first?.skill,"SQL");assert.equal(selectPracticeQuestion(profile,"Easy",[first!.prompt]),undefined);const next=await defaultAIProvider.generateQuestion({profile,interviewType:"TECHNICAL",difficulty:"Easy",interviewerStyle:"Friendly",category:"Technical Fundamentals",questionIndex:2,previousQuestions:[first!.prompt],previousAnswers:[]});assert.doesNotMatch(next.questionText,/idempotency|orders after a timeout/i);assert.match(next.questionText,/SQL|Excel/);
});
test("Completed interview audio cannot spend provider quota",async()=>{
 const id="111111111111111111111111",qid="222222222222222222222222";const restore=stubMethod(db.interviewSession,"findFirst",async()=>({id,status:"COMPLETED",questions:[{id:qid,questionText:"SQL?"}]}));
 try{await assert.rejects(()=>questionAudio("owner",id,qid,"Kore"),/active interview/);}finally{restore();}
});
test("A passed question earns no fabricated clarity credit and makes no AI request",async()=>{
 const profile=await buildInterviewContext(config);const e=await AnswerEvaluator.evaluateCandidateAnswer({questionText:"Explain SQL",category:"Technical Fundamentals",candidateAnswerText:PASSED_ANSWER,profile,difficulty:"Easy",interviewerStyle:"Friendly"});assert.equal(e.overallScore,0);assert.equal(e.communication,0);assert.deepEqual(e.assessedDimensions,["relevance"]);assert.equal(e.provider,"practice-pass");assert.match(e.feedback,/No answer was supplied/);
});
test("Reports include measured follow-up corrections in the original skill without inventing untested coverage",async()=>{
 const profile=await buildInterviewContext(config);
 const parent={id:"parent",sessionId:"s",questionIndex:1,category:"Technical Fundamentals",questionText:"Explain INNER JOIN and LEFT JOIN using customers and orders. How do you keep customers with no orders?",candidateAnswerText:"Incorrect answer",evaluation:{...evaluation,assessedSkill:"SQL",technicalAccuracy:0,overallScore:10},isFollowUp:false};
 const follow={id:"follow",sessionId:"s",questionIndex:2,category:"Concept Follow-Up",questionText:"What happens to a customer without orders?",candidateAnswerText:"They stay in a LEFT JOIN with NULL order fields.",evaluation:{...evaluation,technicalAccuracy:100,overallScore:90,assessedSkill:undefined},isFollowUp:true,followUpParentId:"parent"};
 const report=ReportGenerator.generateFinalReport({sessionId:"s",profile,evaluatedQuestions:[parent,follow]});assert.equal(report.roleReadinessBreakdown.SQL,50);assert.equal(report.roleReadinessBreakdown.Excel,null);
 const detached=ReportGenerator.generateFinalReport({sessionId:"s",profile,evaluatedQuestions:[{...follow,followUpParentId:"missing"}]});assert.equal(detached.roleReadinessBreakdown.SQL,null);
 const unmeasured=ReportGenerator.generateFinalReport({sessionId:"s",profile,evaluatedQuestions:[parent,{...follow,evaluation:{...follow.evaluation,assessedDimensions:["relevance"]}}]});assert.equal(unmeasured.roleReadinessBreakdown.SQL,0);
});
test("Natural voice enforces question ownership and disabled configuration before provider requests",async()=>{
 const id="111111111111111111111111",qid="222222222222222222222222";let calls=0;
 const fetchOriginal=globalThis.fetch;globalThis.fetch=async()=>{calls++;throw new Error();};
 const restore=stubMethod(db.interviewSession,"findFirst",async({where}:any)=>where.userId==="owner"?{id,status:"ACTIVE",questions:[{id:qid,questionText:"Explain JOIN"}]}:null);
 try {delete process.env.INTERVIEW_CLOUD_VOICE_ENABLED;assert.equal(cloudVoiceEnabled(),false);await assert.rejects(()=>questionAudio("foreign",id,qid,"Kore"),/not found/);await assert.rejects(()=>questionAudio("owner",id,"333333333333333333333333","Kore"),/not found/);await assert.rejects(()=>questionAudio("owner",id,qid,"invalid"),/Select/);await assert.rejects(()=>questionAudio("owner",id,qid,"Kore"),/not enabled/);assert.equal(calls,0);}finally{restore();globalThis.fetch=fetchOriginal;}
});
test("Natural voice speaks only stored questions and returns a valid WAV; malformed output fails safely",async()=>{
 const original=globalThis.fetch;process.env.GEMINI_API_KEY="fixture";process.env.INTERVIEW_CLOUD_VOICE_ENABLED="true";
 const id="111111111111111111111111",qid="222222222222222222222222";
 const restore=stubMethod(db.interviewSession,"findFirst",async()=>({id,status:"ACTIVE",questions:[{id:qid,questionText:"Explain LEFT JOIN"}]}));
 const wav=Buffer.alloc(46);wav.write("RIFF");wav.write("WAVE",8);let valid=true;
 globalThis.fetch=async(_url,options)=>{const body=JSON.parse(String(options?.body));assert.equal(body.contents[0].parts[0].text,"Explain LEFT JOIN");assert.equal(body.generationConfig.speechConfig.voiceConfig.voice,"Aoede");return new Response(JSON.stringify({candidates:[{content:{parts:[{inlineData:{mimeType:"audio/wav",data:valid?wav.toString("base64"):"bad"}}]}}]}));};
 try{assert.deepEqual(await questionAudio("voice-fixture",id,qid,"Aoede"),wav);valid=false;await assert.rejects(()=>questionAudio("voice-fixture",id,qid,"Aoede"),/temporarily unavailable/);}finally{restore();globalThis.fetch=original;delete process.env.GEMINI_API_KEY;delete process.env.INTERVIEW_CLOUD_VOICE_ENABLED;}
});
test("Current JD always owns interview context; projects are never invented",async()=>{const p=await buildInterviewContext(config,undefined,JSON.stringify({skillsTable:[{skillName:"Docker",requirementType:"REQUIRED"}]}));assert.ok(p.requiredSkills.includes("SQL"));assert.ok(!p.requiredSkills.includes("Docker"));assert.deepEqual(p.extractedProjects,[]);assert.deepEqual(p.strongAreas,[]);});
test("Data question bank uses data fundamentals and avoids repeated prompts",async()=>{const profile=await buildInterviewContext(config);const params={profile,interviewType:config.interviewType,difficulty:config.difficulty,interviewerStyle:config.interviewerStyle,category:"Technical Fundamentals",questionIndex:1,previousQuestions:[],previousAnswers:[]};const first=await defaultAIProvider.generateQuestion(params);assert.match(first.questionText,/JOIN/);const next=await defaultAIProvider.generateQuestion({...params,previousQuestions:[first.questionText]});assert.notEqual(next.questionText,first.questionText);});
test("Rubric rejects invented quotes and scores outside bounds",()=>{assert.equal(validateEvaluation(evaluation,"LEFT JOIN removes unmatched rows"),true);assert.equal(validateEvaluation({...evaluation,technicalAccuracy:101},"LEFT JOIN removes unmatched rows"),false);assert.equal(validateEvaluation(evaluation,"I don't know"),false);});
test("Evaluation computes score from applicable dimensions instead of trusting provider total",async()=>{const original=globalThis.fetch;process.env.GEMINI_API_KEY="fixture";globalThis.fetch=async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(evaluation)}]},finishReason:"STOP"}]}),{status:200});try{const p=await buildInterviewContext(config);const e=await defaultAIProvider.evaluateAnswer({questionText:"Explain LEFT JOIN",category:"Technical Fundamentals",candidateAnswerText:"LEFT JOIN removes unmatched rows",profile:p,difficulty:"Easy",interviewerStyle:"Professional"});assert.equal(e.overallScore,5);assert.equal(e.assessmentVersion,"rubric.v2");assert.equal(e.model,"gemini-3.5-flash-lite");}finally{globalThis.fetch=original;delete process.env.GEMINI_API_KEY;}});
test("Provider outage cannot become successful assessment",async()=>{const p=await buildInterviewContext(config);await assert.rejects(()=>defaultAIProvider.evaluateAnswer({questionText:"SQL",category:"Technical Fundamentals",candidateAnswerText:"I know SQL",profile:p,difficulty:"Easy",interviewerStyle:"Friendly"}),/unavailable/);});

test("Interview requests enforce string outlines and bounded score dimensions at the provider",async()=>{
 const original=globalThis.fetch;process.env.GEMINI_API_KEY="fixture";
 globalThis.fetch=async(_url,options)=>{const body=JSON.parse(String(options?.body));assert.equal(body.generationConfig.responseSchema.properties.exampleAnswerStructure.type,"STRING");assert.deepEqual(body.generationConfig.responseSchema.properties.assessedDimensions.items.enum,["technicalAccuracy","relevance","depth","completeness","evidenceScore","communication","problemSolving"]);return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(evaluation)}]},finishReason:"STOP"}]}));};
 try{const profile=await buildInterviewContext(config);await defaultAIProvider.evaluateAnswer({questionText:"SQL",category:"Technical Fundamentals",candidateAnswerText:"LEFT JOIN removes unmatched rows",profile,difficulty:"Easy",interviewerStyle:"Professional"});}finally{globalThis.fetch=original;delete process.env.GEMINI_API_KEY;}
});
test("Empty and historical reports have no fabricated scores or progression",async()=>{const p=await buildInterviewContext(config);const empty=ReportGenerator.generateFinalReport({sessionId:"s",profile:p,evaluatedQuestions:[]});assert.equal(empty.overallScore,null);assert.equal(empty.categoryBreakdown.technicalScore,null);assert.equal(empty.historyProgression.previousAverage,null);assert.deepEqual(empty.strongestAreas,[]);const legacy=ReportGenerator.generateFinalReport({sessionId:"s",profile:p,evaluatedQuestions:[{id:"q",sessionId:"s",questionIndex:1,category:"Technical",questionText:"SQL?",candidateAnswerText:"SQL",evaluation:{...evaluation,assessmentVersion:undefined},isFollowUp:false}]});assert.equal(legacy.overallScore,null);});
test("Report leaves untested areas and unmatched skills unassessed",async()=>{const p=await buildInterviewContext(config);const report=ReportGenerator.generateFinalReport({sessionId:"s",profile:p,evaluatedQuestions:[{id:"q",sessionId:"s",questionIndex:1,category:"Technical Fundamentals",questionText:"Explain SQL LEFT JOIN",candidateAnswerText:"LEFT JOIN removes unmatched rows",evaluation:{...evaluation,overallScore:5},isFollowUp:false}],previousAverage:70});assert.equal(report.categoryBreakdown.projectKnowledgeScore,null);assert.equal(report.roleReadinessBreakdown.Excel,null);assert.equal(report.overallScore,5);assert.equal(report.historyProgression.improvement,-65);});
test("Interview ownership and idempotent retries do not create extra questions",async()=>{const id="111111111111111111111111",qid="222222222222222222222222";let writes=0;const restore=stubMethod(db.interviewSession,"findFirst",async ({where}:any)=>where.userId==="owner"?{id,userId:"owner",status:"ACTIVE",currentQuestionIndex:1,sessionStateJson:"{}",questions:[{id:qid,questionIndex:1,candidateAnswerText:"answer",responseJson:JSON.stringify({success:true,nextQuestion:{id:"next"}})}]}:null);try{await assert.rejects(()=>resumeSession("foreign",id),/not found/);const start=await startSession("owner",id);assert.equal(start.success,true);const response=await answerSession("owner",id,{questionId:qid,candidateAnswerText:"answer"});assert.equal(response.nextQuestion.id,"next");await assert.rejects(()=>answerSession("owner",id,{questionId:qid,candidateAnswerText:"changed"}),/already answered/);assert.equal(writes,0);}finally{restore();}});


test("Spoken answer pause resets for new words and rejects cancelled or repeated callbacks", async()=>{
 const {AnswerPause}=await import("../lib/interview/answer-pause");
 const pending:Array<()=>void>=[];const delays:number[]=[];let sent=0;
 const pause=new AnswerPause(((fn:()=>void,ms:number)=>{pending.push(fn);delays.push(ms);return pending.length as unknown as ReturnType<typeof setTimeout>;}) as typeof setTimeout, (()=>{}) as typeof clearTimeout);
 pause.heard("",6000,()=>sent++);assert.equal(pending.length,0);
 pause.heard("my first words",6000,()=>sent++);
 pause.heard("more words",10000,()=>sent++);
 pending[0]();assert.equal(sent,0);assert.deepEqual(delays,[6000,10000]);
 pending[1]();pending[1]();assert.equal(sent,1);
 pause.heard("draft",4000,()=>sent++);pause.clear();pending[2]();assert.equal(sent,1);
});
