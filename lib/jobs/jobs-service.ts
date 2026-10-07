import {activeJobWhere,jobAvailable,jobDisplayStatus} from "./availability";
import { db } from "@/lib/db";
import { ApplicationState } from "@/lib/application-state";
import { discoveryPipeline, annualSalary } from "./discovery";
import { ApiError, objectId } from "@/lib/api-error";
import { readApplicationSnapshot } from "./snapshots";
import { applicationInterview } from "./interview-schedule";
import { Prisma } from "@prisma/client";

export interface JobFilterParams {
  query?: string;
  jobType?: string;
  workMode?: string;
  experience?: string;
  location?: string;
  company?: string;
  skills?: string;
  salaryRange?: string;
  datePosted?: string; // "today", "3days", "7days", "30days"
  sortBy?: "recent" | "relevance" | "salary" | "experience";
  page?: number;
  limit?: number;
}

export async function getFilteredJobs(
  params: JobFilterParams,
  userId?: string,
) {
  const profile=userId ? await db.profile.findUnique({where:{userId}}):null;
  const terms=profile?.skills?.split(",").map(s=>s.trim()).filter(Boolean) || [];
  const {pipeline,page,limit}=discoveryPipeline(params,terms);
  const raw=await db.jobPosting.aggregateRaw({pipeline:pipeline as Prisma.InputJsonObject[]}) as unknown as {jobs:{_id:{$oid:string};relevance:number;annualMin:number|null;annualMax:number|null}[];count:{total:number}[]}[];
  const result=raw[0] || {jobs:[],count:[]};
  const ids=result.jobs.map(j=>j._id.$oid);
  const records=await db.jobPosting.findMany({where:{id:{in:ids}}});
  const jobs=ids.map(id=>records.find(j=>j.id===id)!).filter(Boolean);
  const totalCount=result.count[0]?.total || 0;
  const activeOpeningsCount=await db.jobPosting.count({where:activeJobWhere()});
  // Fetch saved status & application status if userId is authenticated
  let savedJobIds = new Set<string>();
  let appliedJobIds = new Set<string>();

  if (userId) {
    const [savedRecords, applicationRecords] = await Promise.all([
      db.savedJob.findMany({
        where: { userId },
        select: { jobId: true },
      }),
      db.jobApplication.findMany({
        where: { userId },
        select: { jobId: true },
      }),
    ]);

    savedJobIds = new Set(savedRecords.map((s) => s.jobId));
    appliedJobIds = new Set(applicationRecords.map((a) => a.jobId));
  }

  const formattedJobs = jobs.map((job) => ({
    ...job,
    annualSalaryMin:annualSalary(job.salaryMin,job.salaryPeriod),
    annualSalaryMax:annualSalary(job.salaryMax,job.salaryPeriod),
    rankingBasis:params.sortBy==="relevance" ? "Keyword overlap with search and profile skills":undefined,
    isSaved: savedJobIds.has(job.id),
    hasApplied: appliedJobIds.has(job.id),
  }));

  return {
    jobs: formattedJobs,
    totalCount,
    activeOpeningsCount,
    page,
    totalPages: Math.ceil(totalCount / limit),
    limit,
  };
}

export async function getJobById(id: string, userId?: string) {
  if (!objectId(id)) throw new ApiError("Invalid job ID.");
  const [job, savedRecord, appRecord] = await Promise.all([
    db.jobPosting.findUnique({
      where: { id },
    }),
    userId
      ? db.savedJob.findUnique({
          where: { userId_jobId: { userId, jobId: id } },
        })
      : null,
    userId
      ? db.jobApplication.findUnique({
          where: { userId_jobId: { userId, jobId: id } },
        })
      : null,
  ]);

  if (!job || job.status==="DRAFT") return null;

  return {
    ...job,
    displayStatus:jobDisplayStatus(job),
    isSaved: Boolean(savedRecord),
    hasApplied: Boolean(appRecord),
    existingApplicationId: appRecord?.id || null,
    isAvailable:jobAvailable(job),
  };
}

export async function setSavedJob(userId:string,jobId:string,isSaved:boolean) {
 if(!objectId(jobId))throw new ApiError("Invalid job ID.");
 if(isSaved){const job=await db.jobPosting.findUnique({where:{id:jobId}});if(!job || job.status==="DRAFT")throw new ApiError("Job not found.",404);await db.savedJob.upsert({where:{userId_jobId:{userId,jobId}},create:{userId,jobId},update:{}});}
 else await db.savedJob.deleteMany({where:{userId,jobId}});
 return {isSaved};
}
export async function toggleSaveJob(userId:string,jobId:string) {const existing=await db.savedJob.findUnique({where:{userId_jobId:{userId,jobId}}});return setSavedJob(userId,jobId,!existing);}

