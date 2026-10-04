import { TOPICS } from "./curriculum";
import { textDemonstratesSkill } from "@/lib/ats/taxonomy/text-skills";
import type { EvaluatedQuestion, PreparationPlanDay } from "@/lib/interview/types";
import { questionRubric } from "@/lib/interview/question-library";

export function interviewPracticePlan(questions:EvaluatedQuestion[]):PreparationPlanDay[] {
  const plan = new Map<string,PreparationPlanDay>();
  for (const q of questions) {
    const e=q.evaluation;
    if (!e || !e.improvementSuggestions.length || e.overallScore>=85) continue;
    const rubric=questionRubric(q.questionText);
    const text=[q.questionText,...e.missingElements,...e.improvementSuggestions].join(" ");
    const matches=rubric ? TOPICS.filter(t=>t.id===rubric.topicId) : TOPICS.filter(t=>t.skills.some(s=>textDemonstratesSkill(text,s)));
    const topics=matches.length ? matches : TOPICS.filter(t=>t.id==="communication");
    for(const topic of topics.slice(0,2)) if(!plan.has(topic.id)) plan.set(topic.id,{day:plan.size+1,topic:topic.title,topicId:topic.id,sourceQuestionIndex:q.questionIndex,practiceUrl:`/preparation?topicId=${topic.id}`,whyItMatters:e.missingElements[0] || e.improvementSuggestions[0],whatToRevise:e.improvementSuggestions.slice(0,3),suggestedPractice:topic.practice,targetOutcome:topic.objective});
    if(plan.size>=7) break;
  }
  return [...plan.values()].slice(0,7);
}

export function bestForKind(previous:number|null|undefined,score:number) { return Math.max(previous ?? 0,score); }
