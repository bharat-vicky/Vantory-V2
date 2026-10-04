import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  encodeGoogleAuthContext,
  getGoogleRedirectUri,
  GOOGLE_AUTH_CONTEXT_COOKIE,
} from "@/lib/auth/google-oauth";
import { isPublicRegistrationRole } from "@/lib/validation/auth";

const GOOGLE_STATE_COOKIE = "vantory_google_oauth_state";

function authRedirect(
  request: NextRequest,
  error: string,
  role: string,
  mode: string,
) {
  const destination = new URL(
    mode === "signup" ? "/register" : "/login",
    request.url,
  );
  destination.searchParams.set("error", error);
  if (isPublicRegistrationRole(role)) {
    destination.searchParams.set(
      "role",
      role === "COMPANY_ADMIN"
        ? "company"
        : role === "INSTITUTE_ADMIN"
          ? "institute"
          : "candidate",
    );
  }
  return NextResponse.redirect(destination);
}

export async function GET(request: NextRequest) {
  const role = request.nextUrl.searchParams.get("role") || "CANDIDATE";
  const mode = request.nextUrl.searchParams.get("mode") || "login";
  const organizationName =
    request.nextUrl.searchParams.get("organizationName")?.trim() || null;

  if (
    !isPublicRegistrationRole(role) ||
    (mode !== "login" && mode !== "signup")
  ) {
    return authRedirect(request, "google_auth_failed", role, mode);
  }

  if (
    mode === "signup" &&
    role !== "CANDIDATE" &&
    (!organizationName || organizationName.length < 2)
  ) {
    return authRedirect(request, "google_organization_required", role, mode);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
    return authRedirect(request, "google_unavailable", role, mode);
  }

  let redirectUri: string;
  try {
    redirectUri = getGoogleRedirectUri(
      process.env.GOOGLE_REDIRECT_URI,
      process.env.NEXT_PUBLIC_APP_URL,
      request.nextUrl.origin,
    );
  } catch {
    return authRedirect(request, "google_unavailable", role, mode);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const state = randomBytes(32).toString("hex");
  const authorizationUrl = new URL(
    "https://accounts.google.com/o/oauth2/v2/auth",
  );
  authorizationUrl.searchParams.set("client_id", clientId);
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", "openid email profile");
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authorizationUrl);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api/auth/google/callback",
    maxAge: 10 * 60,
  };
  response.cookies.set(GOOGLE_STATE_COOKIE, state, cookieOptions);
  response.cookies.set(
    GOOGLE_AUTH_CONTEXT_COOKIE,
    encodeGoogleAuthContext({
      state,
      role,
      mode,
      organizationName,
    }),
    cookieOptions,
  );
  return response;
}
