export interface ResumePersonalInfo {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
  leetcode: string;
}

export interface ResumeExperienceItem {
  id: string;
  role: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
  bullets: string[];
}

export interface ResumeEducationItem {
  id: string;
  degree: string;
  fieldOfStudy?: string;
  institution: string;
  location: string;
  startDate: string;
  endDate: string;
  grade?: string;
  coursework?: string;
}

export interface ResumeSkillCategory {
  id: string;
  category: string;
  skills: string[];
}

export interface ResumeProjectItem {
  id: string;
  title: string;
  description: string;
  techStack: string[];
  liveUrl?: string;
  repoUrl?: string;
  bullets: string[];
}

export interface ResumeCertificationItem {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  credentialUrl?: string;
  pdfFileName?: string;
}

export interface ResumeAchievementItem {
  id: string;
  title: string;
  description?: string;
  date?: string;
  proofUrl?: string;
  pdfFileName?: string;
}

export type ResumeSectionId =
  | "personal"
  | "summary"
  | "skills"
  | "experience"
  | "projects"
  | "education"
  | "certifications"
  | "achievements";

export interface ResumeSettings {
  templateId: "classic-monochrome" | "latex-classic" | "latex-minimal";
  fontSize: "sm" | "md" | "lg";
  margins: "compact" | "normal" | "spacious";
  sectionOrder: ResumeSectionId[];
  sectionVisibility: Record<ResumeSectionId, boolean>;
}

export interface ResumeData {
  updatedAt?: string;
  id?: string;
  title: string;
  personalInfo: ResumePersonalInfo;
  summary: string;
  skills: ResumeSkillCategory[];
  experience: ResumeExperienceItem[];
  education: ResumeEducationItem[];
  projects: ResumeProjectItem[];
  certifications: ResumeCertificationItem[];
  achievements: ResumeAchievementItem[];
  settings: ResumeSettings;
}

export const defaultResumeSettings: ResumeSettings = {
  templateId: "classic-monochrome",
  fontSize: "md",
  margins: "normal",
  sectionOrder: [
    "personal",
    "summary",
    "skills",
    "experience",
    "projects",
    "education",
    "certifications",
    "achievements",
  ],
  sectionVisibility: {
    personal: true,
    summary: true,
    skills: true,
    experience: true,
    projects: true,
    education: true,
    certifications: true,
    achievements: true,
  },
};

export const emptyResumeData: ResumeData = {
  title: "Candidate Resume",
  personalInfo: {
    fullName: "",
    headline: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    github: "",
    portfolio: "",
    leetcode: "",
  },
  summary: "",
  skills: [],
  experience: [],
  education: [],
  projects: [],
  certifications: [],
  achievements: [],
  settings: defaultResumeSettings,
};
