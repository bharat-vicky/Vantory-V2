import { defaultCareer,parseJson } from "@/lib/candidate/profile";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { ApplicationState } from "@/lib/application-state";
import { hashPassword } from "@/lib/auth/password";
import {
  calculateStudentReadiness,
  aggregateInstitutionFunnel,
  type StudentRawMetrics,
} from "./readiness-engine";

export type StudentWithMetricsPayload = Prisma.UserGetPayload<{
  include: {
    profile: true;
    resumes: { select: { id: true } };
    atsScans: { select: { overallScore: true } };
    interviews: { select: { overallScore: true } };
    applications: { select: { status: true } };
  };
}>;

export interface StudentFilterInput {
  search?: string;
  department?: string;
  course?: string;
  graduationYear?: number;
  readinessStatus?: "ALL" | "READY" | "NEEDS_IMPROVEMENT" | "NOT_READY";
  placementStatus?: string;
  page?: number;
  limit?: number;
}

export interface UpdateInstituteProfileInput {
  name?: string;
  logo?: string;
  website?: string;
  description?: string;
  location?: string;
  contactEmail?: string;
  contactPhone?: string;
  establishedYear?: number;
  isOnboarded?: boolean;
}

/**
 * Helper to ensure Institute record exists for the authenticated INSTITUTE_ADMIN user
 */
export async function getOrCreateInstituteProfile(adminUserId: string) {
  const user = await db.user.findUnique({
    where: { id: adminUserId },
    include: { institute: true },
  });

  if (!user) {
    throw new Error("Institute Administrator user account not found.");
  }

  if (user.role !== "INSTITUTE_ADMIN" && user.role !== "SUPER_ADMIN") {
    throw new Error("Forbidden. Institute Administrator access required.");
  }

  // If user has no associated Institute record yet, create one
  if (!user.instituteId || !user.institute) {
    const defaultName = user.name
      ? `${user.name}'s Institute`
      : "Vantory Partner Campus";

    const institute = await db.institute.create({
      data: {
        name: defaultName,
        contactPhone: null,
        domain: user.email.split("@")[1] || "campus.edu",
        verificationStatus: "PENDING",
        location: "Main Campus",
      },
    });

    // Link user to institute
    await db.user.update({
      where: { id: adminUserId },
      data: { instituteId: institute.id },
    });

    return { user, institute };
  }

  return { user, institute: user.institute };
}

/**
 * Get Institute Profile details
 */
export async function getInstituteProfile(adminUserId: string) {
  const { user, institute } = await getOrCreateInstituteProfile(adminUserId);

  const adminsCount = await db.user.count({
    where: {
      instituteId: institute.id,
      role: { in: ["INSTITUTE_ADMIN", "SUPER_ADMIN"] },
    },
  });

  return {
    id: institute.id,
    name: institute.name,
    logo: institute.logo,
    website: institute.website,
    description: institute.description,
    location: institute.location || "Main Campus",
    contactEmail: institute.contactEmail || user.email,
    contactPhone: institute.contactPhone,
    domain: institute.domain,
    establishedYear: institute.establishedYear || 2010,
    isOnboarded: institute.isOnboarded,
    verificationStatus: institute.verificationStatus || "PENDING",
    adminsCount,
    createdAt: institute.createdAt.toISOString(),
  };
}

/**
 * Update Institute Profile details
 */
export async function updateInstituteProfile(
  adminUserId: string,
  input: UpdateInstituteProfileInput,
) {
  const { institute } = await getOrCreateInstituteProfile(adminUserId);

  const updated = await db.institute.update({
    where: { id: institute.id },
    data: {
      name: input.name?.trim() || institute.name,
      logo: input.logo?.trim() ?? institute.logo,
      website: input.website?.trim() ?? institute.website,
      description: input.description?.trim() ?? institute.description,
      location: input.location?.trim() ?? institute.location,
      contactEmail: input.contactEmail?.trim() ?? institute.contactEmail,
      contactPhone: input.contactPhone?.trim() ?? institute.contactPhone,
      establishedYear: input.establishedYear ?? institute.establishedYear,
      isOnboarded: input.isOnboarded ?? institute.isOnboarded,
    },
  });

  await db.activityLog.create({
    data: {
      userId: adminUserId,
      type: "INSTITUTE_PROFILE_UPDATED",
      title: "Updated Institute Profile",
      detail: `Updated profile for ${updated.name}`,
    },
  });

  return updated;
}

