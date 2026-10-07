import { CandidateIntelligenceProfile, InterviewerStyle, QuestionEvaluation } from "./types";
import { defaultAIProvider } from "./ai-provider";

export class FollowUpEngine {
  public static shouldTriggerFollowUp(params: {
    candidateAnswerText: string;
    evaluation: QuestionEvaluation;
    followUpCount: number;
    maxFollowUpsAllowed?: number;
  }): boolean {
    const { evaluation, followUpCount, maxFollowUpsAllowed = 3 } = params;

    if (params.candidateAnswerText.trim() === "I would like to pass this question and move to the next topic.") return false;

    if (followUpCount >= maxFollowUpsAllowed) return false;

    // Probe concrete omissions or unsupported claims, not response length.
    if (evaluation.credibilityConcern) return true;
    if (!evaluation.missingElements.length) return false;
    const applicable = evaluation.assessedDimensions || [];
    if (applicable.includes("depth") && evaluation.depth < 70) return true;
    if (applicable.includes("completeness") && evaluation.completeness < 65) return true;
    if (applicable.includes("technicalAccuracy") && evaluation.technicalAccuracy < 70) return true;

    return false;
  }

  public static async generateFollowUpQuestion(params: {
    questionText: string;
    category: string;
    candidateAnswerText: string;
    evaluation: QuestionEvaluation;
    profile: CandidateIntelligenceProfile;
    interviewerStyle?: InterviewerStyle;
  }): Promise<{ questionText: string; category: string }> {
    const aiFollowUp = await defaultAIProvider.generateFollowUp({
      questionText: params.questionText,
      candidateAnswerText: params.candidateAnswerText,
      evaluation: params.evaluation,
      profile: params.profile,
      interviewerStyle: params.interviewerStyle || "Professional",
    });

    if (aiFollowUp) {
      return aiFollowUp;
    }

    // Default follow-up probing template
    return {
      questionText: `Clarify which part you personally did, how you checked the result, and any limitations of your previous answer.`,
      category: `${params.category} (Follow-Up)`,
    };
  }
}
