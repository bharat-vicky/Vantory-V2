/**
 * Unified Resume Parser for Vantory (Milestone 6)
 * Prefers structured ResumeData from Resume Builder (canonical truth).
 * Supports text extracted from PDF/DOCX file uploads.
 */

import { ResumeData } from "@/lib/resume/types";
import { visibleResume } from "@/lib/resume/visible-content";
import { skillsInText } from "../taxonomy/text-skills";
import { parseExperienceLines, parseEducationLines, parseProjectLines } from "./text-entries";

export interface ParsedResumeSection {
  name: string;
  items: string[];
}

export interface UnifiedParsedResume {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
  summary: string;
  skills: string[];
  experiences: {
    role: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    description: string;
    bullets: string[];
  }[];
  education: {
    degree: string;
    fieldOfStudy: string;
    institution: string;
    startDate: string;
    endDate: string;
  }[];
  projects: {
    title: string;
    techStack: string[];
    description: string;
    bullets: string[];
  }[];
  certifications: string[];
  achievements: string[];
  rawText: string;
  parseConfidence: number; // 0-100
  sectionsDetected: string[];
  dateConsistency: "HIGH" | "MEDIUM" | "LOW";
}

/**
 * Parse structured ResumeData from Vantory Resume Builder
 */
export function parseStructuredResume(data: ResumeData): UnifiedParsedResume {
  data = visibleResume(data);
  const allSkills: string[] = [];
  if (data.skills && Array.isArray(data.skills)) {
    data.skills.forEach((cat) => {
      if (cat.skills && Array.isArray(cat.skills)) {
        cat.skills.forEach((s) => {
          if (s && s.trim() && !allSkills.includes(s.trim())) {
            allSkills.push(s.trim());
          }
        });
      }
    });
  }

  const experiences = (data.experience || []).map((exp) => ({
    role: exp.role || "",
    company: exp.company || "",
    location: exp.location || "",
    startDate: exp.startDate || "",
    endDate: exp.isCurrent ? "Present" : exp.endDate || "",
    description: exp.description || "",
    bullets: (exp.bullets || []).filter((b) => b && b.trim()),
  }));

  const education = (data.education || []).map((edu) => ({
    degree: edu.degree || "",
    fieldOfStudy: edu.fieldOfStudy || "",
    institution: edu.institution || "",
    startDate: edu.startDate || "",
    endDate: edu.endDate || "",
  }));

  const projects = (data.projects || []).map((proj) => ({
    title: proj.title || "",
    techStack: proj.techStack || [],
    description: proj.description || "",
    bullets: (proj.bullets || []).filter((b) => b && b.trim()),
  }));

  const certifications = (data.certifications || []).map(
    (c) => `${c.name} (${c.issuer})`,
  );
  const achievements = (data.achievements || []).map((a) => a.title);
  const sectionsDetected = [
    ...(data.personalInfo?.fullName ||
    data.personalInfo?.email ||
    data.personalInfo?.phone
      ? ["Personal"]
      : []),
    ...(data.summary?.trim() ? ["Summary"] : []),
    ...(allSkills.length > 0 ? ["Skills"] : []),
    ...(experiences.some(
      (item) => item.role || item.company || item.bullets.length > 0,
    )
      ? ["Experience"]
      : []),
    ...(education.some(
      (item) => item.degree || item.fieldOfStudy || item.institution,
    )
      ? ["Education"]
      : []),
    ...(projects.some(
      (item) => item.title || item.description || item.bullets.length > 0,
    )
      ? ["Projects"]
      : []),
    ...(certifications.length > 0 ? ["Certifications"] : []),
    ...(achievements.length > 0 ? ["Achievements"] : []),
  ];

  // Combine raw text representation for NLP analysis
  const rawTextParts: string[] = [
    data.personalInfo?.fullName || "",
    data.personalInfo?.headline || "",
    data.personalInfo?.email || "",
    data.personalInfo?.phone || "",
    data.personalInfo?.location || "",
    data.personalInfo?.email || "",
    data.personalInfo?.phone || "",
    data.personalInfo?.location || "",
    data.summary || "",
    allSkills.join(", "),
    ...experiences.map(
      (e) => `${e.role} at ${e.company}. ${e.startDate} - ${e.endDate}. ${e.description} ${e.bullets.join(" ")}`,
    ),
    ...education.map(
      (e) => `${e.degree} in ${e.fieldOfStudy} from ${e.institution}. ${e.startDate} - ${e.endDate}`,
    ),
    ...certifications,
    ...achievements,
    ...projects.map(
      (p) =>
        `${p.title} using ${p.techStack.join(", ")}. ${p.description} ${p.bullets.join(" ")}`,
    ),
  ];

  return {
    fullName: data.personalInfo?.fullName || "Candidate",
    headline: data.personalInfo?.headline || "",
    email: data.personalInfo?.email || "",
    phone: data.personalInfo?.phone || "",
    location: data.personalInfo?.location || "",
    linkedin: data.personalInfo?.linkedin || "",
    github: data.personalInfo?.github || "",
    portfolio: data.personalInfo?.portfolio || "",
    summary: data.summary || "",
    skills: allSkills,
    experiences,
    education,
    projects,
    certifications,
    achievements,
    rawText: rawTextParts.filter(Boolean).join("\n"),
    parseConfidence: rawTextParts.filter(part => part.trim()).length ? Math.min(98, 50 + sectionsDetected.length * 8) : 0,
    sectionsDetected,
    dateConsistency:
      experiences.length > 0 &&
      experiences.every((item) => item.startDate && item.endDate)
        ? "HIGH"
        : experiences.length > 0
          ? "LOW"
          : "MEDIUM",
  };
}

