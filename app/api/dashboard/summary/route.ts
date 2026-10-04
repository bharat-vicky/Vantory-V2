import { readApplicationSnapshot } from "@/lib/jobs/snapshots";
import { NextResponse } from "next/server";
import { requireCandidate } from "@/lib/auth/authorization";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireCandidate();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }

    const [resumes, atsScans, applications, savedJobsCount, recentJobs] = await Promise.all([
      db.resume.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, templateId: true, updatedAt: true },
      }),
      db.atsScan.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          targetJobTitle: true,
          companyName: true,
          overallScore: true,
          confidenceLevel: true,
          scoringEngineVersion: true,
          createdAt: true,
        },
      }),
      db.jobApplication.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { job: { select: { title: true, company: true } } },
      }),
      db.savedJob.count({ where: { userId: user.id } }),
      db.jobPosting.findMany({
        where: { status: "ACTIVE", verificationStatus: "VERIFIED",OR:[{expiresAt:null},{expiresAt:{isSet:false}},{expiresAt:{gte:new Date()}}] },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          title: true,
          company: true,
          companyLogo: true,
          location: true,
          workMode: true,
          salary: true,
          createdAt: true,
        },
      }),
    ]);

    const formattedAtsScans = atsScans.map((s) => ({
      ...s,
      jobMatchScore: s.scoringEngineVersion==="3.1.0"?s.overallScore:null,
      confidenceLevel:s.scoringEngineVersion==="3.1.0"?s.confidenceLevel:"Historical / unvalidated",
      createdAt: s.createdAt.toISOString(),
    }));

    const formattedApplications = applications.map((a) => ({
      id: a.id,
      jobTitle: readApplicationSnapshot(a).job.title,
      company: readApplicationSnapshot(a).job.company,
      status: a.status,
      appliedAt: a.createdAt.toISOString(),
    }));

    const formattedJobs = recentJobs.map((j) => ({
      ...j,
      postedAt: j.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      user,
      resumes,
      atsScans: formattedAtsScans,
      applications: formattedApplications,
      savedJobsCount,
      applicationsCount:await db.jobApplication.count({where:{userId:user.id}}),
      recentJobs: formattedJobs,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
