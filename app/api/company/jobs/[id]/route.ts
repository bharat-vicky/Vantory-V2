import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/authorization";
import { updateCompanyJob, deleteCompanyJob } from "@/lib/company/company-service";
import { db } from "@/lib/db";
import {requireCompany,companyBody} from "@/lib/company/route-helpers";
import {ApiError,apiError,objectId} from "@/lib/api-error";
import {jobDisplayStatus} from "@/lib/jobs/availability";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const user = await requireCompany();
    if(!objectId(jobId))throw new ApiError("Invalid job ID.");

    const job = await db.jobPosting.findUnique({
      where: { id: jobId },
      include: {
        applications: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!job || job.companyUserId!==user.id) {
      return NextResponse.json({ success: false, error: "Job posting not found" }, { status: 404 });
    }

    // Count total jobs listed by this company
    const companyTotalJobs = await db.jobPosting.count({
      where: { companyUserId: job.companyUserId },
    });

    // Compute application stats breakdown
    const totalApplications = job.applications.length;
    const shortlistedCount = job.applications.filter(
      (a) => a.status === "SHORTLISTED" || a.status === "INTERVIEW"
    ).length;
    const underReviewCount = job.applications.filter(
      (a) => a.status === "UNDER_REVIEW" || a.status === "APPLIED"
    ).length;
    const offeredCount = job.applications.filter((a) => a.status === "OFFERED").length;

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        title: job.title,
        company: job.company,
        companyLogo: job.companyLogo,
        companyUserId: job.companyUserId,
        companyUrl: job.companyUrl,
        aboutCompany: job.aboutCompany,
        location: job.location,
        workMode: job.workMode,
        type: job.type,
        experience: job.experience,
        salary: job.salary,
        description: job.description,
        responsibilities: job.responsibilities,
        requirements: job.requirements,
        preferredRequirements: job.preferredRequirements,
        skills: job.skills,
        tags:job.tags,
        experienceMin:job.experienceMin,
        experienceMax:job.experienceMax,
        salaryMin:job.salaryMin,
        salaryMax:job.salaryMax,
        salaryPeriod:job.salaryPeriod,
        eligibility:job.eligibilityJson?JSON.parse(job.eligibilityJson):null,
        status: job.status,
        displayStatus:jobDisplayStatus(job),
        updatedAt:job.updatedAt.toISOString(),
        verificationStatus: job.verificationStatus,
        hiringContact: job.hiringContact,
        postedAt: job.postedAt.toISOString(),
        expiresAt: job.expiresAt ? job.expiresAt.toISOString() : null,
      },
      companyStats: {
        companyTotalJobs,
        totalApplications,
        shortlistedCount,
        underReviewCount,
        offeredCount,
      },
    },{headers:{"Cache-Control":"private, no-store"}});
  } catch (error: unknown) {
    return apiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const user = await requireCompany();
    const body = await companyBody(request);
    const updated = await updateCompanyJob(user.id, jobId, body);
    return NextResponse.json({ success: true, job: updated },{headers:{"Cache-Control":"private, no-store"}});
  } catch (error: unknown) {
    return apiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const user = await getCurrentUser();
    if (!user || (user.role !== "COMPANY_ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized. Company Admin role required." }, { status: 403 });
    }

    const result = await deleteCompanyJob(user.id, jobId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to delete job posting.";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
