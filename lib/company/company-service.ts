import type { Eligibility } from "@/lib/jobs/eligibility";
import { readApplicationSnapshot } from "@/lib/jobs/snapshots";
import { applicationInterview } from "@/lib/jobs/interview-schedule";
import { db } from "@/lib/db";
import { ApplicationState, APPLICATION_TRANSITIONS, isApplicationState } from "@/lib/application-state";
import { ApiError } from "@/lib/api-error";
import {jobDisplayStatus,jobAvailable} from "@/lib/jobs/availability";
import {readEvaluation} from "@/lib/company/applicant-tools";

export interface CreateCompanyJobInput {
  eligibility?:Eligibility;
  title: string;
  location: string;
  workMode?: string;
  type?: string;
  experienceMin?: number;
  experienceMax?: number;
  experience?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryPeriod?: string;
  salary?: string;
  description: string;
  aboutCompany?: string;
  responsibilities?: string;
  requirements: string;
  preferredRequirements?: string;
  skills?: string;
  tags?: string;
  companyUrl?: string;
  expiresAt?: string | null;
  status?: string;
}

export interface UpdateCompanyJobInput extends Partial<CreateCompanyJobInput> {
  status?: string;
  republish?: boolean;
  expectedUpdatedAt?: string;
}

/**
 * Valid Status Transitions Matrix
 */
const VALID_TRANSITIONS = APPLICATION_TRANSITIONS;

/**
 * Helper to ensure CompanyProfile exists for the user
 */
export async function getOrCreateCompanyProfile(companyUserId: string) {
  const user = await db.user.findUnique({
    where: { id: companyUserId },
    include: { companyProfile: true },
  });

  if (!user) throw new Error("Employer user account not found.");

  if(!["COMPANY_ADMIN","SUPER_ADMIN"].includes(user.role))throw new ApiError("Employer access required.",403);
  if (!user.companyProfile) {
    const profile = await db.companyProfile.create({
      data: {
        userId: user.id,
        companyName: user.name || "Company",
        verificationStatus: "PENDING",
      },
    });
    return { user, profile };
  }

  return { user, profile: user.companyProfile };
}

/**
 * Get Company Profile details
 */
export async function getCompanyProfile(companyUserId: string) {
  const { user, profile } = await getOrCreateCompanyProfile(companyUserId);
  return {
    id: profile.id,
    companyName: profile.companyName,
    logo: profile.logo,
    website: profile.website,
    description: profile.description,
    industry: profile.industry,
    location: profile.location,
    establishedYear: profile.establishedYear || 2024,
    companySize: profile.companySize || "11-50 Employees",
    isOnboarded: profile.isOnboarded || false,
    verificationStatus: profile.verificationStatus,
    email: user.email,
    createdAt: profile.createdAt.toISOString(),
  };
}

/**
 * Update Company Profile details
 */
export async function updateCompanyProfile(
  companyUserId: string,
  input: {
    companyName?: string;
    logo?: string;
    website?: string;
    description?: string;
    industry?: string;
    location?: string;
    establishedYear?: number;
    companySize?: string;
    isOnboarded?: boolean;
  },
) {
  const { profile } = await getOrCreateCompanyProfile(companyUserId);

  const updatedProfile = await db.companyProfile.update({
    where: { id: profile.id },
    data: {
      companyName: input.companyName?.trim() || profile.companyName,
      logo: input.logo?.trim() ?? profile.logo,
      website: input.website?.trim() ?? profile.website,
      description: input.description?.trim() ?? profile.description,
      industry: input.industry?.trim() ?? profile.industry,
      location: input.location?.trim() ?? profile.location,
      establishedYear:
        typeof input.establishedYear === "number"
          ? input.establishedYear
          : profile.establishedYear,
      companySize: input.companySize?.trim() ?? profile.companySize,
      isOnboarded:
        typeof input.isOnboarded === "boolean"
          ? input.isOnboarded
          : profile.isOnboarded,
    },
  });

  if (input.companyName && input.companyName.trim()) {
    await db.user.update({
      where: { id: companyUserId },
      data: { name: input.companyName.trim() },
    });
    await db.jobPosting.updateMany({
      where: { companyUserId },
      data: { company: input.companyName.trim() },
    });
  }

  await db.activityLog.create({
    data: {
      userId: companyUserId,
      type: "COMPANY_PROFILE_UPDATED",
      title: "Updated Company Profile",
      detail: `Updated profile details for ${updatedProfile.companyName}`,
    },
  });

  return updatedProfile;
}

/**
 * Get Company Dashboard Hiring Analytics
 */
