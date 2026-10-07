"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {ROLE_PLANS,roleProgress,type PlanConfig} from "@/lib/preparation/role-plans";

type PublicTopic={id:string;title:string;objective:string;practice:string;resource:{title:string;url:string};quizSet:string;quiz:{id:string;prompt:string;options:string[]}[];exercise?:string};
type Result={score:number;review?:{id:string;prompt?:string;correct:boolean;explanation:string}[];passed?:number;total?:number;results?:{status:string;feedback:string}[]};
type Task={topicId:string;status:string;attempts:number;bestQuizScore:number|null;bestExecutionScore:number|null;evidence?:{score:number;kind:string};source?:{kind:string;sessionId:string;questionIndex:number;reason:string;targetRole:string}};
type Attempt={id:string;topicId:string;kind:string;score:number;createdAt:string;result:Result|null};
type Exercise={statement:string;title:string;language:string;starter:string};
const initialPlan:PlanConfig={roleId:"backend",durationDays:28};
const buttonClass="border rounded-lg px-4 py-2 text-sm disabled:opacity-50";

export function PreparationWorkspace(){
 const [topics,setTopics]=useState<PublicTopic[]>([]),[tasks,setTasks]=useState<Task[]>([]),[attempts,setAttempts]=useState<Attempt[]>([]);
 const [selected,setSelected]=useState(""),[answers,setAnswers]=useState<Record<string,number>>({}),[code,setCode]=useState("");
 const [notice,setNotice]=useState(""),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[execution,setExecution]=useState(false);
 const [result,setResult]=useState<Result|null>(null),[resultKind,setResultKind]=useState(""),[exercises,setExercises]=useState<Record<string,Exercise>>({});
 const [plan,setPlan]=useState<PlanConfig>(initialPlan),[planDraft,setPlanDraft]=useState<PlanConfig>(initialPlan),[browseAll,setBrowseAll]=useState(false),[draftScope,setDraftScope]=useState("");
 const requestKey=useRef(""),requestAction=useRef("");
 async function load(){
  const r=await fetch("/api/candidate/preparation",{cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j.error || "Could not load your preparation.");
  setTopics(j.topics);setTasks(j.tasks);setAttempts(j.attempts);setExecution(j.executionAvailable);setExercises(j.exercises);setDraftScope(j.draftScope);setPlan(j.plan);setPlanDraft(j.plan);setLoaded(true);
  setSelected(value=>{
   if(j.topics.some((t:PublicTopic)=>t.id===value))return value;
   const fromUrl=new URLSearchParams(window.location.search).get("topicId");
   return j.topics.some((t:PublicTopic)=>t.id===fromUrl)?fromUrl:j.progress.nextTopicId || j.progress.steps[0].topicId;
  });
 }
 useEffect(()=>{load().catch(e=>setNotice(e.message));},[]);
 const topic=topics.find(t=>t.id===selected),task=tasks.find(t=>t.topicId===selected);
 const exercise=topic?.exercise?exercises[topic.exercise]:undefined;
 const progress=loaded?roleProgress(plan,topics,tasks):null;
 const planChanged=plan.roleId!==planDraft.roleId || plan.durationDays!==planDraft.durationDays;
 const recommended=progress?.steps.map(s=>topics.find(t=>t.id===s.topicId)!).filter(Boolean) || [];
 const visibleTopics=browseAll?topics:recommended;
 const draftKey=draftScope && selected?"preparation-code:"+draftScope+":"+selected:"";
 useEffect(()=>{
  setAnswers({});setResult(null);requestKey.current="";
  if(!draftKey){setCode("");return;}
  try{setCode(localStorage.getItem(draftKey) ?? exercise?.starter ?? "");}
  catch{setCode(exercise?.starter || "");setNotice("Local draft storage is unavailable. Keep this tab open while editing.");}
 },[draftKey,exercise?.starter]);
 useEffect(()=>{setAnswers({});requestKey.current="";},[topic?.quizSet]);
 async function savePlan(){
  setBusy(true);setNotice("");try{
   const r=await fetch("/api/candidate/preparation",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(planDraft)});const j=await r.json();if(!r.ok)throw new Error(j.error);
   await load();setNotice("Preparation plan saved. Your existing practice scores are retained.");
  }catch(e){setNotice(e instanceof Error?e.message:"Could not save the plan.");}finally{setBusy(false);}
 }
 async function submit(action:string){
  setBusy(true);setNotice("");try{
   if(requestAction.current!==action){requestKey.current="";requestAction.current=action;}
   if(!requestKey.current)requestKey.current=crypto.randomUUID();
   const r=await fetch("/api/candidate/preparation",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({topicId:selected,action,quizSet:topic?.quizSet,requestKey:requestKey.current,answers:topic?.quiz.map(q=>({id:q.id,choice:answers[q.id]})),code})});const j=await r.json();if(!r.ok)throw new Error(j.error);
   if(j.result){setResult(j.result);setResultKind(action);}requestKey.current="";
   await load();setNotice(action==="start"?"Topic marked in progress. No assessment score was added.":"Practice recorded. Review the feedback before your next attempt.");
  }catch(e){setNotice(e instanceof Error?e.message:"Could not submit. Your draft is preserved.");}finally{setBusy(false);}
 }
 return <div className="space-y-6 max-w-6xl">
  <section className="bg-white border rounded-2xl p-6 space-y-4">
   <h1 className="text-2xl font-bold">Your preparation plan</h1>
   <p>Choose a role, practise its foundations, and use your results to find the next step.</p>
   <div className="flex flex-wrap gap-4 items-end">
    <label className="text-sm">Preparation role<select disabled={busy || !loaded} value={planDraft.roleId} onChange={e=>setPlanDraft(p=>({...p,roleId:e.target.value}))} className="block border rounded-lg p-2 mt-1">{ROLE_PLANS.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select></label>
    <label className="text-sm">Suggested pace<select disabled={busy || !loaded} value={planDraft.durationDays} onChange={e=>setPlanDraft(p=>({...p,durationDays:Number(e.target.value) as 14|28}))} className="block border rounded-lg p-2 mt-1"><option value={14}>14 days</option><option value={28}>28 days</option></select></label>
    <button className={buttonClass} disabled={busy || !loaded || !planChanged} onClick={savePlan}>Save preparation plan</button>
    {planChanged && <span className="text-sm text-amber-800">Plan changes are not saved</span>}
   </div>
   <p className="text-sm text-neutral-600">Practice days are flexible guidance, not deadlines. Changing this plan keeps your profile track and earlier scores. Knowledge checks alternate between two sets. Passing an exercise does not establish overall proficiency.</p>
   <p role="status" className="text-sm" aria-live="polite">{notice}</p>
   {!loaded && <p>Loading your practice history…</p>}
  </section>
  {progress && <section aria-label="Preparation progress" className="bg-white border rounded-2xl p-6 space-y-4">
   <h2 className="font-bold text-lg">{ROLE_PLANS.find(r=>r.id===plan.roleId)?.title} · {plan.durationDays} day plan</h2>
   <div className="grid sm:grid-cols-3 gap-4">
    <div><p className="text-sm">Knowledge checks at 80% or above</p><p className="text-2xl font-bold">{progress.knowledge} / {progress.knowledgeTotal}</p></div>
    <div><p className="text-sm">Exercises with every case passed</p><p className="text-2xl font-bold">{progress.execution} / {progress.executionTotal}</p></div>
    <div><p className="text-sm">Topics meeting both required checks</p><p className="text-2xl font-bold">{progress.checked} / {progress.steps.length}</p></div>
   </div>
   <progress className="w-full" aria-label="Topics meeting required checks" max={progress.steps.length} value={progress.checked}/>
   {progress.nextTopicId?<button disabled={busy} className={buttonClass} onClick={()=>setSelected(progress.nextTopicId!)}>Continue: {topics.find(t=>t.id===progress.nextTopicId)?.title}</button>:<p>You have met the checks for this plan. Revisit weak attempts or explore more topics.</p>}
   <p className="text-xs text-neutral-600">Counts use your best recorded results for each topic. Attempts to practise again do not erase earlier results.</p>
  </section>}
  <div className="grid md:grid-cols-[280px_1fr] gap-6">
   <nav className="space-y-2" aria-label="Preparation topics">
    <button className={buttonClass+" w-full"} disabled={busy || !loaded} onClick={()=>setBrowseAll(v=>!v)}>{browseAll?"Show my role plan":"Browse all topics"}</button>
    {visibleTopics.map(t=>{const state=tasks.find(x=>x.topicId===t.id),step=progress?.steps.find(s=>s.topicId===t.id);return <button disabled={busy} aria-current={t.id===selected?"step":undefined} className={"block w-full text-left border p-4 rounded-xl disabled:opacity-50 "+(t.id===selected?"bg-neutral-950 text-white":"bg-white")} key={t.id} onClick={()=>setSelected(t.id)}>
     <span className="block text-xs mb-1">{step?"Suggested day "+step.day:"Additional practice"}</span>{t.title}
     <span className="block text-xs mt-1">Knowledge: {state?.bestQuizScore!=null?state.bestQuizScore+"/100":"Not assessed"}{t.exercise && " · Code: "+(state?.bestExecutionScore!=null?state.bestExecutionScore+"/100":"Not run")}</span>
     {step?.checked && <span className="block text-xs mt-1">Required checks met</span>}
     {state?.source && <span className="block text-xs mt-1">Suggested from your interview</span>}
    </button>;})}
   </nav>
   {topic?<article className="bg-white rounded-2xl border p-6 space-y-5">
    <h2 className="font-bold text-xl">{topic.title}</h2>
    {task?.source && <div className="border rounded-lg bg-neutral-50 p-4 text-sm"><strong>{task.source.targetRole} · question {task.source.questionIndex}</strong><p className="mt-1">{task.source.reason}</p><Link href="/mock-interview" className="underline">Review interview history</Link></div>}
    <p>{topic.objective}</p><p>{topic.practice}</p><a href={topic.resource.url} target="_blank" rel="noreferrer" className="underline">{topic.resource.title}</a>
    <p className="text-sm">Best knowledge check: {task?.bestQuizScore ?? "Not assessed"} · Best execution check: {task?.bestExecutionScore ?? "Not assessed"}</p>
    <button disabled={busy} onClick={()=>submit("start")} className="block underline">Mark in progress</button>
    <fieldset disabled={busy} className="space-y-4"><legend className="font-bold">Knowledge check · set {topic.quizSet}</legend>
     {topic.quiz.map(q=><fieldset key={q.id} className="border rounded-xl p-4 space-y-2"><legend className="text-sm">{q.prompt}</legend>{q.options.map((o,i)=><label key={o} className="block text-sm"><input type="radio" name={q.id} checked={answers[q.id]===i} onChange={()=>{setAnswers(a=>({...a,[q.id]:i}));requestKey.current="";}}/> {o}</label>)}</fieldset>)}
     <button disabled={busy || topic.quiz.some(q=>answers[q.id]===undefined)} onClick={()=>submit("quiz")} className="bg-neutral-950 text-white rounded-lg p-3 disabled:opacity-50">Submit knowledge check</button>
    </fieldset>
    {exercise && <fieldset disabled={busy} className="space-y-3 border-t pt-5"><legend className="font-bold">{exercise.title} · {exercise.language==="python"?"Python 3":"SQLite"}</legend>
     <p>{exercise.statement}</p><label className="block text-sm">Your solution<textarea rows={12} spellCheck={false} className="block font-mono text-sm p-4 border rounded-xl w-full mt-1" value={code} onChange={e=>{setCode(e.target.value);requestKey.current="";try{if(draftKey)localStorage.setItem(draftKey,e.target.value);}catch{setNotice("Local draft storage is unavailable. Keep this tab open while editing.");}}}/></label>
     <p className="text-xs text-neutral-600">Code drafts are saved in this browser for your account. Submission results are saved to your account.</p>
     <button disabled={busy || !execution || !code.trim()} onClick={()=>submit("execute")} className={buttonClass}>{busy?"Submitting…":"Run execution check"}</button>
     {!execution && <p className="text-sm">Code execution is not enabled on this deployment. You can edit your solution and complete the knowledge check.</p>}
    </fieldset>}
    {result && <div role="status" className="border p-4 rounded-xl text-sm space-y-2"><p className="font-semibold">{resultKind==="execute"?"Execution":"Knowledge"} result: {result.score}/100 {result.total!==undefined && "· "+result.passed+"/"+result.total+" cases passed"}</p>{result.review?.map(r=><div key={r.id}>{r.prompt && <p>{r.prompt}</p>}<p>{r.correct?"Correct":"Review"}: {r.explanation}</p></div>)}{result.results?.map((r,i)=><p key={i}>Case {i+1}: {r.status} {r.feedback}</p>)}</div>}
    <details className="border-t pt-4"><summary className="font-semibold cursor-pointer">Recent attempts for this topic</summary><div className="space-y-2 mt-3">{attempts.filter(a=>a.topicId===selected).map(a=><div key={a.id} className="border rounded-lg p-3 text-sm"><p>{a.kind==="execute"?"Execution":"Knowledge"}: {a.score}/100 · {new Date(a.createdAt).toLocaleString()}</p><details><summary className="cursor-pointer">Feedback</summary>{a.result?.review?.map(r=><p className="mt-2" key={r.id}>{r.prompt} {r.explanation}</p>)}{a.result?.results?.map((r,i)=><p key={i}>Case {i+1}: {r.status} {r.feedback}</p>)}</details></div>)}<p className="text-xs text-neutral-500">Showing this topic within your 100 most recent submissions. Best scores include earlier attempts.</p></div></details>
    <Link className="block underline" href="/mock-interview">Practise explaining what you learned</Link>
   </article>:loaded?<p>Select a topic to begin.</p>:null}
  </div>
 </div>;
}
