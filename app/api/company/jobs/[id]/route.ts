import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/authorization";
import { updateCompanyJob, deleteCompanyJob } from "@/lib/company/company-service";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }

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

    if (!job) {
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
        status: job.status,
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
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to load job details.";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const user = await getCurrentUser();
    if (!user || (user.role !== "COMPANY_ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized. Company Admin role required." }, { status: 403 });
    }

    const body = await request.json();
    const updated = await updateCompanyJob(user.id, jobId, body);
    return NextResponse.json({ success: true, job: updated });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update job posting.";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
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
