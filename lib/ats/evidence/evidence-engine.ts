/**
 * Evidence Engine for Vantory AI Resume ATS Engine (v2.1)
 * Scans candidate experience, projects, summary, & skills sections
 * to extract exact supporting evidence text snippets and classify evidence levels
 * as STRONG, MODERATE, WEAK, or MISSING.
 */

import { UnifiedParsedResume } from "../parser/resume-parser";
import {
  MatchedSkillEvidence,
  MatchedRequirementEvidence,
  RequirementStatus,
  EvidenceLevel,
} from "../types";
import { skillsInText, textDemonstratesSkill } from "../taxonomy/text-skills";
import { evaluateEducationMatch } from "../matching/education-matcher";
import { parseJobDescription } from "../parser/job-parser";
import { evaluateSkillMatch } from "../taxonomy/skills";
import { calculateTotalExperienceYears, evaluateExperienceRelevance } from "../matching/experience-matcher";

export interface EvidenceExtractionResult {
  skillsTable: MatchedSkillEvidence[];
  requirementsTable: MatchedRequirementEvidence[];
  strengths: string[];
  gaps: string[];
}

export function extractEvidence(
  resume: UnifiedParsedResume,
  requiredSkills: string[],
  preferredSkills: string[],
  minYearsRequired: number,
  educationRequirement?: string,
): EvidenceExtractionResult {
  const skillsTable: MatchedSkillEvidence[] = [];
  const requirementsTable: MatchedRequirementEvidence[] = [];
  const strengths: string[] = [];
  const gaps: string[] = [];

  // 1. Process Required Skills
  requiredSkills.forEach((reqSkill) => {
    const match = evaluateSkillMatch(reqSkill, [...resume.skills, ...skillsInText(resume.rawText)]);
    const evidence = findTextSnippetForSkill(reqSkill, resume);

    let evidenceLevel: EvidenceLevel = "MISSING";
    if (match.matchType === "NOT_FOUND") {
      evidenceLevel = "MISSING";
    } else if (
      evidence?.section === "Experience" ||
      evidence?.section === "Projects"
    ) {
      evidenceLevel = "STRONG";
    } else if (
      evidence?.section === "Certifications" ||
      evidence?.section === "Coursework"
    ) {
      evidenceLevel = "MODERATE";
    } else {
      evidenceLevel = "WEAK"; // Only in Skills list
    }

    let confidence = match.confidence;
    if (evidenceLevel === "STRONG") confidence = Math.min(100, confidence + 10);
    if (evidenceLevel === "WEAK") confidence = Math.max(50, confidence - 15);

    const item: MatchedSkillEvidence = {
      skillName: reqSkill,
      normalizedSkill: reqSkill,
      matchType: match.matchType,
      evidenceLevel,
      requirementType: "REQUIRED",
      importance: "HIGH",
      evidenceText:
        evidence?.snippet ||
        (match.matchType === "PARTIAL"
          ? `Partial text match with ${match.matchedSkillName || "a listed skill"}; exact qualification not confirmed.`
          : match.matchType !== "NOT_FOUND"
            ? "Listed in Skills section only"
            : undefined),
      sourceSection:
        evidence?.section ||
        (match.matchType !== "NOT_FOUND" ? "Skills" : undefined),
      sourceEntity: evidence?.entity,
      confidence,
    };

    skillsTable.push(item);

    if (evidenceLevel === "STRONG") {
      strengths.push(
        `Strong ${reqSkill} evidence found in ${evidence?.section} (${evidence?.entity || ""})`,
      );
    } else if (evidenceLevel === "WEAK") {
      gaps.push(
        `Skill ${reqSkill} is listed in Skills section but lacks contextual experience evidence.`,
      );
    } else if (match.matchType === "NOT_FOUND") {
      gaps.push(`Required skill ${reqSkill} not found anywhere in resume.`);
    } else if (match.matchType === "RELATED") {
      gaps.push(
        `Related skill ${match.matchedSkillName} found, but ${reqSkill} was not explicitly demonstrated.`,
      );
    } else if (match.matchType === "PARTIAL") {
      gaps.push(
        `Only a partial skill-name match was found for ${reqSkill}; confirm the exact technology before claiming a match.`,
      );
    }
  });

  // 2. Process Preferred Skills
  preferredSkills.forEach((prefSkill) => {
    const match = evaluateSkillMatch(prefSkill, [...resume.skills, ...skillsInText(resume.rawText)]);
    const evidence = findTextSnippetForSkill(prefSkill, resume);

    let evidenceLevel: EvidenceLevel = "MISSING";
    if (match.matchType === "NOT_FOUND") {
      evidenceLevel = "MISSING";
    } else if (
      evidence?.section === "Experience" ||
      evidence?.section === "Projects"
    ) {
      evidenceLevel = "STRONG";
    } else if (evidence?.section === "Certifications") {
      evidenceLevel = "MODERATE";
    } else {
      evidenceLevel = "WEAK";
    }

    const item: MatchedSkillEvidence = {
      skillName: prefSkill,
      normalizedSkill: prefSkill,
      matchType: match.matchType,
      evidenceLevel,
      requirementType: "PREFERRED",
      importance: "MEDIUM",
      evidenceText:
        evidence?.snippet ||
        (match.matchType === "PARTIAL"
          ? `Partial text match with ${match.matchedSkillName || "a listed skill"}; exact qualification not confirmed.`
          : match.matchType !== "NOT_FOUND"
            ? "Listed in Skills section"
            : undefined),
      sourceSection:
        evidence?.section ||
        (match.matchType !== "NOT_FOUND" ? "Skills" : undefined),
      sourceEntity: evidence?.entity,
      confidence: match.confidence,
    };

    skillsTable.push(item);

    if (evidenceLevel === "STRONG" || evidenceLevel === "MODERATE") {
      strengths.push(
        `Preferred skill ${prefSkill} demonstrated in ${evidence?.section || "Skills"}.`,
      );
    }
  });

  // 3. Process only requirements actually stated in the job description.
  if (minYearsRequired > 0) {
    const experienceJd=parseJobDescription(`${minYearsRequired}+ years of experience. Required: ${requiredSkills.join(", ")}`);
    const totalYears = evaluateExperienceRelevance(resume,experienceJd).relevantYearsCandidate;
    const hasUndatedExperience =
      resume.experiences.length > 0 && totalYears === 0;
    const expStatus: RequirementStatus =
      totalYears >= minYearsRequired
        ? "SATISFIED"
        : totalYears > 0
          ? "PARTIAL"
          : hasUndatedExperience
            ? "UNKNOWN"
            : "MISSING";
    const firstExperience = resume.experiences[0];
    const experienceLabel = [firstExperience?.role, firstExperience?.company]
      .filter(Boolean)
      .join(" at ");

    requirementsTable.push({
      requirementId: "req-exp-years",
      requirementName: `${minYearsRequired}+ Years Relevant Experience`,
      type: "REQUIRED",
      importance: "CRITICAL",
      status: expStatus,
      evidenceText:
        totalYears > 0
          ? `${totalYears} years of non-overlapping dated experience${experienceLabel ? `; latest entry: ${experienceLabel}` : ""}`
          : hasUndatedExperience
            ? "Experience entries are present, but dates are missing so duration cannot be verified."
            : "No work experience entries were found.",
      sourceSection: "Experience",
      sourceEntity: firstExperience?.company || undefined,
      confidence: totalYears > 0 ? 90 : hasUndatedExperience ? 40 : 70,
    });
  }

  if (educationRequirement) {
    const educationText = resume.education
      .map((education) =>
        [education.degree, education.fieldOfStudy, education.institution]
          .filter(Boolean)
          .join(" "),
      )
      .filter(Boolean);

    requirementsTable.push({
      requirementId: "req-edu",
      requirementName: educationRequirement,
      type: "REQUIRED",
      importance: "HIGH",
      status: evaluateEducationMatch(resume, parseJobDescription(educationRequirement)).isSatisfied ? "SATISFIED" : educationText.length > 0 ? "PARTIAL" : "MISSING",
      evidenceText: educationText[0],
      sourceSection: "Education",
      sourceEntity: resume.education.find((education) => education.institution)
        ?.institution,
      confidence: educationText.length > 0 ? 55 : 70,
    });
  }

  return {
    skillsTable,
    requirementsTable,
    strengths,
    gaps,
  };
}

