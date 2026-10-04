import {
  CandidateIntelligenceProfile,
  EvaluatedQuestion,
  FinalInterviewReport,
  InterviewSessionState,
  InterviewSetupConfig,
  QuestionEvaluation,
} from "./types";
import { buildInterviewContext } from "./context-builder";
import { QuestionGenerator } from "./question-generator";
import { AnswerEvaluator } from "./answer-evaluator";
import { DifficultyController } from "./difficulty-controller";
import { FollowUpEngine } from "./follow-up-engine";
import { ReportGenerator } from "./report-generator";

export class InterviewEngine {
  public static calculateQuestionTarget(durationMinutes: number): number {
    if (durationMinutes <= 10) return 6;
    if (durationMinutes <= 20) return 10;
    if (durationMinutes <= 30) return 14;
    return 18;
  }

  public static async initializeSession(
    sessionId: string,
    config: InterviewSetupConfig,
    resumeContentJson?: string,
    atsSnapshotJson?: string
  ): Promise<{
    state: InterviewSessionState;
    profile: CandidateIntelligenceProfile;
    openingQuestion: { questionText: string; category: string };
  }> {
    const profile = await buildInterviewContext(config, resumeContentJson, atsSnapshotJson);
    const totalQuestionsTarget = this.calculateQuestionTarget(config.durationMinutes);

    const state: InterviewSessionState = {
      sessionId,
      status: "ACTIVE",
      currentDifficulty: config.difficulty,
      globalProficiency: "Competent",
      domainProficiency: {},
      currentQuestionIndex: 1,
      totalQuestionsTarget,
      elapsedSeconds: 0,
      questionsAskedCount: 1,
      followUpCount: 0,
      coveredTopics: [],
      weakTopics: profile.weakAreas,
      strongTopics: profile.strongAreas,
    };

    const openingQuestion = await QuestionGenerator.generateNextQuestion({
      profile,
      interviewType: config.interviewType,
      difficulty: config.difficulty,
      interviewerStyle: config.interviewerStyle,
      questionIndex: 0,
      previousQuestions: [],
      previousAnswers: [],
      weakTopics: state.weakTopics,
      coveredTopics: state.coveredTopics,
    });

    state.coveredTopics.push(openingQuestion.category);

    return {
      state,
      profile,
      openingQuestion,
    };
  }

