/**
 * Rule-based Resume & Job Match Analysis Engine (v3.1)
 * Evaluates:
 * 1. Text/structure comparison; visual layout is unassessed; absent work history is not penalized
 * 2. Job Match Score (40% Required Skills, 15% Preferred, 10% Coverage, 10% Evidence, 10% Responsibilities, 5% Exp, 5% Title, 5% Edu)
 * 3. Overall Application Score (30% ATS Compatibility + 70% Job Match)
 * 4. Qualitative explanations of match gaps
 * 5. Score Improvement Simulator (Actionable expected gains)
 * 6. Truth Guard System (Prevents fabricated skills/metrics)
 * 7. Rule-based bullet writing checks (contribution, scope, method and checks)
 * 8. Keyword Stuffing Detection (Contextual evidence ratio)
 */

import { assessBullet, normalizedBulletScore } from "@/lib/resume/bullet-feedback";
import { skillPattern } from "../taxonomy/text-skills";
import { UnifiedParsedResume } from "../parser/resume-parser";
import {
  StructuredJobDescription,
  ATSReportSnapshot,
  ATSReportBreakdown,
  ScoreDeductionItem,
  ImprovementSimulatorItem,
  TruthGuardItem,
  BulletQualityAudit,
  BulletQualityFeedback,
  KeywordStuffingAudit,
} from "../types";
import { extractEvidence } from "../evidence/evidence-engine";
import { evaluateExperienceRelevance } from "../matching/experience-matcher";
import { evaluateEducationMatch } from "../matching/education-matcher";
import { evaluateCriticalGates } from "./critical-gates";