export async function getCompanyDashboardStats(companyUserId: string) {
  const companyJobs = await db.jobPosting.findMany({
    where: { companyUserId },
    select: { id: true, status: true, expiresAt:true, verificationStatus:true },
  });

  const jobIds = companyJobs.map((j) => j.id);

  const activeJobs = companyJobs.filter((j) => jobAvailable(j)).length;
  const totalJobs = companyJobs.length;

  let totalApplications = 0;
  let shortlistedCount = 0;
  let offersCount = 0;

  if (jobIds.length > 0) {
    const applications = await db.jobApplication.findMany({
      where: { jobId: { in: jobIds } },
      select: { status: true },
    });

    totalApplications = applications.length;
    shortlistedCount = applications.filter(
      (a) =>
        a.status === ApplicationState.SHORTLISTED ||
        a.status === ApplicationState.INTERVIEW,
    ).length;
    offersCount = applications.filter(
      (a) => a.status === ApplicationState.OFFERED,
    ).length;
  }

  return {
    activeJobs,
    totalJobs,
    totalApplications,
    shortlistedCount,
    offersCount,
  };
}

/**
 * Get all Jobs created by Company
 */
export async function getCompanyJobs(companyUserId: string) {
  const jobs = await db.jobPosting.findMany({
    where: { companyUserId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { applications: true },
      },
    },
  });

  return jobs.map((job) => ({
    id: job.id,
    title: job.title,
    company: job.company,
    companyLogo: job.companyLogo,
    companyUrl: job.companyUrl,
    location: job.location,
    workMode: job.workMode,
    type: job.type,
    experience: job.experience,
    salary: job.salary,
    status: job.status,
    displayStatus:jobDisplayStatus(job),
    updatedAt:job.updatedAt.toISOString(),
    verificationStatus: job.verificationStatus,
    postedAt: job.postedAt.toISOString(),
    expiresAt: job.expiresAt ? job.expiresAt.toISOString() : null,
    applicationsCount: job._count.applications,
  }));
}

/**
 * Create a new Job Posting server-side bound to Company
 */
export {createCompanyJob,updateCompanyJob,cloneCompanyJob} from "./job-postings";

/**
 * Delete / Close a Job Posting owned by Company
 */
export async function deleteCompanyJob(companyUserId: string, jobId: string) {
  const existingJob = await db.jobPosting.findUnique({
    where: { id: jobId },
    include: { _count: { select: { applications: true } } },
  });

  if (!existingJob) throw new Error("Job posting not found.");
  if (existingJob.companyUserId !== companyUserId) {
    throw new Error("Unauthorized. You do not own this job posting.");
  }

  if (existingJob._count.applications > 0) {
    // Preserve historical applications: soft-close job instead of hard delete
    const closedJob = await db.jobPosting.update({
      where: { id: jobId },
      data: { status: "CLOSED" },
    });

    await db.activityLog.create({
      data: {
        userId: companyUserId,
        type: "COMPANY_JOB_CLOSED",
        title: `Closed Job: ${closedJob.title}`,
        detail: `Preserved ${existingJob._count.applications} historical candidate applications`,
      },
    });

    return {
      success: true,
      action: "CLOSED",
      message: "Job closed to preserve historical candidate applications.",
    };
  } else {
    // No applications: safe hard delete
    await db.jobPosting.delete({ where: { id: jobId } });

    await db.activityLog.create({
      data: {
        userId: companyUserId,
        type: "COMPANY_JOB_DELETED",
        title: `Deleted Job: ${existingJob.title}`,
        detail: `Removed unused job posting ID ${jobId}`,
      },
    });

    return {
      success: true,
      action: "DELETED",
      message: "Job posting deleted successfully.",
    };
  }
}

/**
 * Get all Candidate Applications submitted to jobs owned by this Company
 */
export async function getCompanyApplications(
  companyUserId: string,
  filters?: { jobId?: string; status?: string; search?: string },
) {
  const companyJobs = await db.jobPosting.findMany({
    where: { companyUserId },
    select: { id: true },
  });

  const jobIds = companyJobs.map((j) => j.id);
  if (jobIds.length === 0) return [];

  const where: Record<string, unknown> = {
    jobId: { in: jobIds },
  };

  if (filters?.jobId && filters.jobId !== "ALL") {
    if (!jobIds.includes(filters.jobId)) return [];
    where.jobId = filters.jobId;
  }

  if (filters?.status && filters.status !== "ALL") {
    where.status = filters.status;
  }

  const applications = await db.jobApplication.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          profile: {
            select: {
              headline: true,
              avatarUrl: true,
              phone: true,
              location: true,
              skills: true,
              experienceYears: true,
              education: true,
            },
          },
        },
      },
      job: {
        select: {
          id: true,
          title: true,
          company: true,
          location: true,
        },
      },
      resume: {
        select: {
          id: true,
          title: true,
          templateId: true,
          contentJson: true,
          updatedAt: true,
        },
      },
    },
  });

  let filteredApplications = applications;
  if (filters?.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    filteredApplications = applications.filter(
      (app) =>
        app.user.name.toLowerCase().includes(q) ||
        app.user.email.toLowerCase().includes(q) ||
        app.job.title.toLowerCase().includes(q),
    );
  }

  return filteredApplications.map((app) => ({
    id: app.id,
    jobId: app.jobId,
    jobTitle: app.job.title,
    candidateId: app.user.id,
    candidateName: app.user.name,
    candidateEmail: app.user.email,
    candidateHeadline: app.user.profile?.headline || "Candidate",
    candidateAvatar: app.user.profile?.avatarUrl || null,
    candidateLocation: app.user.profile?.location || null,
    candidateSkills: app.user.profile?.skills || null,
    status: app.status,
    appliedAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
    coverNote: app.coverNote,
    employerNotes: app.notes,
    evaluation: readEvaluation(app.evaluationJson),
    interview: applicationInterview(app.timelineJson, app.status),
    resume: readApplicationSnapshot(app).resume,
    snapshotAvailable:Boolean(app.resumeSnapshotJson),
  }));
}