/**
 * Helper to gather raw metrics for all students belonging to the institute
 */
async function getRawStudentMetricsForInstitute(instituteId: string) {
  const students = await db.user.findMany({
    where: {
      instituteId,
      profile:{careerJson:{contains:'"instituteAnalyticsConsent":true'}},
      role: { in: ["CANDIDATE", "INSTITUTE_STUDENT"] },
    },
    include: {
      profile: true,
      resumes: { select: { id: true } },
      atsScans: { where:{scoringEngineVersion:"3.1.0"}, select: { overallScore: true } },
      interviews: { where:{assessmentVersion:"rubric.v2",status:"COMPLETED"}, select: { overallScore: true } },
      applications: { select: { status: true } },
    },
  });

  return students.map((s: StudentWithMetricsPayload) => {
    const resumesCount = s.resumes.length;
    const atsScansCount = s.atsScans.length;
    const avgAtsScore =
      atsScansCount > 0
        ? Math.round(
            s.atsScans.reduce((sum, scan) => sum + scan.overallScore, 0) /
              atsScansCount,
          )
        : 0;

    const interviewsCount = s.interviews.length;
    const validInterviews = s.interviews.filter((i) => i.overallScore != null);
    const avgInterviewScore =
      validInterviews.length > 0
        ? Math.round(
            validInterviews.reduce((sum, i) => sum + (i.overallScore || 0), 0) /
              validInterviews.length,
          )
        : 0;

    const isPlaced =
      s.profile?.placementStatus === "PLACED";

    const rawMetrics: StudentRawMetrics = {
      profileCompletionScore: s.profile?.completionScore || 0,
      resumesCount,
      atsScansCount,
      averageAtsScore: avgAtsScore,
      interviewsCount,
      averageInterviewScore: avgInterviewScore,
    };

    const readiness = calculateStudentReadiness(rawMetrics);

    return {
      student: s,
      rawMetrics,
      readiness,
      isPlaced,
    };
  });
}

/**
 * Get Institute Dashboard Key Metrics & Placement Readiness Funnel
 */
export async function getInstituteDashboardStats(adminUserId:string) {
 const {institute}=await getOrCreateInstituteProfile(adminUserId);
 const rows=await getRawStudentMetricsForInstitute(institute.id);
 const funnel=aggregateInstitutionFunnel(rows.map(r=>({...r.rawMetrics,isPlaced:r.isPlaced})));
 const memberWhere={instituteId:institute.id,role:{in:["CANDIDATE","INSTITUTE_STUDENT"]}};
 const shareWhere={...memberWhere,profile:{careerJson:{contains:'"instituteAnalyticsConsent":true'}}};
 const [totalStudents,applications]=await Promise.all([db.user.count({where:memberWhere}),db.jobApplication.findMany({where:{user:shareWhere},orderBy:{createdAt:"desc"},include:{user:{select:{id:true,name:true,email:true}},job:{select:{id:true,title:true,company:true}}}})]);
 return {instituteName:institute.name,verificationStatus:institute.verificationStatus || "PENDING",totalStudents,activeStudents:totalStudents,consentingStudents:rows.length,profileCompleteCount:funnel.profileCompleteCount,resumeReadyCount:funnel.resumeReadyCount,atsReadyCount:funnel.atsReadyCount,interviewReadyCount:funnel.interviewReadyCount,placementReadyCount:funnel.placementReadyCount,placedCount:funnel.placedCount,totalApplications:applications.length,shortlistedCount:applications.filter(a=>a.status==="SHORTLISTED").length,interviewsCount:applications.filter(a=>a.status==="INTERVIEW").length,offersCount:applications.filter(a=>a.status==="OFFERED").length,funnel:{...funnel,totalStudents:rows.length},recentApplications:applications.slice(0,5).map(a=>({id:a.id,studentName:a.user.name,studentEmail:a.user.email,jobTitle:a.job.title,company:a.job.company,status:a.status,appliedAt:a.createdAt.toISOString()}))};
}

/**
 * Get Student Roster with server-side search, filtering, and pagination
 */