export function generateATSReportSnapshot(
  resume: UnifiedParsedResume,
  jd: StructuredJobDescription,
  scanId?: string,
  simulate = true,
): ATSReportSnapshot {
  // 1. Extract Evidence & Match Tables
  const evidenceRes = extractEvidence(
    resume,
    jd.requiredSkills,
    jd.preferredSkills,
    jd.minYearsExperience,
    jd.educationRequirement,
  );

  // 2. Evaluate Experience & Education
  const expRes = evaluateExperienceRelevance(resume, jd);
  const eduRes = evaluateEducationMatch(resume, jd);

  // 3. Evaluate Critical Gates
  const criticalGaps = evaluateCriticalGates(resume, jd);

  // 4. Achievement Bullet Quality Audit
  const bulletQualityAudit = analyzeBulletQuality(resume);

  // 5. Keyword Stuffing Audit
  const keywordStuffingAudit = analyzeKeywordStuffing(resume, jd);

  // 6. Calculate Detailed Match Metrics
  const requiredSkillsCount = jd.requiredSkills.length;
  const requiredSkillEvidence = evidenceRes.skillsTable.filter(
    (skill) => skill.requirementType === "REQUIRED",
  );
  const requiredQualificationsScore =
    requiredSkillsCount > 0
      ? Math.round(
          (requiredSkillEvidence.reduce(
            (score, skill) => score + skillMatchCredit(skill.matchType),
            0,
          ) /
            requiredSkillsCount) *
            100,
        )
      : 50;

  const preferredSkillsCount = jd.preferredSkills.length;
  const preferredSkillEvidence = evidenceRes.skillsTable.filter(
    (skill) => skill.requirementType === "PREFERRED",
  );
  const preferredQualificationsScore =
    preferredSkillsCount > 0
      ? Math.round(
          (preferredSkillEvidence.reduce(
            (score, skill) => score + skillMatchCredit(skill.matchType),
            0,
          ) /
            preferredSkillsCount) *
            100,
        )
      : 50;

  const skillsMatchScore =
    requiredSkillsCount > 0 && preferredSkillsCount > 0
      ? Math.round(
          requiredQualificationsScore * 0.75 +
            preferredQualificationsScore * 0.25,
        )
      : requiredSkillsCount > 0
        ? requiredQualificationsScore
        : preferredSkillsCount > 0
          ? preferredQualificationsScore
          : 50;

  const totalReqPref = requiredSkillsCount + preferredSkillsCount;
  const matchedRequiredSkills = requiredSkillEvidence.filter(
    (skill) => skillMatchCredit(skill.matchType) > 0,
  );
  const matchedPreferredSkills = preferredSkillEvidence.filter(
    (skill) => skillMatchCredit(skill.matchType) > 0,
  );
  const keywordCoverageScore =
    totalReqPref > 0
      ? Math.min(
          100,
          Math.round(
            ((matchedRequiredSkills.reduce(
              (score, skill) => score + skillMatchCredit(skill.matchType),
              0,
            ) +
              matchedPreferredSkills.reduce(
                (score, skill) => score + skillMatchCredit(skill.matchType),
                0,
              )) /
              totalReqPref) *
              100,
          ),
        )
      : 50;

  // Skill Evidence Score: ratio of skills with STRONG evidence vs WEAK
  const strongEvidenceCount = evidenceRes.skillsTable.filter(
    (s) => s.evidenceLevel === "STRONG",
  ).length;
  const skillEvidenceScore =
    evidenceRes.skillsTable.length > 0
      ? Math.min(
          100,
          Math.round(
            (strongEvidenceCount / evidenceRes.skillsTable.length) * 100 + 20,
          ),
        )
      : 50;

  // Responsibilities & Title Alignment
  const titleAlignmentScore = calculateTitleAlignment(
    resume.headline || "",
    jd.title,
  );
  const responsibilitiesScore = Math.round(
    requiredQualificationsScore * 0.6 + expRes.experienceScore * 0.4,
  );

  // 7. ATS Compatibility Score Calculation
  // 35% Parsing, 20% Sections, 20% Formatting Safety, 10% Contact, 10% Dates, 5% Extraction
  const contactDetected = Boolean(resume.email && resume.phone);
  const datesDetected =
    resume.experiences.length > 0 &&
    resume.experiences.every((e) => Boolean(e.startDate && e.endDate));
  // Extracted text has no geometry. Whitespace cannot establish column layout.
  const hasTwoColumnLayout = false;
  const hasIcons = false;

  const parsingQuality = Math.max(0, Math.min(100, resume.parseConfidence));
  const essentialSections = [resume.sectionsDetected.includes("Education"), resume.sectionsDetected.includes("Skills"), resume.sectionsDetected.some(s => s === "Experience" || s === "Projects")];
  const sectionDetection = Math.round(essentialSections.filter(Boolean).length / essentialSections.length * 100);
  const contactDetectionScore = resume.email ? 100 : 0;
  const dateParsingScore = datesDetected ? 100 : 70;
  const textExtractionScore = resume.rawText.trim() ? 100 : 0;

  const compatibilityWeights: Array<[number,number]> = [[parsingQuality,35],[sectionDetection,20],[contactDetectionScore,10],[textExtractionScore,5]];
  if (resume.experiences.length) compatibilityWeights.push([dateParsingScore,10]);
  const atsCompatibilityScore = resume.rawText.trim() ? Math.round(compatibilityWeights.reduce((sum,[score,weight])=>sum+score*weight,0)/compatibilityWeights.reduce((sum,[,weight])=>sum+weight,0)) : 0;

  // 8. Job Match Score Calculation
  // 40% Required Skills, 15% Preferred, 10% Coverage, 10% Evidence, 10% Responsibilities, 5% Exp, 5% Title, 5% Edu
  const assessedWeights: Array<[number,number]> = [];
  if (requiredSkillsCount) assessedWeights.push([requiredQualificationsScore,40],[skillEvidenceScore,15],[keywordCoverageScore,10]);
  if (preferredSkillsCount) assessedWeights.push([preferredQualificationsScore,15]);
  if (jd.minYearsExperience>0) assessedWeights.push([expRes.experienceScore,15]);
  if (jd.educationRequirement) assessedWeights.push([eduRes.score,10]);
  if (resume.headline && jd.title) assessedWeights.push([titleAlignmentScore,5]);
  let rawJobMatchScore = resume.rawText.trim() && assessedWeights.length ? Math.round(assessedWeights.reduce((a,[score,w])=>a+score*w,0)/assessedWeights.reduce((a,[,w])=>a+w,0)) : 0;

  // Critical Gate Penalty
  if (criticalGaps.some((g) => g.severity === "CRITICAL")) {
    rawJobMatchScore = Math.min(rawJobMatchScore, 68);
  } else if (criticalGaps.length > 0) {
    rawJobMatchScore = Math.min(rawJobMatchScore, 78);
  }

  const jobMatchScore = Math.min(98, Math.max(0, rawJobMatchScore));

  // 9. Overall Application Score (30% ATS + 70% Job Match)
  const overallApplicationScore = Math.round(
    atsCompatibilityScore * 0.3 + jobMatchScore * 0.7,
  );

  const bulletScore = normalizedBulletScore(bulletQualityAudit.bulletFeedback);
  const resumeQualityScore = resume.rawText.trim() ? Math.round(atsCompatibilityScore * 0.4 + bulletScore * 0.6) : 0;

  const breakdown: ATSReportBreakdown = {
    requiredQualifications: requiredQualificationsScore,
    skillsMatch: skillsMatchScore,
    experienceRelevance: expRes.experienceScore,
    educationMatch: eduRes.score,
    preferredQualifications: preferredQualificationsScore,
    semanticAlignment: Math.round(
      (requiredQualificationsScore + expRes.experienceScore) / 2,
    ),
    seniorityAlignment: expRes.seniorityAlignmentScore,
    locationAlignment: resume.location && jd.location ? (resume.location.toLowerCase().includes(jd.location.toLowerCase()) ? 100 : 0) : 0,
    keywordCoverage: keywordCoverageScore,
    atsParseability: atsCompatibilityScore,
    resumeStructure: sectionDetection,
    contentImpactQuality: bulletScore,
  };

  // 10. "Why Did I Lose Points?" Deductions
  const whyPointsLost = calculateWhyPointsLost(
    jd,
    evidenceRes,
    criticalGaps,
    bulletQualityAudit,
    titleAlignmentScore,
    hasTwoColumnLayout,
    hasIcons,
  );

  // 11. Score Improvement Simulator & Truth Guard Items
  const { simulator, truthGuardItems } = generateScoreSimulator(
    jd,
    evidenceRes,
    bulletQualityAudit,
    overallApplicationScore,
    resume,
    simulate,
  );

  // Match Confidence & Label
  const matchConfidenceScore = !resume.rawText.trim() ? 0 : Math.round(
    (resume.parseConfidence +
      (jd.requiredSkills.length > 0 || jd.preferredSkills.length > 0
        ? 85
        : 50)) /
      2,
  );
  const confidenceLevel =
    matchConfidenceScore >= 85
      ? "HIGH"
      : matchConfidenceScore >= 65
        ? "MEDIUM"
        : "LOW";

  let matchLabel: ATSReportSnapshot["matchLabel"] = "STRONG_MATCH";
  if (criticalGaps.some((g) => g.severity === "CRITICAL"))
    matchLabel = "CRITICAL_GAPS";
  else if (overallApplicationScore >= 90) matchLabel = "EXCELLENT_MATCH";
  else if (overallApplicationScore >= 80) matchLabel = "STRONG_MATCH";
  else if (overallApplicationScore >= 65) matchLabel = "MODERATE_MATCH";
  else matchLabel = "WEAK_MATCH";

  const recommendations = generateRecommendations(
    jd,
    evidenceRes,
    criticalGaps,
    bulletQualityAudit,
  );

  return {
    scanId,
    assessmentStatus:"RULE_BASED",
    unassessedDimensions:["layoutGeometry","semanticAlignment","locationAlignment",...(jd.minYearsExperience===0 ? ["experienceRelevance","seniorityAlignment"]:[]),...(!jd.educationRequirement?["educationMatch"]:[]),...(!jd.preferredSkills.length?["preferredQualifications"]:[])],
    extractionPreview:{experiences:resume.experiences,education:resume.education,skills:resume.skills,sections:resume.sectionsDetected},
    atsCompatibilityScore,
    jobMatchScore,
    overallApplicationScore,
    resumeQualityScore,
    matchConfidenceScore,
    confidenceLevel,
    matchLabel,
    breakdown,
    skillsTable: evidenceRes.skillsTable,
    requirementsTable: evidenceRes.requirementsTable,
    criticalGaps,
    strengths: evidenceRes.strengths,
    gaps: evidenceRes.gaps,
    recommendations,
    whyPointsLost:whyPointsLost.map(item=>({...item,deduction:0})),
    scoreImprovementSimulator: simulator,
    truthGuardItems,
    bulletQualityAudit,
    keywordStuffingAudit,
    atsParseabilityAudit: {
      textExtractable: Boolean(resume.rawText.trim()),
      standardHeadings: resume.sectionsDetected.some((section) =>
        ["Experience", "Education", "Skills", "Projects", "Summary"].includes(
          section,
        ),
      ),
      contactInfoDetected: contactDetected,
      datesDetected,
      skillsDetected: resume.skills.length > 0,
      layoutAssessed: false,
      twoColumnLayoutDetected: hasTwoColumnLayout,
      iconsDetected: hasIcons,
      warnings: ["Column layout, visual reading order and icons were not assessed from extracted text.", ...criticalGaps.map((g) => g.title)],
    },
    parserMetadata: {
      parseConfidence: resume.parseConfidence,
      sectionsDetected: resume.sectionsDetected,
      nonStandardHeadings: resume.sectionsDetected.filter(
        (s) =>
          ![
            "Experience",
            "Education",
            "Skills",
            "Projects",
            "Summary",
          ].includes(s),
      ),
      dateConsistency: resume.dateConsistency,
    },
    scoringEngineVersion: "3.1.0",
    taxonomyVersion: "3.0.0",
    targetJobTitle: jd.title,
    companyName: jd.companyName,
    jobDescriptionText: jd.rawText,
    createdAt: new Date().toISOString(),
  };
}

