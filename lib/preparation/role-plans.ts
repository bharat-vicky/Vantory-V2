export const ROLE_PLANS = [
 {id:"frontend",title:"Frontend developer",topicIds:["software-frontend","software-api","software-testing","software-arrays","python-brackets","communication","aptitude-reasoning"]},
 {id:"backend",title:"Backend developer",topicIds:["software-api","software-db","python-frequency","software-arrays","python-intervals","software-testing","communication"]},
 {id:"analyst",title:"Data analyst",topicIds:["data-sql","sql-paid","python-frequency","data-quality","data-statistics","sql-monthly","data-dashboard","communication"]},
 {id:"data-engineer",title:"Data engineer",topicIds:["data-sql","sql-paid","sql-ranking","sql-monthly","python-frequency","software-api","software-db","software-testing","communication"]}
] as const;
export type PlanConfig = {roleId:string;durationDays:14|28};
type ProgressTask = {topicId:string;bestQuizScore?:number|null;bestExecutionScore?:number|null};
type PlanTopic = {id:string;title:string;exercise?:string};
export function validatePlan(value:unknown):PlanConfig {
 if(!value || typeof value!=="object" || Array.isArray(value))throw new Error("Choose a preparation role and pace.");
 const b=value as Record<string,unknown>;
 if(!ROLE_PLANS.some(r=>r.id===b.roleId) || ![14,28].includes(Number(b.durationDays)) || typeof b.durationDays!=="number")throw new Error("Choose a supported role and a 14 or 28 day plan.");
 return {roleId:b.roleId as string,durationDays:b.durationDays as 14|28};
}
export function readPlan(json:string|null|undefined,track:string):PlanConfig {
 try{return validatePlan(JSON.parse(json || ""));}catch{return {roleId:track==="DATA"?"analyst":"backend",durationDays:28};}
}
export function roleProgress(config:PlanConfig,topics:PlanTopic[],tasks:ProgressTask[]) {
 const role=ROLE_PLANS.find(r=>r.id===config.roleId) || ROLE_PLANS[1];
 const steps=role.topicIds.map((id,index)=>{
  const topic=topics.find(t=>t.id===id);if(!topic)throw new Error(`Plan topic missing: ${id}`);
  const task=tasks.find(t=>t.topicId===id);
  const knowledgeMet=(task?.bestQuizScore ?? -1)>=80;
  const executionMet=!!topic.exercise && task?.bestExecutionScore===100;
  return {topicId:id,title:topic.title,day:1+Math.floor(index*(config.durationDays-1)/(role.topicIds.length-1)),knowledgeMet,executionRequired:!!topic.exercise,executionMet,checked:knowledgeMet && (!topic.exercise || executionMet)};
 });
 const knowledge=steps.filter(s=>s.knowledgeMet).length,execution=steps.filter(s=>s.executionMet).length;
 const executionTotal=steps.filter(s=>s.executionRequired).length;
 return {steps,knowledge,knowledgeTotal:steps.length,execution,executionTotal,checked:steps.filter(s=>s.checked).length,nextTopicId:steps.find(s=>!s.checked)?.topicId ?? null};
}