function findTextSnippetForSkill(
  skill: string,
  resume: UnifiedParsedResume,
): { snippet: string; section: string; entity?: string } | undefined {
  const skillLower = skill.toLowerCase();

  // Check Experience bullets
  for (const exp of resume.experiences) {
    if (textDemonstratesSkill(exp.description || "", skill)) {
      return {
        snippet: exp.description,
        section: "Experience",
        entity:
          [exp.role, exp.company].filter(Boolean).join(" at ") || undefined,
      };
    }
    for (const bullet of exp.bullets) {
      if (textDemonstratesSkill(bullet, skill)) {
        return {
          snippet: bullet,
          section: "Experience",
          entity: `${exp.role} at ${exp.company}`,
        };
      }
    }
  }

  // Check Project bullets
  for (const proj of resume.projects) {
    if (textDemonstratesSkill(proj.description, skill)) return { snippet: proj.description, section: "Projects", entity: proj.title };
    for (const bullet of proj.bullets) {
      if (textDemonstratesSkill(bullet, skill)) {
        return {
          snippet: bullet,
          section: "Projects",
          entity: proj.title,
        };
      }
    }
    if (proj.techStack.some((t) => t.toLowerCase() === skillLower)) {
      return {
        snippet: `Project ${proj.title} built using ${proj.techStack.join(", ")}`,
        section: "Projects",
        entity: proj.title,
      };
    }
  }

  // Check Certifications
  for (const cert of resume.certifications) {
    if (textDemonstratesSkill(cert, skill)) {
      return {
        snippet: `Certification: ${cert}`,
        section: "Certifications",
        entity: cert,
      };
    }
  }

  // Check Summary
  if (resume.summary && textDemonstratesSkill(resume.summary, skill)) {
    return {
      snippet: resume.summary,
      section: "Summary",
    };
  }

  return undefined;
}
