import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth/session";
import { parseVerifiedGoogleProfile } from "@/lib/auth/google-profile";
import {
  decodeGoogleAuthContext,
  getGoogleRedirectUri,
  GOOGLE_AUTH_CONTEXT_COOKIE,
  googleRoleMatchesPortal,
  type GoogleAuthContext,
} from "@/lib/auth/google-oauth";

const GOOGLE_STATE_COOKIE = "vantory_google_oauth_state";

function logGoogleCallbackRejection(
  stage: string,
  reason: string,
  status?: number,
) {
  console.warn("Google OAuth callback rejected", { stage, reason, status });
}

function getRedirectUrl(role: string): string {
  if (role === "COMPANY_ADMIN") return "/company/dashboard";
  if (role === "INSTITUTE_ADMIN" || role === "SUPER_ADMIN") {
    return "/institute/dashboard";
  }
  return "/dashboard";
}

function authFailure(
  request: NextRequest,
  error = "google_auth_failed",
  context: GoogleAuthContext | null = null,
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const destination = new URL(
    context?.mode === "signup" ? "/register" : "/login",
    appUrl,
  );
  destination.searchParams.set("error", error);
  if (context) {
    const role =
      context.role === "COMPANY_ADMIN"
        ? "company"
        : context.role === "INSTITUTE_ADMIN"
          ? "institute"
          : "candidate";
    destination.searchParams.set("role", role);
  }
  return NextResponse.redirect(destination);
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GOOGLE_STATE_COOKIE)?.value;
  const contextCookie = cookieStore.get(GOOGLE_AUTH_CONTEXT_COOKIE)?.value;
  const receivedState = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  await cookieStore.delete(GOOGLE_STATE_COOKIE);
  await cookieStore.delete(GOOGLE_AUTH_CONTEXT_COOKIE);
  const context = decodeGoogleAuthContext(contextCookie);

  if (
    !expectedState ||
    !receivedState ||
    expectedState !== receivedState ||
    context?.state !== receivedState ||
    !code
  ) {
    logGoogleCallbackRejection("state_validation", "state_or_code_mismatch");
    return authFailure(request, undefined, context);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    logGoogleCallbackRejection("configuration", "missing_oauth_credentials");
    return authFailure(request, undefined, context);
  }

  let stage = "token_exchange";
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const redirectUri = getGoogleRedirectUri(
      process.env.GOOGLE_REDIRECT_URI,
      process.env.NEXT_PUBLIC_APP_URL,
      request.nextUrl.origin,
    );
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    });

    if (!tokenResponse.ok) {
      const tokenError: unknown = await tokenResponse.json().catch(() => null);
      const reason =
        tokenError &&
        typeof tokenError === "object" &&
        typeof (tokenError as Record<string, unknown>).error === "string"
          ? (tokenError as { error: string }).error
          : "token_exchange_rejected";
      logGoogleCallbackRejection(stage, reason, tokenResponse.status);
      return authFailure(request, undefined, context);
    }
    const tokenData: unknown = await tokenResponse.json();
    if (
      !tokenData ||
      typeof tokenData !== "object" ||
      typeof (tokenData as Record<string, unknown>).access_token !== "string"
    ) {
      logGoogleCallbackRejection(
        stage,
        "missing_access_token",
        tokenResponse.status,
      );
      return authFailure(request, undefined, context);
    }

    const accessToken = (tokenData as { access_token: string }).access_token;
    stage = "google_profile";
    const profileResponse = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      },
    );
    if (!profileResponse.ok) {
      logGoogleCallbackRejection(
        stage,
        "profile_request_rejected",
        profileResponse.status,
      );
      return authFailure(request, undefined, context);
    }

    const profile = parseVerifiedGoogleProfile(await profileResponse.json());
    if (!profile) {
      logGoogleCallbackRejection(stage, "unverified_or_invalid_profile");
      return authFailure(request, undefined, context);
    }

    stage = "account_lookup";
    let user = await db.user.findUnique({ where: { email: profile.email } });
    if (user && user.isActive === false) {
      logGoogleCallbackRejection("account_lookup", "account_inactive");
      return authFailure(request, "google_auth_failed", context);
    }
    if (user && !googleRoleMatchesPortal(user.role, context.role)) {
      logGoogleCallbackRejection("account_lookup", "portal_role_mismatch");
      return authFailure(request, "google_role_mismatch", context);
    }

    if (!user && context.mode === "login") {
      logGoogleCallbackRejection("account_lookup", "account_not_found");
      return authFailure(request, "google_account_not_found", context);
    }

    if (!user) {
      stage = "account_creation";
      user = await db.$transaction(async (tx) => {
        const name =
          context.role === "CANDIDATE"
            ? profile.name
            : context.organizationName!;
        const createdUser = await tx.user.create({
          data: {
            email: profile.email,
            emailVerifiedAt: new Date(),
            name,
            role: context.role,
            passwordHash: null,
          },
        });

        if (context.role === "CANDIDATE") {
          await tx.profile.create({
            data: {
              userId: createdUser.id,
              headline: "Candidate",
              completionScore: 25,
            },
          });
        } else if (context.role === "COMPANY_ADMIN") {
          await tx.companyProfile.create({
            data: {
              userId: createdUser.id,
              companyName: context.organizationName!,
            },
          });
        } else {
          const institute = await tx.institute.create({
            data: {
              name: context.organizationName!,
              contactEmail: profile.email,
            },
          });
          await tx.user.update({
            where: { id: createdUser.id },
            data: { instituteId: institute.id },
          });
        }

        await tx.activityLog.create({
          data: {
            userId: createdUser.id,
            type: "USER_REGISTERED",
            title: "Account Created",
            detail: `Registered with Google as ${context.role}.`,
          },
        });
        return createdUser;
      });
    } else {
      if (!user.emailVerifiedAt) {
        user = await db.user.update({
          where: { id: user.id },
          data: { emailVerifiedAt: new Date() },
        });
      }
      await db.activityLog.create({
        data: {
          userId: user.id,
          type: "USER_LOGIN",
          title: "Signed In",
          detail: "Authenticated with Google.",
        },
      });
    }

    stage = "session_creation";
    await setSessionCookie({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    const redirectRole = user.role === "SUPER_ADMIN" ? context.role : user.role;
    return NextResponse.redirect(new URL(getRedirectUrl(redirectRole), appUrl));
  } catch (error: unknown) {
    const detail =
      error instanceof Error ? error.message : "Unknown callback error.";
    console.error("Google OAuth callback failed", {
      stage,
      errorName: error instanceof Error ? error.name : "UnknownError",
      detail: detail.replace(
        /mongodb(?:\+srv)?:\/\/[^\s]+/gi,
        "mongodb://[redacted]",
      ),
    });
    return authFailure(request, undefined, context);
  }
}