/**
 * Update Candidate Application Status by Company (with status transition matrix validation)
 */
export async function saveApplicationNotesByCompany(companyUserId: string, applicationId: string, note: unknown, expectedUpdatedAt: unknown) {
  if (typeof note !== "string" || note.length > 2000) throw new ApiError("Notes must contain at most 2,000 characters.");
  if (typeof expectedUpdatedAt !== "string" || !Number.isFinite(Date.parse(expectedUpdatedAt))) throw new ApiError("Refresh the application before saving notes.");
  const application = await db.jobApplication.findUnique({where:{id:applicationId},include:{job:true}});
  if (!application) throw new ApiError("Application not found.",404);
  if (application.job.companyUserId !== companyUserId) throw new ApiError("This application belongs to another employer.",403);
  const result = await db.jobApplication.updateMany({where:{id:applicationId,updatedAt:new Date(expectedUpdatedAt)},data:{notes:note.trim() || null}});
  if (result.count !== 1) throw new ApiError("This application changed. Refresh before saving notes.",409,"CONFLICT");
  return db.jobApplication.findUnique({where:{id:applicationId}});
}

export async function updateApplicationStatusByCompany(
  companyUserId: string,
  applicationId: string,
  newStatus: ApplicationState | string,
  employerNote?: string,
  expectedUpdatedAt?: string,
) {
  const application = await db.jobApplication.findUnique({
    where: { id: applicationId },
    include: { job: true, user: true },
  });

  if (!application) throw new ApiError("Application not found.",404);
  if (application.job.companyUserId !== companyUserId) {
    throw new ApiError(
      "This application belongs to another employer.",403,
    );
  }

  const currentStatus = application.status;
  if (expectedUpdatedAt && expectedUpdatedAt !== application.updatedAt.toISOString()) throw new ApiError("This application changed. Refresh before updating it.",409,"CONFLICT");
  if (employerNote !== undefined && (typeof employerNote !== "string" || employerNote.length > 2000)) throw new ApiError("Notes must contain at most 2,000 characters.");
  if (!isApplicationState(newStatus)) throw new ApiError("Unsupported application status.");
  if (currentStatus === newStatus) return employerNote === undefined ? application : saveApplicationNotesByCompany(companyUserId, applicationId, employerNote, expectedUpdatedAt || application.updatedAt.toISOString());

  // Validate status transition matrix
  if (currentStatus !== newStatus) {
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new ApiError(
        `Invalid status transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowed.join(", ") || "None"}.`,
      );
    }
  }

  // Parse existing timeline
  let timeline = [];
  try {
    timeline = JSON.parse(application.timelineJson);
  } catch {
    timeline = [];
  }

  // Build candidate-visible timeline title
  const statusStr = String(newStatus);
  let timelineTitle = `Status updated to ${statusStr.replace("_", " ")}`;
  if (statusStr === "UNDER_REVIEW") timelineTitle = "Application Under Review";
  else if (statusStr === "SHORTLISTED") timelineTitle = "Candidate Shortlisted";
  else if (statusStr === "INTERVIEW") timelineTitle = "Moved to interview stage";
  else if (statusStr === "SELECTED") timelineTitle = "Candidate Selected";
  else if (statusStr === "OFFERED") timelineTitle = "Offer Extended";
  else if (statusStr === "REJECTED")
    timelineTitle = "Application Status Updated";

  timeline.push({
    status: newStatus,
    title: timelineTitle,
    timestamp: new Date().toISOString(),
    note: `Updated by ${application.job.company} hiring team.`,
  });

  const changed = await db.jobApplication.updateMany({
    where: { id: applicationId, status: currentStatus, updatedAt: application.updatedAt },
    data: { status: newStatus, timelineJson: JSON.stringify(timeline), notes: employerNote === undefined ? application.notes : employerNote.trim() || null },
  });
  if (changed.count !== 1) throw new ApiError("This application changed. Refresh before updating it.", 409, "CONFLICT");
  const updated = await db.jobApplication.findUnique({ where: { id: applicationId } });
  if (!updated) throw new ApiError("Application no longer available.", 404);

  await db.activityLog.create({
    data: {
      userId: companyUserId,
      type: "APPLICATION_STATUS_CHANGED",
      title: `Updated Application Status: ${application.user.name}`,
      detail: `Role: ${application.job.title} → ${newStatus}`,
    },
  });

  return updated;
}
