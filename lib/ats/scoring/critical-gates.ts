/**
 * Critical Requirement Gate System (Milestone 6)
 * Detects dealbreaker missing requirements & prevents high keyword scores from hiding critical gaps.
 */

import { UnifiedParsedResume } from "../parser/resume-parser";
import { StructuredJobDescription, CriticalGap } from "../types";
import { skillsInText } from "../taxonomy/text-skills";
import { evaluateSkillMatch } from "../taxonomy/skills";
import { calculateTotalExperienceYears, evaluateExperienceRelevance } from "../matching/experience-matcher";

export function evaluateCriticalGates(
  resume: UnifiedParsedResume,
  jd: StructuredJobDescription,
): CriticalGap[] {
  const gaps: CriticalGap[] = [];

  // 1. Critical Experience Gap Gate
  const totalYears = evaluateExperienceRelevance(resume,jd).relevantYearsCandidate;
  const hasUndatedExperience =
    resume.experiences.length > 0 && totalYears === 0;

  if (jd.minYearsExperience > 0 && totalYears < jd.minYearsExperience * 0.6) {
    gaps.push({
      title: hasUndatedExperience
        ? "Experience Dates Need Verification"
        : "Critical Experience Gap",
      requirementName: `${jd.minYearsExperience}+ Years Experience`,
      requiredDetail: `Job requires at least ${jd.minYearsExperience}+ years of experience.`,
      resumeDetail: hasUndatedExperience
        ? "Work experience is listed, but dates are missing so total duration cannot be verified."
        : `Resume shows ${totalYears} years of dated experience.`,
      impactDescription:
        "Significant reduction in candidate job match compatibility.",
      severity: hasUndatedExperience ? "HIGH" : "CRITICAL",
    });
  }

  // 2. Critical Mandatory Skills Gate
  const missingCriticalSkills: string[] = [];
  jd.requiredSkills.forEach((reqSkill) => {
    const match = evaluateSkillMatch(reqSkill, [...resume.skills, ...skillsInText(resume.rawText)]);
    if (match.matchType === "NOT_FOUND") {
      missingCriticalSkills.push(reqSkill);
    }
  });

  if (missingCriticalSkills.length >= 2) {
    gaps.push({
      title: "Missing Critical Required Skills",
      requirementName: missingCriticalSkills.join(", "),
      requiredDetail: `Job explicitly requires ${missingCriticalSkills.join(", ")}.`,
      resumeDetail: `No explicit evidence detected in resume skills or experience sections.`,
      impactDescription: "Missing primary technical stack requirements.",
      severity: "HIGH",
    });
  }

  return gaps;
}
