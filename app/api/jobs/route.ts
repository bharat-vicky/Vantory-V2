import { apiError } from "@/lib/api-error";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/authorization";
import { getFilteredJobs } from "@/lib/jobs/jobs-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const user = await getCurrentUser();

    const query = searchParams.get("query") || undefined;
    const jobType = searchParams.get("jobType") || undefined;
    const workMode = searchParams.get("workMode") || undefined;
    const experience = searchParams.get("experience") || undefined;
    const location = searchParams.get("location") || undefined;
    const company = searchParams.get("company") || undefined;
    const skills = searchParams.get("skills") || undefined;
    const salaryRange = searchParams.get("salaryRange") || undefined;
    const datePosted = searchParams.get("datePosted") || undefined;
    const sortBy = (searchParams.get("sortBy") as "recent" | "relevance" | "salary" | "experience") || "recent";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const result = await getFilteredJobs(
      {
        query,
        jobType,
        workMode,
        experience,
        location,
        company,
        skills,
        salaryRange,
        datePosted,
        sortBy,
        page,
        limit,
      },
      user?.id
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    return apiError(error);
  }
}