export async function getSavedJobs(userId: string) {
  const savedRecords = await db.savedJob.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      job: true,
    },
  });

  const applications = await db.jobApplication.findMany({
    where: { userId, jobId: { in: savedRecords.map(record => record.jobId) } },
    select: { id: true, jobId: true, status: true },
  });
  const applicationByJob = new Map(applications.map(application => [application.jobId, application]));

  return savedRecords.filter(s=>s.job.status!=="DRAFT").map((s) => ({
    savedId: s.id,
    savedAt: s.createdAt.toISOString(),
    ...s.job,
    hasApplied: applicationByJob.has(s.jobId),
    existingApplicationId: applicationByJob.get(s.jobId)?.id || null,
    applicationStatus: applicationByJob.get(s.jobId)?.status || null,
    isAvailable:jobAvailable(s.job),
  }));
}

export async function applyToJob(
  userId: string,
  jobId: string,
  resumeId: string,
  coverNote?: string,
  expectedResumeRevision?: string,
) {
  if(!objectId(jobId) || !objectId(resumeId))throw new ApiError("Choose a valid job and resume.");
  // 1. Verify Job Availability & Status
  const job = await db.jobPosting.findUnique({ where: { id: jobId } });
  if (!job) {
    throw new ApiError("Job posting not found.",404);
  }
  if (job.status !== "ACTIVE") {
    throw new ApiError(
      `Cannot apply. Job posting is ${job.status.toLowerCase()}.`,
    );
  }
  if (job.verificationStatus !== "VERIFIED") {
    throw new ApiError("Cannot apply. Job posting is pending verification.");
  }
  if (job.expiresAt && job.expiresAt <= new Date()) {
    throw new ApiError("Cannot apply. Job posting has expired.");
  }

  // 2. Prevent Duplicate Application
  const existingApp = await db.jobApplication.findUnique({
    where: { userId_jobId: { userId, jobId } },
  });
  if (existingApp) {
    return existingApp;
  }

  // 3. Verify Resume Ownership
  const resume = await db.resume.findFirst({
    where: { id: resumeId, userId },
  });
  if (!resume) {
    throw new ApiError(
      "Selected resume not found or does not belong to candidate.",
    );
  }

  if(expectedResumeRevision && resume.updatedAt.toISOString()!==expectedResumeRevision)throw new ApiError("The selected resume changed. Reload it and review before submitting.",409);

  // 4. Build Initial Application Timeline
  const initialTimeline = [
    {
      status: "APPLIED",
      title: "Application Submitted",
      timestamp: new Date().toISOString(),
      note: "Application submitted with Vantory Resume.",
    },
  ];

  // Capture the submission atomically with its audit entry. Later edits do not change it.
  try {
  const application=await db.$transaction(async tx=>{
    const currentJob=await tx.jobPosting.findFirst({where:{id:jobId,...activeJobWhere(),updatedAt:job.updatedAt}});
    const currentResume=await tx.resume.findFirst({where:{id:resumeId,userId,updatedAt:resume.updatedAt}});
    if(!currentJob || !currentResume)throw new ApiError("Job or resume changed. Review it and retry.",409);
    const created=await tx.jobApplication.create({data:{userId,jobId,resumeId,coverNote:coverNote?.trim().slice(0,2000) || null,status:ApplicationState.APPLIED,timelineJson:JSON.stringify(initialTimeline),resumeSnapshotJson:JSON.stringify({id:resume.id,title:resume.title,templateId:resume.templateId,contentJson:resume.contentJson,updatedAt:resume.updatedAt.toISOString()}),jobSnapshotJson:JSON.stringify(job),resumeRevision:resume.updatedAt},include:{job:true,resume:true}});
    await tx.activityLog.create({data:{userId,type:"APPLICATION_SUBMITTED",title:`Applied to ${job.title} at ${job.company}`,detail:`Submitted application using resume ${resume.title}`}});
    return created;
  });

  return application;
  } catch(error) {
    if(error instanceof Prisma.PrismaClientKnownRequestError && error.code==="P2002") {
      const submitted=await db.jobApplication.findUnique({where:{userId_jobId:{userId,jobId}}});
      if(submitted)return submitted;
    }
    throw error;
  }
}

