/**
 * Core Data Structures for Vantory AI Resume ATS & Job Match Analysis Engine (v2.1)
 */

export type RequirementType =
  | "REQUIRED"
  | "PREFERRED"
  | "RESPONSIBILITY"
  | "CONTEXT"
  | "UNKNOWN";
export type RequirementImportance = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type SkillMatchType =
  | "EXACT"
  | "NORMALIZED"
  | "ALIAS"
  | "SEMANTIC"
  | "PARTIAL"
  | "RELATED"
  | "NOT_FOUND"
  | "CONTRADICTED"
  | "UNKNOWN";

export type EvidenceLevel = "STRONG" | "MODERATE" | "WEAK" | "MISSING";

export type RequirementStatus =
  | "SATISFIED"
  | "PARTIAL"
  | "MISSING"
  | "RELATED"
  | "UNKNOWN"
  | "CONTRADICTED";

export type SeniorityLevel =
  | "UNKNOWN"
  | "STUDENT"
  | "ENTRY_LEVEL"
  | "JUNIOR"
  | "MID_LEVEL"
  | "SENIOR"
  | "LEAD"
  | "STAFF"
  | "PRINCIPAL"
  | "MANAGER"
  | "DIRECTOR";

export interface ExtractedRequirement {
  id: string;
  name: string;
  category: "skill" | "experience" | "education" | "certification" | "general";
  type: RequirementType;
  importance: RequirementImportance;
  minYears?: number;
  degreeRequired?: string;
  originalText: string;
}

export interface StructuredJobDescription {
  title: string;
  normalizedTitle: string;
  companyName?: string;
  seniority: SeniorityLevel;
  location?: string;
  workMode: "REMOTE" | "HYBRID" | "ON_SITE" | "UNKNOWN";
  minYearsExperience: number;
  requiredSkills: string[];
  preferredSkills: string[];
  requirements: ExtractedRequirement[];
  educationRequirement?: string;
  rawText: string;
}

export interface MatchedSkillEvidence {
  skillName: string;
  normalizedSkill: string;
  matchType: SkillMatchType;
  evidenceLevel: EvidenceLevel;
  requirementType: RequirementType;
  importance: RequirementImportance;
  evidenceText?: string;
  sourceSection?: string;
  sourceEntity?: string;
  confidence: number; // 0-100
}

export interface MatchedRequirementEvidence {
  requirementId: string;
  requirementName: string;
  type: RequirementType;
  importance: RequirementImportance;
  status: RequirementStatus;
  evidenceText?: string;
  sourceSection?: string;
  sourceEntity?: string;
  confidence: number; // 0-100
}

export interface CriticalGap {
  title: string;
  requirementName: string;
  requiredDetail: string;
  resumeDetail: string;
  impactDescription: string;
  severity: "CRITICAL" | "HIGH" | "MINOR";
}

export interface ScoreDeductionItem {
  deduction: number; // e.g. -8
  title: string;
  reason: string;
  category: "SKILLS" | "EXPERIENCE" | "ATS_PARSING" | "CONTENT_QUALITY";
}

export interface ImprovementSimulatorItem {
  id: string;
  title: string;
  points: number; // e.g. +4
  isTruthGuardRequired: boolean;
  skillName?: string;
  actionText: string;
}

export interface TruthGuardItem {
  skillName: string;
  reason: string;
  userConfirmedPossession?: boolean;
}

export interface BulletQualityFeedback {
  criteria?: import("@/lib/resume/bullet-feedback").BulletCriteria;
  issues?: string[];
  source?: {section:"experience"|"projects";itemIndex:number;bulletIndex:number};
  originalText: string;
  score: number; // 0-100
  verdict: "STRONG" | "BETTER" | "WEAK";
  suggestion: string;
}

export interface BulletQualityAudit {
  totalBullets: number;
  weakCount: number;
  betterCount: number;
  strongCount: number;
  bulletFeedback: BulletQualityFeedback[];
}

export interface KeywordStuffingAudit {
  riskLevel: "LOW" | "MODERATE" | "HIGH";
  repetitionRatio: number;
  flaggedKeywords: {
    keyword: string;
    count: number;
    contextualEvidenceCount: number;
  }[];
}

export interface ATSReportBreakdown {
  requiredQualifications: number; // 0-100
  skillsMatch: number; // 0-100
  experienceRelevance: number; // 0-100
  educationMatch: number; // 0-100
  preferredQualifications: number; // 0-100
  semanticAlignment: number; // 0-100
  seniorityAlignment: number; // 0-100
  locationAlignment: number; // 0-100
  keywordCoverage: number; // 0-100
  atsParseability: number; // 0-100
  resumeStructure: number; // 0-100
  contentImpactQuality: number; // 0-100
}

export interface ATSReportSnapshot {
  resumeId?: string;
  resumeRevision?: string;
  assessmentStatus?: "RULE_BASED" | "HISTORICAL_UNVALIDATED";
  unassessedDimensions?: string[];
  extractionPreview?: {experiences:unknown[];education:unknown[];skills:string[];sections:string[]};
  scanId?: string;
  atsCompatibilityScore: number; // 0-100 "ATS Compatibility Score"
  jobMatchScore: number; // 0-100 "Job Match Score"
  overallApplicationScore: number; // 0-100 (ATS 30% + JobMatch 70%)
  resumeQualityScore: number; // 0-100
  matchConfidenceScore: number; // 0-100
  confidenceLevel: "HIGH" | "MEDIUM" | "LOW";
  matchLabel:
    | "EXCELLENT_MATCH"
    | "STRONG_MATCH"
    | "MODERATE_MATCH"
    | "WEAK_MATCH"
    | "CRITICAL_GAPS";
  breakdown: ATSReportBreakdown;
  skillsTable: MatchedSkillEvidence[];
  requirementsTable: MatchedRequirementEvidence[];
  criticalGaps: CriticalGap[];
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  whyPointsLost: ScoreDeductionItem[];
  scoreImprovementSimulator: {
    currentScore: number;
    potentialScore: number;
    improvements: ImprovementSimulatorItem[];
  };
  truthGuardItems: TruthGuardItem[];
  bulletQualityAudit: BulletQualityAudit;
  keywordStuffingAudit: KeywordStuffingAudit;
  atsParseabilityAudit: {
    layoutAssessed?: boolean;
    textExtractable: boolean;
    standardHeadings: boolean;
    contactInfoDetected: boolean;
    datesDetected: boolean;
    skillsDetected: boolean;
    twoColumnLayoutDetected: boolean;
    iconsDetected: boolean;
    warnings: string[];
  };
  parserMetadata: {
    parseConfidence: number; // 0-100
    sectionsDetected: string[];
    nonStandardHeadings: string[];
    dateConsistency: "HIGH" | "MEDIUM" | "LOW";
  };
  scoringEngineVersion: string;
  taxonomyVersion: string;
  targetJobTitle: string;
  companyName?: string;
  jobDescriptionText: string;
  createdAt: string;
}