function skillMatchCredit(matchType: string): number {
  if (
    matchType === "EXACT" ||
    matchType === "NORMALIZED" ||
    matchType === "ALIAS"
  ) {
    return 1;
  }
  return matchType === "PARTIAL" ? 0.5 : 0;
}

function calculateTitleAlignment(resumeTitle: string, jdTitle: string): number {
  if (!resumeTitle) return 0;
  const rLower = resumeTitle.toLowerCase();
  const jLower = jdTitle.toLowerCase();
  if (rLower === jLower) return 100;
  if (rLower.includes(jLower) || jLower.includes(rLower)) return 88;
  if (
    (rLower.includes("engineer") || rLower.includes("developer")) &&
    (jLower.includes("engineer") || jLower.includes("developer"))
  ) {
    return 80;
  }
  return 0;
}

function analyzeBulletQuality(resume: UnifiedParsedResume): BulletQualityAudit {
  const bulletFeedback:BulletQualityFeedback[] = [
    ...resume.experiences.flatMap((e,itemIndex) => e.bullets.map((text,bulletIndex) => ({...assessBullet(text),source:{section:"experience" as const,itemIndex,bulletIndex}}))),
    ...resume.projects.flatMap((p,itemIndex) => p.bullets.map((text,bulletIndex) => ({...assessBullet(text),source:{section:"projects" as const,itemIndex,bulletIndex}})))
  ];
  return {totalBullets:bulletFeedback.length,weakCount:bulletFeedback.filter(b=>b.verdict==="WEAK").length,betterCount:bulletFeedback.filter(b=>b.verdict==="BETTER").length,strongCount:bulletFeedback.filter(b=>b.verdict==="STRONG").length,bulletFeedback};
}