export async function getCandidateApplications(userId: string) {
  const applications = await db.jobApplication.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      job: true,
      resume: true,
    },
  });

  // Calculate status counts
  const stats = {
    total: applications.length,
    applied: applications.filter((a) => a.status === ApplicationState.APPLIED)
      .length,
    underReview: applications.filter(
      (a) => a.status === ApplicationState.UNDER_REVIEW,
    ).length,
    shortlisted: applications.filter(
      (a) => a.status === ApplicationState.SHORTLISTED,
    ).length,
    interview: applications.filter(
      (a) => a.status === ApplicationState.INTERVIEW,
    ).length,
    selected:applications.filter(a=>a.status===ApplicationState.SELECTED).length,
    offered: applications.filter((a) => a.status === ApplicationState.OFFERED)
      .length,
    rejected: applications.filter((a) => a.status === ApplicationState.REJECTED)
      .length,
    withdrawn: applications.filter(
      (a) => a.status === ApplicationState.WITHDRAWN,
    ).length,
  };

  return {
    stats,
    applications: applications.map((app) => ({
      id: app.id,
      jobId: app.jobId,
      jobTitle: readApplicationSnapshot(app).job.title,
      company: readApplicationSnapshot(app).job.company,
      companyLogo: readApplicationSnapshot(app).job.companyLogo,
      location: readApplicationSnapshot(app).job.location,
      salary: readApplicationSnapshot(app).job.salary,
      workMode: readApplicationSnapshot(app).job.workMode,
      status: app.status,
      resumeTitle: readApplicationSnapshot(app).resume?.title || "Historical submission unavailable",
      snapshotAvailable:Boolean(app.resumeSnapshotJson),
      appliedAt: app.createdAt.toISOString(),
      coverNote: app.coverNote,
    })),
  };
}

export async function getApplicationDetails(
  userId: string,
  applicationId: string,
) {
  if(!objectId(applicationId))throw new ApiError("Invalid application ID.");
  const app = await db.jobApplication.findFirst({
    where: { id: applicationId, userId },
    include: {
      job: true,
      resume: true,
    },
  });

  if (!app) return null;

  let timeline = [];
  try {
    timeline = JSON.parse(app.timelineJson);
  } catch {
    timeline = [
      {
        status: app.status,
        title: "Application Submitted",
        timestamp: app.createdAt.toISOString(),
      },
    ];
  }

  return {
    id: app.id,
    status: app.status,
    appliedAt: app.createdAt.toISOString(),
    coverNote: app.coverNote,
    job: readApplicationSnapshot(app).job,
    resume: readApplicationSnapshot(app).resume,
    snapshotAvailable:Boolean(app.resumeSnapshotJson),
    timeline,
    interview: applicationInterview(app.timelineJson, app.status),
  };
}

export async function withdrawApplication(
  userId: string,
  applicationId: string,
) {
  if(!objectId(applicationId))throw new ApiError("Invalid application ID.");
  const existing = await db.jobApplication.findFirst({
    where: { id: applicationId, userId },
    include: { job: true },
  });

  if (!existing) {
    throw new ApiError("Application not found.",404);
  }

  if (existing.status === ApplicationState.WITHDRAWN) return existing;
  if(["REJECTED","OFFERED"].includes(existing.status))throw new ApiError("This application is already final.",409);

  let timeline = [];
  try {
    timeline = JSON.parse(existing.timelineJson);
  } catch {
    timeline = [];
  }

  timeline.push({
    status: ApplicationState.WITHDRAWN,
    title: "Application Withdrawn",
    timestamp: new Date().toISOString(),
    note: "Application withdrawn by candidate.",
  });

  return db.$transaction(async tx=>{
    const changed = await tx.jobApplication.updateMany({
      where:{id:applicationId,userId,status:existing.status,updatedAt:existing.updatedAt},
      data:{status:ApplicationState.WITHDRAWN,timelineJson:JSON.stringify(timeline)},
    });
    if(changed.count!==1)throw new ApiError("Application changed. Refresh and retry.",409);
    await tx.activityLog.create({data:{userId,type:"APPLICATION_WITHDRAWN",title:`Withdrew application for ${existing.job.title}`,detail:`Application ID ${applicationId} set to WITHDRAWN`}});
    return tx.jobApplication.findUniqueOrThrow({where:{id:applicationId}});
  });
}
