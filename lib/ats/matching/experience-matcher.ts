import { textDemonstratesSkill } from "../taxonomy/text-skills";
/**
 * Experience & Seniority Alignment Engine (Milestone 6)
 * Calculates candidate experience years, role relevance, & seniority compatibility.
 */

import { UnifiedParsedResume } from "../parser/resume-parser";
import { StructuredJobDescription, SeniorityLevel } from "../types";

export interface ExperienceMatchResult {
  totalYearsCandidate: number;
  relevantYearsCandidate: number;
  isMinYearsSatisfied: boolean;
  seniorityAlignmentScore: number; // 0-100
  experienceScore: number; // 0-100
  evidenceText?: string;
  notes: string[];
}

export function experienceMonth(value: string, end = false): number | null {
  const now = new Date();
  if (/present|current|now/i.test(value)) return now.getUTCFullYear() * 12 + now.getUTCMonth() + 1;
  const year = Number(value.match(/\b(?:19|20)\d{2}\b/)?.[0]);
  if (!year) return null;
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const named = months.findIndex(month => value.toLowerCase().includes(month));
  const numeric = value.match(/(?:19|20)\d{2}[-/](\d{1,2})/);
  const month = named >= 0 ? named : numeric ? Number(numeric[1]) - 1 : 0;
  if (month < 0 || month > 11) return null;
  return year * 12 + month + (end && (named >= 0 || numeric) ? 1 : 0);
}

export function calculateTotalExperienceYears(resume: UnifiedParsedResume): number {
  const now = experienceMonth("Present")!;
  const intervals = resume.experiences.map(entry => {
    const start = experienceMonth(entry.startDate), end = experienceMonth(entry.endDate, true);
    return start !== null && end !== null && start <= now && end > start ? [start, Math.min(end, now)] as const : null;
  }).filter((interval): interval is readonly [number, number] => interval !== null).sort((a, b) => a[0] - b[0]);
  if (!intervals.length) return 0;
  let [start, end] = intervals[0]; let months = 0;
  for (const [nextStart, nextEnd] of intervals.slice(1)) {
    if (nextStart <= end) end = Math.max(end, nextEnd);
    else { months += end - start; start = nextStart; end = nextEnd; }
  }
  return Math.round((months + end - start) / 12 * 10) / 10;
}

export function evaluateExperienceRelevance(
  resume: UnifiedParsedResume,
  jd: StructuredJobDescription,
): ExperienceMatchResult {
  const notes: string[] = [];

  const totalYearsCandidate = calculateTotalExperienceYears(resume);
  const relevantExperiences=resume.experiences.filter(e=>{
    if(/\bprofessional\b/i.test(jd.rawText) && /intern|trainee|apprentice/i.test(e.role))return false;
    const text=[e.role,e.description,...e.bullets].join(" ");
    if(jd.requiredSkills.some(skill=>textDemonstratesSkill(text,skill)))return true;
    const dataRole=/data|analyst|analytics/i.test(jd.title);
    return dataRole ? /data|analyst|analytics/i.test(e.role):/developer|engineer|programmer|software/i.test(jd.title) && /developer|engineer|programmer|software/i.test(e.role);
  });
  const relevantYearsCandidate=calculateTotalExperienceYears({...resume,experiences:relevantExperiences});
  const hasDatedExperience = relevantYearsCandidate > 0;
  if(relevantYearsCandidate<totalYearsCandidate)notes.push("Only dated roles with matching role or skill evidence contribute to relevant experience; projects are assessed separately.");
  const isMinYearsSatisfied =
    jd.minYearsExperience === 0 || relevantYearsCandidate >= jd.minYearsExperience;

  // Evaluate Seniority Alignment
  let seniorityAlignmentScore = 85;
  const candidateSeniority = detectCandidateSeniority(
    resume,
    totalYearsCandidate,
  );

  if (candidateSeniority === "UNKNOWN") {
    seniorityAlignmentScore = 50;
    notes.push(
      "Experience dates are not available to verify seniority alignment.",
    );
  } else if (
    jd.seniority === "SENIOR" &&
    (candidateSeniority === "STUDENT" || candidateSeniority === "ENTRY_LEVEL")
  ) {
    seniorityAlignmentScore = 45;
    notes.push(
      `Target role requires Senior level background, candidate has ${totalYearsCandidate} years experience.`,
    );
  } else if (jd.seniority === "MID_LEVEL" && candidateSeniority === "STUDENT") {
    seniorityAlignmentScore = 65;
    notes.push(`Target role requires Mid-level experience.`);
  } else {
    seniorityAlignmentScore = 95;
    notes.push(
      `Seniority level (${candidateSeniority}) is compatible with job requirement (${jd.seniority}).`,
    );
  }

  // Calculate Experience Relevance Score
  let experienceScore = hasDatedExperience
    ? 70
    : resume.experiences.length > 0
      ? 35
      : 20;
  if (jd.minYearsExperience === 0) {
    experienceScore = 50;
    notes.push("No professional experience minimum is stated; fresher project evidence is assessed separately.");
  } else if (isMinYearsSatisfied && hasDatedExperience) {
    experienceScore += 25;
  } else if (hasDatedExperience) {
    const ratio = relevantYearsCandidate / Math.max(1, jd.minYearsExperience);
    experienceScore = Math.round(ratio * 75);
  }

  experienceScore = Math.min(100, Math.max(20, experienceScore));

  const bestExp = resume.experiences[0];
  const evidenceText = bestExp
    ? [
        [bestExp.role, bestExp.company].filter(Boolean).join(" at "),
        [bestExp.startDate, bestExp.endDate].filter(Boolean).join(" - "),
      ]
        .filter(Boolean)
        .join(" (") + (bestExp.startDate || bestExp.endDate ? ")" : "")
    : "No work experience entries were found.";

  return {
    totalYearsCandidate,
    relevantYearsCandidate,
    isMinYearsSatisfied,
    seniorityAlignmentScore,
    experienceScore,
    evidenceText,
    notes,
  };
}

function detectCandidateSeniority(
  resume: UnifiedParsedResume,
  totalYears: number,
): SeniorityLevel {
  if (totalYears === 0) return "UNKNOWN";
  if (totalYears < 2) return "ENTRY_LEVEL";
  if (totalYears >= 5) return "SENIOR";
  return "MID_LEVEL";
}