function analyzeKeywordStuffing(
  resume: UnifiedParsedResume,
  jd: StructuredJobDescription,
): KeywordStuffingAudit {
  const flaggedKeywords: KeywordStuffingAudit["flaggedKeywords"] = [];
  let stuffingCount = 0;

  const allSkills = [...jd.requiredSkills, ...jd.preferredSkills];
  const resumeText = resume.rawText.toLowerCase();

  allSkills.forEach((skill) => {
    const skillLower = skill.toLowerCase();
    const matches =
      resumeText.match(skillPattern(skillLower, "gi")) || [];
    const count = matches.length;

    if (count >= 5) {
      let contextualCount = 0;
      resume.experiences
        .flatMap((e) => e.bullets)
        .concat(resume.projects.flatMap((p) => p.bullets))
        .forEach((b) => {
          if (b.toLowerCase().includes(skillLower)) contextualCount++;
        });

      if (count > contextualCount + 3) {
        stuffingCount++;
        flaggedKeywords.push({
          keyword: skill,
          count,
          contextualEvidenceCount: contextualCount,
        });
      }
    }
  });

  return {
    riskLevel:
      stuffingCount > 2 ? "HIGH" : stuffingCount > 0 ? "MODERATE" : "LOW",
    repetitionRatio: stuffingCount,
    flaggedKeywords,
  };
}

