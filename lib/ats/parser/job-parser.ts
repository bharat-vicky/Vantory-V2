/**
 * Job Description Requirement Extraction Engine (Milestone 6)
 * Distinguishes REQUIRED vs PREFERRED requirements & assigns criticality weights.
 */

import { StructuredJobDescription, ExtractedRequirement } from "../types";
import { normalizeJobTitle, detectSeniorityLevel } from "../taxonomy/titles";
import { CANONICAL_SKILL_MAP } from "../taxonomy/skills";

export function parseJobDescription(
  rawJdText: string,
  providedTitle?: string,
): StructuredJobDescription {
  const text = rawJdText.trim();
  const title = providedTitle?.trim() || extractJobTitleFromJd(text);
  const normalizedTitle = normalizeJobTitle(title);
  const seniority = detectSeniorityLevel(`${title} ${text}`);
  const minYears = extractMinYearsExperience(text);

  const { requiredSkills, preferredSkills } = extractSkillsFromJd(text);
  const requirements = extractStructuredRequirements(
    text,
    requiredSkills,
    preferredSkills,
    minYears,
  );

  let workMode: "REMOTE" | "HYBRID" | "ON_SITE" | "UNKNOWN" = "UNKNOWN";
  if (/\b(remote|work from home|telecommute)\b/i.test(text))
    workMode = "REMOTE";
  else if (/\b(hybrid|flexible)\b/i.test(text)) workMode = "HYBRID";
  else if (/\b(on-site|onsite|in-office|in office)\b/i.test(text))
    workMode = "ON_SITE";

  return {
    title,
    normalizedTitle,
    companyName: extractCompanyNameFromJd(text),
    seniority,
    location: extractLocationFromJd(text),
    workMode,
    minYearsExperience: minYears,
    requiredSkills,
    preferredSkills,
    requirements,
    educationRequirement: extractEducationRequirement(text),
    rawText: text,
  };
}

function extractJobTitleFromJd(text: string): string {
  const firstLine = text.split("\n")[0]?.trim() || "";
  if (
    firstLine.length > 5 &&
    firstLine.length < 80 &&
    !firstLine.includes(".")
  ) {
    return firstLine;
  }
  const match = text.match(/(?:Job Title|Role|Position)\s*[:|-]\s*([^\n\r]+)/i);
  if (match) return match[1].trim();
  return "Unspecified Role";
}

function extractCompanyNameFromJd(text: string): string | undefined {
  const match = text.match(/(?:Company|About|At)\s*[:|-]\s*([^\n\r.]+)/i);
  if (match && match[1].trim().length < 40) return match[1].trim();
  return undefined;
}

function extractLocationFromJd(text: string): string | undefined {
  const match = text.match(
    /(?:Location|Based in|Office)\s*[:|-]\s*([^\n\r.]+)/i,
  );
  if (match) return match[1].trim();
  return undefined;
}

export function extractMinYearsExperience(text: string): number {
  const matches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(?:\+|[-\u2013\u2014]\s*\d+)?\s*(?:years?|yrs?)\b[^.\n]{0,80}?(?:experience|exp\b)/gi)];
  const explicit = text.match(/(?:at least|minimum)\s+(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/i);
  const values = matches.map(match => Number(match[1]));
  if (explicit) values.push(Number(explicit[1]));
  return values.length ? Math.max(...values) : 0;
}

function extractEducationRequirement(text: string): string | undefined {
  const match = text.match(
    /\b(?:bachelor(?:'s)?|master(?:'s)?|ph\.?d\.?|doctorate|associate|b\.tech|b\.e\.|b\.s\.?|m\.s\.?|degree)\b[^\n\r.]{0,100}/i,
  );
  if (!match || /\bor equivalent experience\b/i.test(match[0]))
    return undefined;
  return match[0].trim();
}

function extractSkillsFromJd(text: string): {
  requiredSkills: string[];
  preferredSkills: string[];
} {
  const required: string[] = [];
  const preferred: string[] = [];

  const lower = text.toLowerCase();
  const requiredChunks: string[] = [];
  const preferredChunks: string[] = [];
  let preferredSection = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*(?:preferred(?: qualifications| requirements| skills)?|nice to have|bonus)(?:\s*:|\s*$)/i.test(line)) preferredSection = true;
    else if (/^\s*(?:required(?: qualifications| requirements| skills)?|requirements|qualifications|responsibilities|skills)(?:\s*:|\s*$)/i.test(line)) preferredSection = false;
    for (const clause of line.split(/;|(?<=\.)\s+/)) {
      if (preferredSection || /\b(?:preferred|nice to have|bonus|a plus)\b/i.test(clause)) preferredChunks.push(clause);
      else requiredChunks.push(clause);
    }
  }
  const requiredText = requiredChunks.join("\n");
  const preferredText = preferredChunks.join("\n");

  Object.keys(CANONICAL_SKILL_MAP).forEach((key) => {
    const canonicalName = CANONICAL_SKILL_MAP[key];
    const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const reg =
      /^\w/.test(key) && /\w$/.test(key)
        ? new RegExp(`\\b${safeKey}\\b`, "i")
        : new RegExp(
            `(?:^|\\s|[^a-zA-Z0-9])${safeKey}(?:$|\\s|[^a-zA-Z0-9])`,
            "i",
          );

    if (reg.test(lower)) {
      if (preferredText && reg.test(preferredText) && !reg.test(requiredText)) {
        if (!preferred.includes(canonicalName)) preferred.push(canonicalName);
      } else {
        if (!required.includes(canonicalName)) required.push(canonicalName);
      }
    }
  });

  return { requiredSkills: required, preferredSkills: preferred };
}

function extractStructuredRequirements(
  text: string,
  requiredSkills: string[],
  preferredSkills: string[],
  minYears: number,
): ExtractedRequirement[] {
  const reqs: ExtractedRequirement[] = [];

  // Minimum Experience Requirement
  if (minYears > 0) {
    reqs.push({
      id: "req-exp",
      name: `${minYears}+ Years Relevant Experience`,
      category: "experience",
      type: "REQUIRED",
      importance: "CRITICAL",
      minYears,
      originalText: `${minYears}+ years experience required`,
    });
  }

  // Required Skills
  requiredSkills.forEach((skill, idx) => {
    reqs.push({
      id: `req-skill-${idx}`,
      name: skill,
      category: "skill",
      type: "REQUIRED",
      importance: "HIGH",
      originalText: text.split(/\n|(?<=\.)\s+/).find(line => line.toLowerCase().includes(skill.toLowerCase())) || skill,
    });
  });

  // Preferred Skills
  preferredSkills.forEach((skill, idx) => {
    reqs.push({
      id: `pref-skill-${idx}`,
      name: skill,
      category: "skill",
      type: "PREFERRED",
      importance: "MEDIUM",
      originalText: text.split(/\n|(?<=\.)\s+/).find(line => line.toLowerCase().includes(skill.toLowerCase())) || skill,
    });
  });

  return reqs;
}
