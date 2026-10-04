import { CandidateIntelligenceProfile, InterviewSetupConfig } from "./types";
import { parseJobDescription } from "../ats/parser/job-parser";
import { parsePlainTextResume, parseStructuredResume } from "../ats/parser/resume-parser";
import { parseResumeContent } from "../resume/serialization";
import { textDemonstratesSkill } from "../ats/taxonomy/text-skills";
export async function buildInterviewContext(config: InterviewSetupConfig, resumeContentJson?: string, _atsSnapshotJson?: string): Promise<CandidateIntelligenceProfile> {
  const jd = parseJobDescription(config.jobDescription, config.targetJobTitle);
  const requiredSkills = jd.requiredSkills;
  const preferredSkills = jd.preferredSkills;
  let parsed;
  if (resumeContentJson) {
    try { JSON.parse(resumeContentJson); parsed = parseStructuredResume(parseResumeContent(resumeContentJson)); }
    catch { parsed = parsePlainTextResume(resumeContentJson); }
  }
  const evidence = parsed ? [...parsed.experiences.flatMap(e => e.bullets), ...parsed.projects.flatMap(p => [...p.bullets, p.description || ""])] : [];
  return { resumeId: config.resumeId, targetJobTitle: config.targetJobTitle, companyName: config.companyName,
    jobDescription: config.jobDescription, requiredSkills, preferredSkills,
    extractedExperience: parsed?.experiences.map(e => `${e.role} at ${e.company}`) || [],
    extractedProjects: parsed?.projects.map(p => ({title:p.title, description:p.description,techStack:p.techStack})) || [],
    resumeEvidenceSnippets: evidence.filter(Boolean),
    strongAreas: requiredSkills.filter(s => evidence.some(e => textDemonstratesSkill(e,s))),
    weakAreas: requiredSkills.filter(s => !evidence.some(e => textDemonstratesSkill(e,s))) };
}