export async function getInstituteStudents(
  adminUserId: string,
  filters: StudentFilterInput = {},
) {
  const { institute } = await getOrCreateInstituteProfile(adminUserId);

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {
    instituteId: institute.id,
    role: { in: ["CANDIDATE", "INSTITUTE_STUDENT"] },
  };

  const profileWhere: Prisma.ProfileWhereInput = {};

  if (filters.department && filters.department !== "ALL") {
    profileWhere.department = filters.department;
  }
  if (filters.course && filters.course !== "ALL") {
    profileWhere.course = filters.course;
  }
  if (filters.graduationYear) {
    profileWhere.graduationYear = filters.graduationYear;
  }
  if (filters.placementStatus && filters.placementStatus !== "ALL") {
    profileWhere.placementStatus = filters.placementStatus;
  }

  if (Object.keys(profileWhere).length > 0) {
    where.profile = profileWhere;
  }

  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
      { profile: { studentId: { contains: q } } },
      { profile: { department: { contains: q } } },
    ];
  }

  const [totalCount, students] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        profile: true,
        resumes: { select: { id: true } },
        atsScans: { where:{scoringEngineVersion:"3.1.0"}, select: { overallScore: true } },
        interviews: { where:{assessmentVersion:"rubric.v2",status:"COMPLETED"}, select: { overallScore: true } },
        applications: { select: { status: true } },
      },
    }),
  ]);

  const mappedStudents = students.map((s) => {
    const resumesCount = s.resumes.length;
    const atsScansCount = s.atsScans.length;
    const avgAtsScore =
      atsScansCount > 0
        ? Math.round(
            s.atsScans.reduce((sum, scan) => sum + scan.overallScore, 0) /
              atsScansCount,
          )
        : 0;

    const validInterviews = s.interviews.filter((i) => i.overallScore != null);
    const avgInterviewScore =
      validInterviews.length > 0
        ? Math.round(
            validInterviews.reduce((sum, i) => sum + (i.overallScore || 0), 0) /
              validInterviews.length,
          )
        : 0;

    const rawMetrics: StudentRawMetrics = {
      profileCompletionScore: s.profile?.completionScore || 0,
      resumesCount,
      atsScansCount,
      averageAtsScore: avgAtsScore,
      interviewsCount: s.interviews.length,
      averageInterviewScore: avgInterviewScore,
    };

    const shared=parseJson(s.profile?.careerJson,defaultCareer).instituteAnalyticsConsent;
    const readiness = shared ? calculateStudentReadiness(rawMetrics):{isProfileReady:false,isResumeReady:false,isAtsReady:false,isInterviewReady:false,isPlacementReady:false,readinessCategory:"Not shared" as const};

    return {
      id: s.id,
      name: s.name,
      email: s.email,
      studentId: s.profile?.studentId || null,
      department: s.profile?.department || "General",
      course: s.profile?.course || "N/A",
      graduationYear: s.profile?.graduationYear || null,
      profileCompletion: s.profile?.completionScore || 0,
      resumesCount: shared ? resumesCount:null,
      sharingStatus:shared ? "SHARED":"PRIVATE",
      averageAtsScore: shared ? avgAtsScore:null,
      averageInterviewScore: shared ? avgInterviewScore:null,
      placementStatus: s.profile?.placementStatus || "LOOKING",
      readiness,
    };
  });

  let finalStudents = mappedStudents;
  if (filters.readinessStatus && filters.readinessStatus !== "ALL") {
    if (filters.readinessStatus === "READY") {
      finalStudents = mappedStudents.filter(
        (s) => s.readiness.isPlacementReady,
      );
    } else if (filters.readinessStatus === "NEEDS_IMPROVEMENT") {
      finalStudents = mappedStudents.filter(
        (s) => s.readiness.readinessCategory === "Needs Improvement",
      );
    } else if (filters.readinessStatus === "NOT_READY") {
      finalStudents = mappedStudents.filter(
        (s) => s.readiness.readinessCategory === "Not Ready",
      );
    }
  }

  return {
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit) || 1,
    students: finalStudents,
  };
}

/**
 * Get Student Detail with server-side multi-tenant ownership check
 */