function calculateWhyPointsLost(
  jd: StructuredJobDescription,
  evidenceRes: ReturnType<typeof extractEvidence>,
  criticalGaps: ReturnType<typeof evaluateCriticalGates>,
  bulletQuality: BulletQualityAudit,
  titleAlignment: number,
  hasTwoColumnLayout: boolean,
  hasIcons: boolean,
): ScoreDeductionItem[] {
  const list: ScoreDeductionItem[] = [];

  // Missing Required Skills
  const missingReqs = evidenceRes.skillsTable.filter(
    (s) => s.requirementType === "REQUIRED" && s.matchType === "NOT_FOUND",
  );
  missingReqs.forEach((m) => {
    list.push({
      deduction: -6,
      title: `Missing Required Skill: ${m.skillName}`,
      reason: `The job explicitly requires ${m.skillName}, but no supporting evidence was found in your resume.`,
      category: "SKILLS",
    });
  });

  // Weak Skill Evidence (Listed in Skills section only)
  const weakEvidenceSkills = evidenceRes.skillsTable.filter(
    (s) => s.evidenceLevel === "WEAK" && s.requirementType === "REQUIRED",
  );
  weakEvidenceSkills.forEach((w) => {
    list.push({
      deduction: -3,
      title: `${w.skillName} Evidence Lacking`,
      reason: `${w.skillName} is listed in your Skills section, but lacks contextual evidence in Experience or Projects.`,
      category: "EXPERIENCE",
    });
  });

  // Critical Gaps
  if (criticalGaps.some((g) => g.severity === "CRITICAL")) {
    list.push({
      deduction: -10,
      title: "Critical Experience Gate Failure",
      reason: `Job requires ${jd.minYearsExperience}+ years of experience, but resume shows insufficient relevant timeline.`,
      category: "EXPERIENCE",
    });
  }

  // Bullet Quality
  if (bulletQuality.weakCount >= 2) {
    list.push({
      deduction: -4,
      title: `${bulletQuality.weakCount} Weak Achievement Bullets`,
      reason: `Several experience bullets lack strong action verbs, technical scope, or measurable metrics.`,
      category: "CONTENT_QUALITY",
    });
  }

  // Formatting Risks
  if (hasTwoColumnLayout) {
    list.push({
      deduction: -3,
      title: "Two-Column Layout Parsing Risk",
      reason:
        "Two-column PDF layouts may cause automated ATS parsers to misorder experience lines.",
      category: "ATS_PARSING",
    });
  }

  if (hasIcons) {
    list.push({
      deduction: -2,
      title: "Non-standard Icons Detected",
      reason:
        "Icons near contact information or section headers can disrupt plain-text ATS parsers.",
      category: "ATS_PARSING",
    });
  }

  // Title Alignment
  if (titleAlignment < 85) {
    list.push({
      deduction: -3,
      title: "Job Title Partial Alignment",
      reason: `Resume title '${jd.title}' is only partially aligned with target job title.`,
      category: "EXPERIENCE",
    });
  }

  return list;
}

