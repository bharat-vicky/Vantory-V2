import { ApiError, objectId } from "@/lib/api-error";
import { db } from "@/lib/db";
import { ResumeData, defaultResumeSettings } from "./types";
import { parseResumeContent, serializeResumeContent } from "./serialization";

export interface CandidateResumeProfile {
  name: string;
  email: string;
  profile: {
    headline: string | null;
    bio: string | null;
    phone: string | null;
    location: string | null;
    githubUrl: string | null;
    linkedinUrl: string | null;
    portfolioUrl: string | null;
    skills: string | null;
    education: string | null;
  } | null;
}

export function createResumeFromProfile(
  user: CandidateResumeProfile | null,
): ResumeData {
  const profile = user?.profile;
  const profileSkills =
    profile?.skills
      ?.split(",")
      .map((skill) => skill.trim())
      .filter(Boolean) ?? [];
  const education = profile?.education?.trim();

  return {
    title: user?.name ? `${user.name} Resume` : "Candidate Resume",
    personalInfo: {
      fullName: user?.name || "",
      headline: profile?.headline || "",
      email: user?.email || "",
      phone: profile?.phone || "",
      location: profile?.location || "",
      linkedin: profile?.linkedinUrl || "",
      github: profile?.githubUrl || "",
      portfolio: profile?.portfolioUrl || "",
      leetcode: "",
    },
    summary: profile?.bio || "",
    skills: profileSkills.length
      ? [{ id: "cat-1", category: "Technical Skills", skills: profileSkills }]
      : [],
    experience: [],
    education: education
      ? [
          {
            id: "edu-1",
            degree: education,
            institution: "",
            location: "",
            startDate: "",
            endDate: "",
          },
        ]
      : [],
    projects: [],
    certifications: [],
    achievements: [],
    settings: defaultResumeSettings,
  };
}

/** Pre-populates structured ResumeData only with candidate-provided profile data. */
export async function autoPopulateFromProfile(
  userId: string,
): Promise<ResumeData> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  return createResumeFromProfile(user);
}

/**
 * Gets all resumes belonging to an authenticated candidate.
 */
export async function getCandidateResumes(userId: string) {
  const resumes = await db.resume.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });


  return resumes;
}

/**
 * Gets or creates default active resume for candidate.
 */
export async function getOrCreateDefaultResume(userId: string) {
  const userResumes = await getCandidateResumes(userId);
  const activeResume = userResumes[0];
  if (!activeResume) throw new ApiError("Create and save a resume first.",404);

  return {
    resumeId: activeResume.id,
    resumeData: parseResumeContent(activeResume.contentJson),
    title: activeResume.title,
    updatedAt: activeResume.updatedAt,
  };
}

/**
 * Saves/Updates resume content JSON.
 */
export async function saveResumeContent(
  userId: string,
  resumeId: string,
  data: ResumeData,
  expectedUpdatedAt?: string,
) {
  if (typeof data.title !== "string" || !data.title.trim() || data.title.trim().length > 120) {
    throw new ApiError("Give this resume a name of 1–120 characters before saving.");
  }
  data = { ...data, title: data.title.trim() };
  const existing = await db.resume.findFirst({
    where: { id: resumeId, userId },
  });

  if (!existing) {
    throw new Error("Resume not found or unauthorized.");
  }

  if (!expectedUpdatedAt || !Number.isFinite(Date.parse(expectedUpdatedAt))) throw new ApiError("Reload the resume before saving.",409,"REVISION_REQUIRED");
  const changed=await db.resume.updateMany({where:{id:resumeId,userId,updatedAt:new Date(expectedUpdatedAt)},data:{title:data.title || existing.title,templateId:data.settings?.templateId || existing.templateId,contentJson:serializeResumeContent(data)}});
  if(changed.count!==1) throw new ApiError("This resume changed in another tab. Your local draft is preserved. Reload before resolving it.",409,"CONFLICT");
  const updated=await db.resume.findUniqueOrThrow({where:{id:resumeId}});

  return updated;
}

export async function createCandidateResume(userId:string,sourceId?:string) {
 let data:ResumeData;
 if(sourceId){if(!objectId(sourceId))throw new ApiError("Invalid resume ID.");const source=await db.resume.findFirst({where:{id:sourceId,userId}});if(!source)throw new ApiError("Resume not found.",404);data=parseResumeContent(source.contentJson);data.title=`${source.title} (copy)`;delete data.id;}
 else data=await autoPopulateFromProfile(userId);
 return db.resume.create({data:{userId,title:data.title,templateId:data.settings.templateId,contentJson:serializeResumeContent(data)}});
}
export async function saveCandidateResume(userId:string,data:{resumeId?:string;id?:string;content?:ResumeData;expectedUpdatedAt?:string}) {
 const targetId=data.resumeId || data.id;if(!objectId(targetId))throw new ApiError("Choose the resume to save.");
 return saveResumeContent(userId,targetId,data.content || data as unknown as ResumeData,data.expectedUpdatedAt);
}