export async function getInstituteStudentDetail(
  adminUserId: string,
  studentId: string,
) {
  const { institute } = await getOrCreateInstituteProfile(adminUserId);

  const permission=await db.user.findFirst({where:{id:studentId,instituteId:institute.id,role:{in:["CANDIDATE","INSTITUTE_STUDENT"]}},select:{profile:{select:{careerJson:true}}}});
  if(!permission || !parseJson(permission.profile?.careerJson,defaultCareer).mentorConsent)throw new Error("Forbidden. The candidate has not consented to mentor access.");
  const student = await db.user.findUnique({
    where: { id: studentId },
    include: {
      profile: true,
      resumes: { orderBy: { updatedAt: "desc" } },
      atsScans: { where:{scoringEngineVersion:"3.1.0"},orderBy: { createdAt: "desc" } },
      interviews: { where:{assessmentVersion:"rubric.v2"},orderBy: { createdAt: "desc" } },
      applications: {
        orderBy: { createdAt: "desc" },
        include: {
          job: {
            select: { id: true, title: true, company: true, location: true },
          },
        },
      },
    },
  });

  if (!student) {
    throw new Error("Student record not found.");
  }

  // Security Check: Enforce institute ownership
  if (student.instituteId !== institute.id) {
    throw new Error("Unauthorized. Student belongs to another institute.");
  }

  const resumesCount = student.resumes.length;
  const atsScansCount = student.atsScans.length;
  const avgAtsScore =
    atsScansCount > 0
      ? Math.round(
          student.atsScans.reduce((sum, s) => sum + s.overallScore, 0) /
            atsScansCount,
        )
      : 0;

  const validInterviews = student.interviews.filter(
    (i) => i.overallScore != null,
  );
  const avgInterviewScore =
    validInterviews.length > 0
      ? Math.round(
          validInterviews.reduce((sum, i) => sum + (i.overallScore || 0), 0) /
            validInterviews.length,
        )
      : 0;

  const rawMetrics: StudentRawMetrics = {
    profileCompletionScore: student.profile?.completionScore || 20,
    resumesCount,
    atsScansCount,
    averageAtsScore: avgAtsScore,
    interviewsCount: student.interviews.length,
    averageInterviewScore: avgInterviewScore,
  };

  const readiness = calculateStudentReadiness(rawMetrics);

  await db.activityLog.create({
    data: {
      userId: adminUserId,
      type: "STUDENT_VIEWED",
      title: `Viewed Student: ${student.name}`,
      detail: `ID ${student.id}`,
    },
  });

  return {
    id: student.id,
    name: student.name,
    email: student.email,
    profile: student.profile
      ? {
          headline: student.profile.headline,
          bio: student.profile.bio,
          phone: student.profile.phone,
          location: student.profile.location,
          avatarUrl: student.profile.avatarUrl,
          skills: student.profile.skills,
          experienceYears: student.profile.experienceYears,
          education: student.profile.education,
          department: student.profile.department || "General",
          course: student.profile.course || "N/A",
          graduationYear: student.profile.graduationYear || null,
          studentId: student.profile.studentId || null,
          placementStatus: student.profile.placementStatus || "LOOKING",
          completionScore: student.profile.completionScore,
        }
      : null,
    readiness,
    resumes: student.resumes.map((r) => ({
      id: r.id,
      title: r.title,
      templateId: r.templateId,
      contentJson: r.contentJson,
      updatedAt: r.updatedAt.toISOString(),
    })),
    atsScans: student.atsScans.map((s) => ({
      id: s.id,
      targetJobTitle: s.targetJobTitle,
      companyName: s.companyName,
      overallScore: s.overallScore,
      createdAt: s.createdAt.toISOString(),
    })),
    interviews: student.interviews.map((i) => ({
      id: i.id,
      jobRole: i.targetJobTitle,
      type: i.interviewType,
      totalScore: i.overallScore,
      isCompleted: i.status === "COMPLETED",
      createdAt: i.createdAt.toISOString(),
    })),
    applications: student.applications.map((a) => ({
      id: a.id,
      jobId: a.job.id,
      jobTitle: a.job.title,
      companyName: a.job.company,
      location: a.job.location,
      status: a.status,
      appliedAt: a.createdAt.toISOString(),
    })),
  };
}

/**
 * Get Campus Marketplace Jobs with applicant counts from this institute's students
 */
export async function getInstituteJobs(adminUserId: string) {
  const { institute } = await getOrCreateInstituteProfile(adminUserId);

  const [jobs, instituteStudents] = await Promise.all([
    db.jobPosting.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.user.findMany({
      where: { instituteId: institute.id },
      select: { id: true },
    }),
  ]);

  const studentUserIds = instituteStudents.map((s) => s.id);

  const applications =
    studentUserIds.length > 0
      ? await db.jobApplication.findMany({
          where: { userId: { in: studentUserIds } },
          select: { jobId: true },
        })
      : [];

  const appCountByJob: Record<string, number> = {};
  for (const app of applications) {
    appCountByJob[app.jobId] =
      (app.jobId in appCountByJob ? appCountByJob[app.jobId] : 0) + 1;
  }

  return jobs.map((job) => ({
    id: job.id,
    title: job.title,
    company: job.company,
    companyLogo: job.companyLogo,
    location: job.location,
    workMode: job.workMode,
    type: job.type,
    experience: job.experience,
    salary: job.salary,
    postedAt: job.postedAt.toISOString(),
    instituteApplicantsCount: appCountByJob[job.id] || 0,
  }));
}