function generateScoreSimulator(
  jd: StructuredJobDescription,
  evidenceRes: ReturnType<typeof extractEvidence>,
  bulletQuality: BulletQualityAudit,
  currentScore: number,
  resume: UnifiedParsedResume,
  simulate:boolean,
) {
  const improvements: ImprovementSimulatorItem[] = [];
  const truthGuardItems: TruthGuardItem[] = [];
  let potentialGain = 0;

  // 1. Missing Required Skills
  const missingReqs = evidenceRes.skillsTable.filter(
    (s) =>
      s.requirementType === "REQUIRED" &&
      (s.matchType === "NOT_FOUND" || s.matchType === "RELATED"),
  );

  missingReqs.forEach((m) => {
    const hypothetical={...resume,skills:[...resume.skills,m.skillName],rawText:resume.rawText+"\nSkills: "+m.skillName};
    const points = simulate ? Math.max(0,generateATSReportSnapshot(hypothetical,jd,undefined,false).overallApplicationScore-currentScore):0;
    potentialGain += points;
    improvements.push({
      id: `imp-${m.skillName}`,
      title: `Add genuine ${m.skillName} project or work evidence`,
      points,
      isTruthGuardRequired: true,
      skillName: m.skillName,
      actionText: `If you have used ${m.skillName}, add it to your experience bullets or projects section.`,
    });

    truthGuardItems.push({
      skillName: m.skillName,
      reason: `${m.skillName} is an important job requirement, but no supporting evidence was found in your resume.`,
    });
  });

  // 2. Upgrade Weak Skills
  const weakSkills = evidenceRes.skillsTable.filter(
    (s) => s.evidenceLevel === "WEAK" && s.requirementType === "REQUIRED",
  );
  if (weakSkills.length > 0) {
    const points = 0;
    potentialGain += points;
    improvements.push({
      id: "imp-weak-evidence",
      title: `Demonstrate ${weakSkills[0].skillName} in an experience bullet`,
      points,
      isTruthGuardRequired: false,
      skillName: weakSkills[0].skillName,
      actionText: `Move ${weakSkills[0].skillName} from just your Skills list into an actual project or work description.`,
    });
  }

  // 3. Improve Weak Bullets
  if (bulletQuality.weakCount > 0) {
    const points = 0;
    potentialGain += points;
    improvements.push({
      id: "imp-bullets",
      title: `Review factual wording in ${Math.min(3, bulletQuality.weakCount)} weak experience bullets`,
      points,
      isTruthGuardRequired: false,
      actionText:
        "Clarify your actual contribution and how you verified it. Add a metric only if you can substantiate it, then rescan.",
    });
  }

  const potentialScore = Math.min(100,currentScore+Math.max(0,...improvements.map(i=>i.points)));

  return {
    simulator: {
      currentScore,
      potentialScore,
      improvements,
    },
    truthGuardItems,
  };
}

function generateRecommendations(
  jd: StructuredJobDescription,
  evidenceRes: ReturnType<typeof extractEvidence>,
  criticalGaps: ReturnType<typeof evaluateCriticalGates>,
  bulletQuality: BulletQualityAudit,
): string[] {
  const recs: string[] = [];

  if (criticalGaps.length > 0) {
    criticalGaps.forEach((cg) => {
      recs.push(
        `Priority Fix (${cg.severity}): ${cg.requiredDetail} ${cg.impactDescription}`,
      );
    });
  }

  const missingSkills = evidenceRes.skillsTable.filter(
    (s) => s.requirementType === "REQUIRED" && s.matchType === "NOT_FOUND",
  );
  if (missingSkills.length > 0) {
    recs.push(
      `Core Requirement Missing: The job requires ${missingSkills
        .slice(0, 3)
        .map((s) => s.skillName)
        .join(
          ", ",
        )}. If you genuinely possess hands-on experience, confirm possession and add verifiable evidence to your experience section.`,
    );
  }

  if (bulletQuality.weakCount >= 2) {
    recs.push(
      `Bullet Quality: ${bulletQuality.weakCount} project or experience bullets need clearer contributions, scope or checks. Explain actual work and how it was verified; add metrics only when supported.`,
    );
  }

  if (recs.length === 0) {
    recs.push(
      "Your resume shows strong alignment with this position. Maintain standard section headings and ensure your contact details remain up to date.",
    );
  }

  return recs;
}