/**
 * Parse plain text extracted from uploaded PDF/DOCX document
 */
export function parsePlainTextResume(text: string): UnifiedParsedResume {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const sectionAliases: Record<string, string[]> = {
    Summary: ["summary", "professional summary", "profile"],
    Skills: ["skills", "technical skills", "core skills", "technologies"],
    Experience: [
      "experience",
      "work experience",
      "professional experience",
      "employment history",
      "work history",
    ],
    Education: ["education", "academic background"],
    Projects: ["projects", "personal projects", "selected projects"],
    Certifications: ["certifications", "licenses & certifications"],
    Achievements: ["achievements", "awards"],
  };
  const headingToSection = new Map(
    Object.entries(sectionAliases).flatMap(([section, aliases]) =>
      aliases.map((alias) => [alias, section] as const),
    ),
  );
  const sectionContent = new Map<string, string[]>();
  const detectedSections: string[] = [];
  let currentSection = "";

  for (const line of lines) {
    const normalizedHeading = line
      .replace(/[:\s]+$/, "")
      .replace(/[^a-zA-Z &]/g, "")
      .toLowerCase();
    const matchedSection = headingToSection.get(normalizedHeading);
    if (matchedSection) {
      currentSection = matchedSection;
      if (!sectionContent.has(matchedSection)) {
        sectionContent.set(matchedSection, []);
      }
      if (!detectedSections.includes(matchedSection)) {
        detectedSections.push(matchedSection);
      }
      continue;
    }
    if (currentSection) {
      sectionContent.get(currentSection)?.push(line);
    }
  }

  const emailMatch = text.match(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  );
  const phoneMatch = text.match(
    /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
  );
  const linkedinMatch = text.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
  const githubMatch = text.match(/github\.com\/[a-zA-Z0-9_-]+/i);

  const foundSkills = skillsInText(text);

  const experienceLines = sectionContent.get("Experience") || [];
  const experienceBullets = experienceLines
    .map((line) => line.replace(/^[â€¢*-]\s*/, "").trim())
    .filter(Boolean);
  const projectLines = sectionContent.get("Projects") || [];
  const projectBullets = projectLines
    .map((line) => line.replace(/^[â€¢*-]\s*/, "").trim())
    .filter(Boolean);
  const summary = sectionContent.get("Summary")?.join(" ") || "";
  const isSectionHeading = (line: string) =>
    headingToSection.has(
      line
        .replace(/[:\s]+$/, "")
        .replace(/[^a-zA-Z &]/g, "")
        .toLowerCase(),
    );
  const firstSectionIndex = lines.findIndex(isSectionHeading);
  const identityHeader =
    firstSectionIndex < 0 ? lines : lines.slice(0, firstSectionIndex);
  const identityLines = identityHeader.filter(
    (line) =>
      !isSectionHeading(line) &&
      !/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(line) &&
      !/(\+?\d[\d\s().-]{7,}\d)/.test(line),
  );
  const headingCount = detectedSections.length;
  const parseConfidence = Math.min(
    85,
    (text.trim() ? 20 : 0) +
      Math.min(20, Math.floor(text.length / 100)) +
      headingCount * 5 +
      (emailMatch ? 5 : 0) +
      (foundSkills.length > 0 ? 5 : 0),
  );

  return {
    fullName: identityLines[0] || "Candidate",
    headline: identityLines[1] || "",
    email: emailMatch ? emailMatch[0] : "",
    phone: phoneMatch ? phoneMatch[0] : "",
    location: "",
    linkedin: linkedinMatch ? `https://${linkedinMatch[0]}` : "",
    github: githubMatch ? `https://${githubMatch[0]}` : "",
    portfolio: "",
    summary,
    skills: foundSkills,
    experiences: parseExperienceLines(experienceLines),
    education: parseEducationLines(sectionContent.get("Education") || []),
    projects: parseProjectLines(projectLines),
    certifications: sectionContent.get("Certifications") || [],
    achievements: sectionContent.get("Achievements") || [],
    rawText: text,
    parseConfidence,
    sectionsDetected: [
      ...(emailMatch || phoneMatch ? ["Contact"] : []),
      ...detectedSections,
    ],
    dateConsistency: experienceBullets.length ? "LOW" : "MEDIUM",
  };
}
