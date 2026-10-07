import { CandidateIntelligenceProfile, EvaluatedQuestion, FinalInterviewReport } from "./types";
import { textDemonstratesSkill } from "../ats/taxonomy/text-skills";
import { interviewPracticePlan } from "@/lib/preparation/plan";
import { questionRubric } from "./question-library";
const mean = (values: number[]) => values.length ? Math.round(values.reduce((a,b)=>a+b,0)/values.length) : null;
export class ReportGenerator {
  static generateFinalReport({sessionId, profile, evaluatedQuestions, previousAverage}: {sessionId:string;profile:CandidateIntelligenceProfile;evaluatedQuestions:EvaluatedQuestion[];previousAverage?:number}): FinalInterviewReport {
    const assessed = evaluatedQuestions.filter(q => ["rubric.v1","rubric.v2"].includes(q.evaluation?.assessmentVersion || "") && q.candidateAnswerText);
    const rootQuestion = (question:EvaluatedQuestion) => {
      let current=question;const visited=new Set([current.id]);
      while(current.isFollowUp && current.followUpParentId) {
        const parent=evaluatedQuestions.find(q=>q.id===current.followUpParentId);
        if(!parent || visited.has(parent.id)) return question;
        visited.add(parent.id);current=parent;
      }
      return current;
    };
    const skillFor = (q:EvaluatedQuestion) => q.evaluation?.assessedSkill || (q.isFollowUp ? questionRubric(rootQuestion(q).questionText)?.skill : undefined);
    const average = (key: keyof NonNullable<EvaluatedQuestion["evaluation"]>, category?: RegExp) => mean(assessed.filter(q => (!category || category.test(rootQuestion(q).category)) && q.evaluation!.assessedDimensions?.includes(key)).map(q => Number(q.evaluation![key])));
    const overallScore = mean(assessed.map(q => q.evaluation!.overallScore));
    const readinessLevel = overallScore === null ? "Not assessed" : overallScore>=90 ? "Excellent" : overallScore>=80 ? "Strong" : overallScore>=70 ? "Developing" : overallScore>=60 ? "Needs Preparation" : "Significant Preparation Needed";
    const improvements = [...new Set(assessed.flatMap(q=>q.evaluation!.improvementSuggestions))];
    return { sessionId,targetJobTitle:profile.targetJobTitle,companyName:profile.companyName,assessmentVersion:"rubric.v2",assessmentStatus:assessed.length ? "ASSESSED":"INSUFFICIENT_EVIDENCE",
      overallScore,readinessScore:overallScore,readinessLevel,
      categoryBreakdown:{technicalScore:average("technicalAccuracy"),communicationScore:average("communication"),roleAlignmentScore:average("relevance"),projectKnowledgeScore:average("evidenceScore",/Project|Resume/),behavioralScore:mean(assessed.filter(q=>/Behavioral/.test(rootQuestion(q).category)).map(q=>q.evaluation!.overallScore)),problemSolvingScore:average("problemSolving")},
      roleReadinessBreakdown:Object.fromEntries(profile.requiredSkills.map(s=>[s,mean(assessed.filter(q=>skillFor(q) && textDemonstratesSkill(skillFor(q)!,s) && q.evaluation!.assessedDimensions?.includes("technicalAccuracy")).map(q=>q.evaluation!.technicalAccuracy))])),
      strongestAreas:[...new Set(assessed.filter(q=>q.evaluation!.overallScore>=75).flatMap(q=>q.evaluation!.strengths))].slice(0,6),areasToImprove:improvements.slice(0,6),
      questionReviews:assessed.map(q=>({questionIndex:q.questionIndex,category:q.category,questionText:q.questionText,candidateAnswerText:q.candidateAnswerText!,score:q.evaluation!.overallScore,evaluation:q.evaluation!})),
      preparationPlan:interviewPracticePlan(assessed),
      historyProgression:{previousAverage:previousAverage ?? null,currentAverage:overallScore,improvement:overallScore!==null && previousAverage!==undefined ? overallScore-previousAverage:null}
    };
  }
}
