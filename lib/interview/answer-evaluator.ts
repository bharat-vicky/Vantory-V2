import {
  CandidateIntelligenceProfile,
  DifficultyLevel,
  InterviewerStyle,
  QuestionEvaluation,
} from "./types";
import { defaultAIProvider } from "./ai-provider";
import { isPassedAnswer } from "./turns";

export class AnswerEvaluator {
  public static async evaluateCandidateAnswer(params: {
    questionText: string;
    category: string;
    candidateAnswerText: string;
    profile: CandidateIntelligenceProfile;
    difficulty: DifficultyLevel;
    interviewerStyle: InterviewerStyle;
  }): Promise<QuestionEvaluation> {
    if (isPassedAnswer(params.candidateAnswerText)) {
      // Explicit absence earns no answer credit and needs no provider request.
      // Do not treat the clarity of a skip request as interview evidence.
      return {technicalAccuracy:0,relevance:0,depth:0,completeness:0,evidenceScore:0,communication:0,problemSolving:0,overallScore:0,
        feedback:"You passed this question. No answer was supplied; it counts as 0 in this practice score.",
        strengths:[],missingElements:["No answer supplied"],improvementSuggestions:["Review this question and practise an answer."],exampleAnswerStructure:"",credibilityConcern:false,evidenceQuotes:[],assessedDimensions:["relevance"],assessmentVersion:"rubric.v2",provider:"practice-pass"};
    }
    return await defaultAIProvider.evaluateAnswer({
      questionText: params.questionText,
      category: params.category,
      candidateAnswerText: params.candidateAnswerText,
      profile: params.profile,
      difficulty: params.difficulty,
      interviewerStyle: params.interviewerStyle,
    });
  }
}