/**
 * Get Specific Job Posting Details with Institute Student Applicants
 */
export async function getInstituteJobDetails(
  adminUserId: string,
  jobId: string,
) {
  const { institute } = await getOrCreateInstituteProfile(adminUserId);

  const job = await db.jobPosting.findUnique({
    where: { id: jobId },
  });

  if (!job) throw new Error("Job posting not found.");

  const instituteStudents = await db.user.findMany({
    where: { instituteId: institute.id },
    select: {
      id: true,
      name: true,
      email: true,
      profile: {
        select: { department: true, course: true, graduationYear: true },
      },
    },
  });
  const studentMap = new Map(instituteStudents.map((s) => [s.id, s]));
  const studentUserIds = Array.from(studentMap.keys());

  const applications =
    studentUserIds.length > 0
      ? await db.jobApplication.findMany({
          where: {
            jobId,
            userId: { in: studentUserIds },
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

  const applicants = applications.map((app) => {
    const student = studentMap.get(app.userId);
    return {
      id: app.id,
      studentId: app.userId,
      studentName: student?.name || "Candidate Student",
      studentEmail: student?.email || "N/A",
      department: student?.profile?.department || "General",
      course: student?.profile?.course || "N/A",
      graduationYear: student?.profile?.graduationYear || null,
      status: app.status,
      appliedAt: app.createdAt.toISOString(),
    };
  });

  return {
    job: {
      id: job.id,
      title: job.title,
      company: job.company,
      companyLogo: job.companyLogo,
      description: job.description,
      requirements: job.requirements,
      location: job.location,
      workMode: job.workMode,
      type: job.type,
      experience: job.experience,
      salary: job.salary,
      postedAt: job.postedAt.toISOString(),
    },
    applicants,
  };
}

/**
 * Get Institution-Wide Applications Tracker
 */
export async function getInstituteApplications(
  adminUserId: string,
  filters: { status?: string; search?: string } = {},
) {
  const { institute } = await getOrCreateInstituteProfile(adminUserId);

  const students = await db.user.findMany({
    where: { instituteId: institute.id,role:{in:["CANDIDATE","INSTITUTE_STUDENT"]},profile:{careerJson:{contains:'"instituteAnalyticsConsent":true'}} },
    select: { id: true },
  });
  const studentUserIds = students.map((s) => s.id);

  if (studentUserIds.length === 0) return [];

  const where: Record<string, unknown> = {
    userId: { in: studentUserIds },
  };

  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status;
  }

  const apps = await db.jobApplication.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          profile: { select: { department: true, course: true } },
        },
      },
      job: {
        select: { id: true, title: true, company: true, location: true },
      },
    },
  });

  let result = apps.map((app) => ({
    id: app.id,
    studentId: app.user.id,
    studentName: app.user.name,
    studentEmail: app.user.email,
    department: app.user.profile?.department || "General",
    jobTitle: app.job.title,
    companyName: app.job.company,
    location: app.job.location,
    status: app.status,
    appliedAt: app.createdAt.toISOString(),
  }));

  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    result = result.filter(
      (a) =>
        a.studentName.toLowerCase().includes(q) ||
        a.studentEmail.toLowerCase().includes(q) ||
        a.companyName.toLowerCase().includes(q) ||
        a.jobTitle.toLowerCase().includes(q),
    );
  }

  return result;
}

/**
 * Update Application Pipeline Status with institute multi-tenant ownership check
 */
export async function updateInstituteApplicationStatus(
  adminUserId: string, applicationId: string, newStatus: ApplicationState,
) {
  const { institute } = await getOrCreateInstituteProfile(adminUserId);
  const application = await db.jobApplication.findFirst({
    where: { id: applicationId, user: { instituteId: institute.id } },
    select:{id:true,status:true},
  });
  if (!application) throw new Error("Application not found or Unauthorized.");
  if (application.status === newStatus) return {id:application.id,status:application.status};
  throw new Error("Forbidden. Hiring status is managed by the employer. Use student mentoring notes to track preparation.");
}

