/**
 * Education Matching Engine (Milestone 6)
 * Evaluates candidate degree, major, & equivalent field of study.
 */

import { UnifiedParsedResume } from "../parser/resume-parser";
import { StructuredJobDescription } from "../types";

export interface EducationMatchResult {
  isSatisfied: boolean;
  score: number; // 0-100
  degreeFound?: string;
  institutionFound?: string;
  evidenceText?: string;
  notes: string;
}

export function evaluateEducationMatch(
  resume: UnifiedParsedResume,
  jd: StructuredJobDescription,
): EducationMatchResult {
  if (!jd.educationRequirement) {
    return {
      isSatisfied: true,
      score: 50,
      notes: "The job description does not specify an education requirement.",
    };
  }

  if (resume.education.length === 0) {
    return {
      isSatisfied: false,
      score: 0,
      notes: `No education evidence was found for the stated requirement: ${jd.educationRequirement}`,
    };
  }

  const requirement = jd.educationRequirement.toLowerCase();
  const requiredDegree = requirement.match(
    /\b(bachelor|master|phd|doctorate|associate)\b/,
  )?.[0];
  const requiredFields = [
    "computer science",
    "software engineering",
    "engineering",
    "information technology",
    "mathematics",
    "physics",
  ].filter((field) => requirement.includes(field));
  const degreesByType: Record<string, string[]> = {
    bachelor: ["bachelor", "b.tech", "b.e.", "b.s.", "b.a."],
    master: ["master", "m.tech", "m.e.", "m.s.", "m.a."],
    phd: ["phd", "doctorate", "doctor of philosophy"],
    doctorate: ["phd", "doctorate", "doctor of philosophy"],
    associate: ["associate"],
  };
  const matchingEducation = resume.education.find((item) => {
    const candidate = `${item.degree} ${item.fieldOfStudy}`.toLowerCase();
    const degreeMatches =
      !requiredDegree ||
      degreesByType[requiredDegree].some((degree) =>
        candidate.includes(degree),
      );
    const fieldMatches =
      requiredFields.length === 0 ||
      requiredFields.some((field) => candidate.includes(field)) ||
      (requirement.includes("related field") &&
        /computer|software|engineering|technology|math|physics/i.test(
          candidate,
        ));
    return degreeMatches && fieldMatches;
  });
  const primaryEdu = matchingEducation || resume.education[0];
  const degreeText = [primaryEdu.degree, primaryEdu.fieldOfStudy]
    .filter(Boolean)
    .join(" in ");
  const isSatisfied = Boolean(matchingEducation);
  const score = isSatisfied ? 100 : 30;
  const notes = isSatisfied
    ? `Resume education evidence matches the stated requirement: ${jd.educationRequirement}.`
    : `The listed education could not be matched to the stated requirement: ${jd.educationRequirement}.`;

  return {
    isSatisfied,
    score,
    degreeFound: primaryEdu.degree,
    institutionFound: primaryEdu.institution,
    evidenceText:
      [degreeText, primaryEdu.institution].filter(Boolean).join(" — ") ||
      undefined,
    notes,
  };
}
