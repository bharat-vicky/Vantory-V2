import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";

const COOKIE_NAME = "vantory_session";

// Route protection mappings
const candidateRoutes = [
  "/dashboard",
  "/profile",
  "/resume",
  "/ats-checker",
  "/mock-interview",
  "/resources",
  "/preparation",
  "/career-studio",
  "/opportunities",
  "/settings",
  "/jobs/saved",
  "/jobs/applications",
];

const companyRoutes = ["/company"];
const instituteRoutes = ["/institute"];
const candidateApiRoutes = [
  "/api/candidate",
  "/api/ai/enhance",
  "/api/applications",
  "/api/ats/analyze",
  "/api/ats/scans",
  "/api/dashboard/summary",
  "/api/interview",
  "/api/jobs/saved",
  "/api/resumes",
];

function getRoleLandingPath(role: string): string {
  if (role === "COMPANY_ADMIN") return "/company/dashboard";
  if (role === "INSTITUTE_ADMIN" || role === "SUPER_ADMIN") {
    return "/institute/dashboard";
  }
  return "/dashboard";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const tokenCookie = request.cookies.get(COOKIE_NAME);
  const token = tokenCookie?.value;

  const isCandidateRoute = candidateRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const isCompanyRoute = companyRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const isInstituteRoute = instituteRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const isApplicationResume = /^\/api\/applications\/[^/]+\/resume$/.test(pathname);
  const isCandidateApi =
    (!isApplicationResume && candidateApiRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    )) || /^\/api\/jobs\/[^/]+\/(apply|save)$/.test(pathname);
  const isCompanyApi = pathname.startsWith("/api/company/");
  const isInstituteApi = pathname.startsWith("/api/institute/");
  const isCandidatePortal = isCandidateRoute || isCandidateApi;
  const isCompanyPortal = isCompanyRoute || isCompanyApi;
  const isInstitutePortal = isInstituteRoute || isInstituteApi;
  const isProtected = isCandidatePortal || isCompanyPortal || isInstitutePortal;
  const isApiRequest = pathname.startsWith("/api/");
  let payload = null;
  if (token) {
    payload = await verifyToken(token);
  }

  const isAuthenticated = !!payload;

  // 1. Unauthenticated user accessing protected route -> Redirect to /login
  if (isProtected && !isAuthenticated) {
    if (isApiRequest) {
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 },
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role authorization boundary enforcement.
  if (isAuthenticated && payload) {
    if (isCandidatePortal && !["CANDIDATE","INSTITUTE_STUDENT"].includes(payload.role)) {
      if (isApiRequest) {
        return NextResponse.json(
          { success: false, error: "Candidate access required." },
          { status: 403 },
        );
      }
      return NextResponse.redirect(
        new URL(getRoleLandingPath(payload.role), request.url),
      );
    }
    if (
      isCompanyPortal &&
      payload.role !== "COMPANY_ADMIN" &&
      payload.role !== "SUPER_ADMIN"
    ) {
      if (isApiRequest) {
        return NextResponse.json(
          { success: false, error: "Company administrator access required." },
          { status: 403 },
        );
      }
      return NextResponse.redirect(
        new URL(getRoleLandingPath(payload.role), request.url),
      );
    }
    if (
      isInstitutePortal &&
      payload.role !== "INSTITUTE_ADMIN" &&
      payload.role !== "SUPER_ADMIN"
    ) {
      if (isApiRequest) {
        return NextResponse.json(
          { success: false, error: "Institute administrator access required." },
          { status: 403 },
        );
      }
      return NextResponse.redirect(
        new URL(getRoleLandingPath(payload.role), request.url),
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/resume/:path*",
    "/ats-checker/:path*",
    "/mock-interview/:path*",
    "/company/:path*",
    "/institute/:path*",
    "/resources/:path*",
    "/preparation/:path*",
    "/career-studio/:path*",
    "/opportunities/:path*",
    "/settings/:path*",
    "/jobs/saved/:path*",
    "/jobs/applications/:path*",
    "/api/:path*",
    "/login",
    "/register",
  ],
};