/**
 * 1-Click Demo Applications Data Seeder for Institute Portal
 */
export async function seedInstituteDemoApplications(adminUserId: string) {
  if(process.env.NODE_ENV=== "production" || process.env.ALLOW_DEMO_SEED!=="true")throw new Error("Forbidden. Demo seeding is disabled.");
  const { institute } = await getOrCreateInstituteProfile(adminUserId);
  const defaultPasswordHash = await hashPassword("Student@Vantory2025");

  const students = await db.user.findMany({
    where: {
      instituteId: institute.id,
      role: { in: ["CANDIDATE", "INSTITUTE_STUDENT"] },
    },
    select: { id: true, name: true, email: true },
  });

  if (students.length === 0) {
    const demoStudentsData = [
      {
        name: "Alex Morgan",
        email: "alex.morgan@campus.edu",
        dept: "Computer Science",
        course: "B.Tech",
      },
      {
        name: "David Chen",
        email: "david.chen@campus.edu",
        dept: "Information Technology",
        course: "B.Tech",
      },
      {
        name: "Priya Sharma",
        email: "priya.sharma@campus.edu",
        dept: "Electronics & Comm",
        course: "B.Tech",
      },
    ];

    for (const d of demoStudentsData) {
      const u = await db.user.create({
        data: {
          name: d.name,
          email: d.email,
          passwordHash: defaultPasswordHash,
          role: "CANDIDATE",
          instituteId: institute.id,
          profile: {
            create: {
              department: d.dept,
              course: d.course,
              graduationYear: 2027,
              completionScore: 85,
              placementStatus: "LOOKING",
            },
          },
        },
      });
      students.push({ id: u.id, name: u.name, email: u.email });
    }
  }

  const jobs = await db.jobPosting.findMany({
    where: { status: "ACTIVE" },
    take: 4,
  });

  if (jobs.length === 0) {
    const sampleJob = await db.jobPosting.create({
      data: {
        title: "Frontend Software Engineer",
        company: "Vantory Tech Partners",
        location: "Remote / Hybrid",
        workMode: "HYBRID",
        type: "FULL_TIME",
        experience: "0-2 Years",
        salary: "₹12 - ₹16 LPA",
        description: "Building next-generation campus placement products.",
        requirements: "React, Next.js, TypeScript, TailwindCSS.",
        status: "ACTIVE",
      },
    });
    jobs.push(sampleJob);
  }

  const statuses: ApplicationState[] = [
    ApplicationState.SHORTLISTED,
    ApplicationState.INTERVIEW,
    ApplicationState.OFFERED,
    ApplicationState.APPLIED,
  ];

  let createdCount = 0;
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const job = jobs[i % jobs.length];
    const status = statuses[i % statuses.length];

    const existing = await db.jobApplication.findFirst({
      where: { userId: student.id, jobId: job.id },
    });

    if (!existing) {
      await db.jobApplication.create({
        data: {
          userId: student.id,
          jobId: job.id,
          status,
          coverNote: "Interested in campus hiring drive.",
        },
      });
      createdCount++;
    }
  }

  return { success: true, createdCount };
}

/**
 * Get Institution Placement & Department Analytics
 */
export async function getInstituteAnalytics(adminUserId: string) {
  const { institute } = await getOrCreateInstituteProfile(adminUserId);

  const studentData = await getRawStudentMetricsForInstitute(institute.id);
  const funnel = aggregateInstitutionFunnel(
    studentData.map((d) => ({ ...d.rawMetrics, isPlaced: d.isPlaced })),
  );

  // Department Breakdowns
  const deptMap: Record<
    string,
    { total: number; ready: number; placed: number }
  > = {};

  const skillCounts: Record<string, number> = {};

  for (const item of studentData) {
    const dept = item.student.profile?.department || "General";
    if (!(dept in deptMap)) {
      deptMap[dept] = { total: 0, ready: 0, placed: 0 };
    }
    deptMap[dept].total++;
    if (item.readiness.isPlacementReady) deptMap[dept].ready++;
    if (item.isPlaced) deptMap[dept].placed++;

    const rawSkills = item.student.profile?.skills || "";
    if (rawSkills) {
      const skillsArray = rawSkills.split(",").map((s: string) => s.trim());
      for (const s of skillsArray) {
        if (s) skillCounts[s] = (s in skillCounts ? skillCounts[s] : 0) + 1;
      }
    }
  }

  const departmentAnalytics = Object.keys(deptMap).map((dept) => ({
    department: dept,
    totalStudents: deptMap[dept].total,
    placementReadyCount: deptMap[dept].ready,
    placedCount: deptMap[dept].placed,
  }));

  const topSkills = Object.entries(skillCounts)
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalMembers: await db.user.count({where:{instituteId:institute.id,role:{in:["CANDIDATE","INSTITUTE_STUDENT"]}}}),
    consentingStudents: studentData.length,
    funnel,
    departmentAnalytics,
    topSkills,
  };
}

