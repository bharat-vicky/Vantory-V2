import { ResumeData, ResumeSectionId, defaultResumeSettings } from "./types";

/** Shared interpretation of the sections included in the exported document. */
export function visibleResume(data: ResumeData): ResumeData {
  const order = data.settings?.sectionOrder || defaultResumeSettings.sectionOrder;
  const visibility = { ...defaultResumeSettings.sectionVisibility, ...data.settings?.sectionVisibility };
  const visible = (section: ResumeSectionId) => order.includes(section) && visibility[section];
  return {
    ...data,
    summary: visible("summary") ? data.summary : "",
    skills: visible("skills") ? data.skills : [],
    experience: visible("experience") ? data.experience : [],
    education: visible("education") ? data.education : [],
    projects: visible("projects") ? data.projects : [],
    certifications: visible("certifications") ? data.certifications : [],
    achievements: visible("achievements") ? data.achievements : [],
  };
}