  public static async processCandidateAnswer(params: {
    sessionId: string;
    config: InterviewSetupConfig;
    profile: CandidateIntelligenceProfile;
    state: InterviewSessionState;
    currentQuestion: EvaluatedQuestion;
    candidateAnswerText: string;
    audioDurationSeconds?: number;
    allPreviousQuestions: EvaluatedQuestion[];
  }): Promise<{
    updatedState: InterviewSessionState;
    evaluatedQuestion: EvaluatedQuestion;
    nextQuestion?: { questionText: string; category: string; isFollowUp: boolean; parentId?: string };
    isInterviewComplete: boolean;
  }> {
    const {
      profile,
      config,
      state,
      currentQuestion,
      candidateAnswerText,
      audioDurationSeconds,
      allPreviousQuestions,
    } = params;

    // 1. Live Answer Evaluation
    const evaluation: QuestionEvaluation = await AnswerEvaluator.evaluateCandidateAnswer({
      questionText: currentQuestion.questionText,
      category: currentQuestion.category,
      candidateAnswerText,
      profile,
      difficulty: state.currentDifficulty,
      interviewerStyle: config.interviewerStyle,
    });

    const evaluatedQuestion: EvaluatedQuestion = {
      ...currentQuestion,
      candidateAnswerText,
      audioDurationSeconds,
      evaluation,
    };

    const allEvaluated = [...allPreviousQuestions.filter(q => q.id !== currentQuestion.id), evaluatedQuestion];

    // 2. Update Candidate Proficiency & Dynamic Difficulty
    const updatedGlobalProficiency = DifficultyController.calculateUpdatedProficiency(
      state.globalProficiency,
      allEvaluated.map((q) => q.evaluation!).filter(Boolean)
    );

    const updatedDifficulty = DifficultyController.calculateNextDifficulty(
      state.currentDifficulty,
      allEvaluated.map((q) => q.evaluation!).filter(Boolean)
    );

    const updatedDomainProficiency = DifficultyController.updateDomainProficiency(
      state.domainProficiency,
      currentQuestion.category,
      evaluation
    );

    // Track Weak vs Strong topics
    const updatedWeakTopics = [...state.weakTopics];
    const updatedStrongTopics = [...state.strongTopics];
    if (evaluation.overallScore < 70 && !updatedWeakTopics.includes(currentQuestion.category)) {
      updatedWeakTopics.push(currentQuestion.category);
    } else if (evaluation.overallScore >= 80 && !updatedStrongTopics.includes(currentQuestion.category)) {
      updatedStrongTopics.push(currentQuestion.category);
    }

    // 3. Check Duration & Question Budget Limits
    const nextQuestionIndex = state.currentQuestionIndex + 1;
    const isBudgetExhausted = nextQuestionIndex > state.totalQuestionsTarget || state.elapsedSeconds >= config.durationMinutes * 60;

    if (isBudgetExhausted) {
      const updatedState: InterviewSessionState = {
        ...state,
        status: "COMPLETED",
        currentDifficulty: updatedDifficulty,
        globalProficiency: updatedGlobalProficiency,
        domainProficiency: updatedDomainProficiency,
        currentQuestionIndex: nextQuestionIndex,
        weakTopics: updatedWeakTopics,
        strongTopics: updatedStrongTopics,
      };

      return {
        updatedState,
        evaluatedQuestion,
        isInterviewComplete: true,
      };
    }

    // 4. Multi-Turn Follow-Up Probing Engine
    const shouldTriggerFollowUp = FollowUpEngine.shouldTriggerFollowUp({
      candidateAnswerText,
      evaluation,
      followUpCount: state.followUpCount,
    });

    let nextQuestionData: { questionText: string; category: string; isFollowUp: boolean; parentId?: string };
    let newFollowUpCount = state.followUpCount;

    if (shouldTriggerFollowUp) {
      const followUp = await FollowUpEngine.generateFollowUpQuestion({
        questionText: currentQuestion.questionText,
        category: currentQuestion.category,
        candidateAnswerText,
        evaluation,
        profile,
      });

      nextQuestionData = {
        questionText: followUp.questionText,
        category: followUp.category,
        isFollowUp: true,
        parentId: currentQuestion.id,
      };
      newFollowUpCount++;
    } else {
      const regularNext = await QuestionGenerator.generateNextQuestion({
        profile,
        interviewType: config.interviewType,
        difficulty: updatedDifficulty,
        interviewerStyle: config.interviewerStyle,
        questionIndex: nextQuestionIndex - 1,
        previousQuestions: allEvaluated.map((q) => q.questionText),
        previousAnswers: allEvaluated.map((q) => q.candidateAnswerText || ""),
        weakTopics: updatedWeakTopics,
        coveredTopics: state.coveredTopics,
      });

      nextQuestionData = {
        questionText: regularNext.questionText,
        category: regularNext.category,
        isFollowUp: false,
      };
    }

    const updatedState: InterviewSessionState = {
      ...state,
      status: "WAITING_FOR_CANDIDATE",
      currentDifficulty: updatedDifficulty,
      globalProficiency: updatedGlobalProficiency,
      domainProficiency: updatedDomainProficiency,
      currentQuestionIndex: nextQuestionIndex,
      questionsAskedCount: state.questionsAskedCount + 1,
      followUpCount: newFollowUpCount,
      weakTopics: updatedWeakTopics,
      strongTopics: updatedStrongTopics,
      coveredTopics: Array.from(new Set([...state.coveredTopics, nextQuestionData.category])),
    };

    return {
      updatedState,
      evaluatedQuestion,
      nextQuestion: nextQuestionData,
      isInterviewComplete: false,
    };
  }

  public static finalizeReport(params: {
    sessionId: string;
    profile: CandidateIntelligenceProfile;
    allEvaluatedQuestions: EvaluatedQuestion[];
    previousAverage?: number;
  }): FinalInterviewReport {
    return ReportGenerator.generateFinalReport({
      sessionId: params.sessionId,
      profile: params.profile,
      evaluatedQuestions: params.allEvaluatedQuestions,
      previousAverage: params.previousAverage,
    });
  }
}