/**
 * Import Students via CSV Roster
 */
export async function importInstituteStudentsCsv(
  adminUserId: string,
  csvRows: Array<{ name: string; email: string; studentId?: string; department?: string; course?: string; graduationYear?: number }>,
) {
  const { institute } = await getOrCreateInstituteProfile(adminUserId);
  if (csvRows.length > 1000) throw new Error("A roster can contain at most 1000 rows.");
  let importedCount = 0, skippedCount = 0, invitedCount = 0;
  const conflicts: Array<{ row: number; email: string; reason: string }> = [];
  const seen = new Set<string>();
  for (const [index, row] of csvRows.entries()) {
    const email = typeof row.email === "string" ? row.email.trim().toLowerCase() : "";
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || seen.has(email)) {
      skippedCount++; conflicts.push({ row: index + 1, email, reason: "Invalid or duplicate row." }); continue;
    }
    seen.add(email);
    const existing = await db.user.findUnique({ where: { email }, include: { profile: true } });
    if (existing && (!["CANDIDATE", "INSTITUTE_STUDENT"].includes(existing.role) || (existing.instituteId && existing.instituteId !== institute.id))) {
      skippedCount++; conflicts.push({ row: index + 1, email, reason: "This account cannot be added to this institute." }); continue;
    }
    const roster = {
      studentId: typeof row.studentId === "string" ? row.studentId.trim().slice(0, 100) : null,
      department: typeof row.department === "string" ? row.department.trim().slice(0, 100) : null,
      course: typeof row.course === "string" ? row.course.trim().slice(0, 100) : null,
      graduationYear: Number.isInteger(row.graduationYear) && row.graduationYear! >= 1990 && row.graduationYear! <= 2100 ? row.graduationYear : null,
    };
    if (existing?.instituteId === institute.id) { importedCount++; continue; }
    await db.instituteInvitation.upsert({
      where: { instituteId_email: { instituteId: institute.id, email } },
      create: { instituteId: institute.id, email, name, rosterJson: JSON.stringify(roster), expiresAt: new Date(Date.now() + 30 * 86400000) },
      update: { name, rosterJson: JSON.stringify(roster), status: "PENDING", expiresAt: new Date(Date.now() + 30 * 86400000) },
    });
    invitedCount++;
  }
  return { importedCount, skippedCount, invitedCount, conflicts };
}

/**
 * Generate Institutional Reports & CSV Exports for the authenticated Institute Admin's institute
 */
