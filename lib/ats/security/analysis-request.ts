import { ResumeData } from "@/lib/resume/types";

export const MAX_ATS_REQUEST_BYTES = 6 * 1024 * 1024;
export const MAX_ATS_JOB_DESCRIPTION_LENGTH = 50_000;
export const MAX_ATS_RESUME_TEXT_LENGTH = 100_000;
const MAX_ATS_TITLE_LENGTH = 160;
const MAX_ATS_COMPANY_LENGTH = 160;

export interface ATSAnalysisInput {
  resumeId?: string;
  resumeData?: ResumeData;
  uploadedResumeText?: string;
  jobDescription: string;
  targetJobTitle?: string;
  companyName?: string;
}

export type ATSAnalysisValidation =
  | { success: true; data: ATSAnalysisInput }
  | { success: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function optionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function isResumeData(value: unknown): value is ResumeData {
  if (!isRecord(value)) return false;
  const personalInfo = value.personalInfo;
  if (!isRecord(personalInfo)) return false;

  const personalInfoFields = [
    "fullName",
    "headline",
    "email",
    "phone",
    "location",
    "linkedin",
    "github",
    "portfolio",
    "leetcode",
  ];
  if (
    !personalInfoFields.every((field) => optionalString(personalInfo[field]))
  ) {
    return false;
  }

  if (typeof value.summary !== "string") return false;
  if (!Array.isArray(value.skills) || !Array.isArray(value.experience))
    return false;
  if (!Array.isArray(value.education) || !Array.isArray(value.projects))
    return false;
  if (
    !Array.isArray(value.certifications) ||
    !Array.isArray(value.achievements)
  )
    return false;

  const validSkills = value.skills.every(
    (category) =>
      isRecord(category) &&
      typeof category.category === "string" &&
      isStringArray(category.skills),
  );
  const validExperience = value.experience.every(
    (experience) =>
      isRecord(experience) &&
      ["role", "company", "location", "startDate", "endDate"].every((field) =>
        optionalString(experience[field]),
      ) &&
      optionalString(experience.description) &&
      (experience.isCurrent === undefined ||
        typeof experience.isCurrent === "boolean") &&
      (experience.bullets === undefined || isStringArray(experience.bullets)),
  );
  const validEducation = value.education.every(
    (education) =>
      isRecord(education) &&
      [
        "degree",
        "fieldOfStudy",
        "institution",
        "location",
        "startDate",
        "endDate",
        "grade",
        "coursework",
      ].every((field) => optionalString(education[field])),
  );
  const validProjects = value.projects.every(
    (project) =>
      isRecord(project) &&
      ["title", "description", "liveUrl", "repoUrl"].every((field) =>
        optionalString(project[field]),
      ) &&
      (project.techStack === undefined || isStringArray(project.techStack)) &&
      (project.bullets === undefined || isStringArray(project.bullets)),
  );
  const validCertifications = value.certifications.every(
    (certification) =>
      isRecord(certification) &&
      ["name", "issuer", "issueDate", "credentialUrl"].every((field) =>
        optionalString(certification[field]),
      ),
  );
  const validAchievements = value.achievements.every(
    (achievement) =>
      isRecord(achievement) &&
      ["title", "description", "proofUrl"].every((field) =>
        optionalString(achievement[field]),
      ),
  );

  return (
    validSkills &&
    validExperience &&
    validEducation &&
    validProjects &&
    validCertifications &&
    validAchievements
  );
}

export function validateATSAnalysisInput(
  value: unknown,
): ATSAnalysisValidation {
  if (!isRecord(value)) {
    return { success: false, error: "Invalid analysis request." };
  }

  const {
    resumeId,
    resumeData,
    uploadedResumeText,
    jobDescription,
    targetJobTitle,
    companyName,
  } = value;

  if (typeof jobDescription !== "string" || !jobDescription.trim()) {
    return {
      success: false,
      error: "Job description is required for ATS analysis.",
    };
  }
  if (jobDescription.length > MAX_ATS_JOB_DESCRIPTION_LENGTH) {
    return {
      success: false,
      error: "Job description must be 50,000 characters or fewer.",
    };
  }
  if (
    resumeId !== undefined &&
    (typeof resumeId !== "string" || resumeId.length > 128)
  ) {
    return { success: false, error: "Invalid resume ID." };
  }
  if (
    targetJobTitle !== undefined &&
    (typeof targetJobTitle !== "string" ||
      targetJobTitle.length > MAX_ATS_TITLE_LENGTH)
  ) {
    return {
      success: false,
      error: "Job title must be 160 characters or fewer.",
    };
  }
  if (
    companyName !== undefined &&
    (typeof companyName !== "string" ||
      companyName.length > MAX_ATS_COMPANY_LENGTH)
  ) {
    return {
      success: false,
      error: "Company name must be 160 characters or fewer.",
    };
  }
  if (uploadedResumeText !== undefined) {
    if (
      typeof uploadedResumeText !== "string" ||
      uploadedResumeText.trim().length < 30
    ) {
      return {
        success: false,
        error: "Uploaded resume text is empty or unreadable.",
      };
    }
    if (uploadedResumeText.length > MAX_ATS_RESUME_TEXT_LENGTH) {
      return {
        success: false,
        error: "Extracted resume text exceeds the 100,000 character limit.",
      };
    }
  }
  if (resumeData !== undefined && !isResumeData(resumeData)) {
    return { success: false, error: "Invalid resume data." };
  }
  if (
    uploadedResumeText !== undefined &&
    (resumeId !== undefined || resumeData !== undefined)
  ) {
    return {
      success: false,
      error:
        "Choose one resume source: a saved resume, builder draft, or uploaded file.",
    };
  }

  return {
    success: true,
    data: {
      resumeId: resumeId as string | undefined,
      resumeData: resumeData as ResumeData | undefined,
      uploadedResumeText: uploadedResumeText as string | undefined,
      jobDescription,
      targetJobTitle: targetJobTitle as string | undefined,
      companyName: companyName as string | undefined,
    },
  };
}