export async function generateInstituteReports(
  adminUserId: string,
  reportType:
    | "readiness"
    | "department"
    | "placement"
    | "applications"
    | "skills" = "readiness",
) {
  const { institute } = await getOrCreateInstituteProfile(adminUserId);
  const studentData = await getRawStudentMetricsForInstitute(institute.id);

  if (reportType === "readiness") {
    const rows = studentData.map((s) => ({
      studentId: s.student.profile?.studentId || "N/A",
      fullName: s.student.name,
      email: s.student.email,
      department: s.student.profile?.department || "N/A",
      course: s.student.profile?.course || "N/A",
      graduationYear: s.student.profile?.graduationYear || "N/A",
      profileScore: `${s.rawMetrics.profileCompletionScore}%`,
      resumesCount: s.rawMetrics.resumesCount,
      averageAtsScore: s.rawMetrics.averageAtsScore,
      averageInterviewScore: s.rawMetrics.averageInterviewScore,
      readinessCategory: s.readiness.readinessCategory,
      isPlacementReady: s.readiness.isPlacementReady ? "YES" : "NO",
    }));

    const csvHeader =
      "Student ID,Full Name,Email,Department,Course,Graduation Year,Profile Score,Resumes Count,Avg ATS Score,Avg Interview Score,Readiness Category,Placement Ready\n";
    const csvRows = rows
      .map(
        (r) =>
          `"${r.studentId}","${r.fullName}","${r.email}","${r.department}","${r.course}","${r.graduationYear}","${r.profileScore}",${r.resumesCount},${r.averageAtsScore},${r.averageInterviewScore},"${r.readinessCategory}","${r.isPlacementReady}"`,
      )
      .join("\n");

    return {
      reportType,
      instituteName: institute.name,
      totalRecords: rows.length,
      rows,
      csvContent: csvHeader + csvRows,
    };
  }

  if (reportType === "department") {
    const analytics = await getInstituteAnalytics(adminUserId);
    const rows = analytics.departmentAnalytics.map((d) => ({
      department: d.department,
      totalStudents: d.totalStudents,
      placementReadyCount: d.placementReadyCount,
      readinessRate:
        d.totalStudents > 0
          ? `${Math.round((d.placementReadyCount / d.totalStudents) * 100)}%`
          : "0%",
      placedCount: d.placedCount,
      placementRate:
        d.totalStudents > 0
          ? `${Math.round((d.placedCount / d.totalStudents) * 100)}%`
          : "0%",
    }));

    const csvHeader =
      "Department,Total Students,Placement Ready Count,Readiness Rate,Placed Count,Placement Rate\n";
    const csvRows = rows
      .map(
        (r) =>
          `"${r.department}",${r.totalStudents},${r.placementReadyCount},"${r.readinessRate}",${r.placedCount},"${r.placementRate}"`,
      )
      .join("\n");

    return {
      reportType,
      instituteName: institute.name,
      totalRecords: rows.length,
      rows,
      csvContent: csvHeader + csvRows,
    };
  }

  if (reportType === "placement") {
    const rows = studentData.map((s) => ({
      studentId: s.student.profile?.studentId || "N/A",
      fullName: s.student.name,
      email: s.student.email,
      department: s.student.profile?.department || "N/A",
      placementStatus: s.student.profile?.placementStatus || "LOOKING",
      isPlaced: s.isPlaced ? "YES" : "NO",
      applicationsCount: s.student.applications.length,
      interviewsCount: s.rawMetrics.interviewsCount,
    }));

    const csvHeader =
      "Student ID,Full Name,Email,Department,Placement Status,Placed,Applications Submitted,Interviews Conducted\n";
    const csvRows = rows
      .map(
        (r) =>
          `"${r.studentId}","${r.fullName}","${r.email}","${r.department}","${r.placementStatus}","${r.isPlaced}",${r.applicationsCount},${r.interviewsCount}`,
      )
      .join("\n");

    return {
      reportType,
      instituteName: institute.name,
      totalRecords: rows.length,
      rows,
      csvContent: csvHeader + csvRows,
    };
  }

  if (reportType === "applications") {
    const applications = await getInstituteApplications(adminUserId);
    const rows = applications.map((a) => ({
      applicationId: a.id,
      studentName: a.studentName,
      studentEmail: a.studentEmail,
      department: a.department,
      jobTitle: a.jobTitle,
      companyName: a.companyName,
      status: a.status,
      appliedAt: a.appliedAt || "N/A",
    }));

    const csvHeader =
      "Application ID,Student Name,Student Email,Department,Job Title,Company,Status,Date Applied\n";
    const csvRows = rows
      .map(
        (r) =>
          `"${r.applicationId}","${r.studentName}","${r.studentEmail}","${r.department}","${r.jobTitle}","${r.companyName}","${r.status}","${r.appliedAt}"`,
      )
      .join("\n");

    return {
      reportType,
      instituteName: institute.name,
      totalRecords: rows.length,
      rows,
      csvContent: csvHeader + csvRows,
    };
  }

  // reportType === "skills"
  const analytics = await getInstituteAnalytics(adminUserId);
  const totalStudents = studentData.length;
  const rows = analytics.topSkills.map((s) => ({
    skill: s.skill,
    count: s.count,
    percentage:
      totalStudents > 0
        ? `${Math.round((s.count / totalStudents) * 100)}%`
        : "0%",
  }));

  const csvHeader = "Skill Name,Student Count,Roster Percentage\n";
  const csvRows = rows
    .map((r) => `"${r.skill}",${r.count},"${r.percentage}"`)
    .join("\n");

  return {
    reportType,
    instituteName: institute.name,
    totalRecords: rows.length,
    rows,
    csvContent: csvHeader + csvRows,
  };
}
