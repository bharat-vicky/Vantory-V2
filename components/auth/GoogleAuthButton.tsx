"use client";

import { useEffect, useState } from "react";
import type { UserEcosystemRole } from "./RoleSelector";

const roleValues: Record<UserEcosystemRole, string> = {
  candidate: "CANDIDATE",
  company: "COMPANY_ADMIN",
  institute: "INSTITUTE_ADMIN",
};

const roleLabels: Record<UserEcosystemRole, string> = {
  candidate: "Candidate",
  company: "Company",
  institute: "Institute",
};

export function GoogleAuthButton({
  role,
  isSignup = false,
  organizationName,
}: {
  role: UserEcosystemRole;
  isSignup?: boolean;
  organizationName?: string;
}) {
  const [authError, setAuthError] = useState<string | null>(null);
  const needsOrganizationName =
    isSignup &&
    role !== "candidate" &&
    (organizationName || "").trim().length < 2;

  const startGoogleAuth = () => {
    const query = new URLSearchParams({
      role: roleValues[role],
      mode: isSignup ? "signup" : "login",
    });
    if (organizationName?.trim()) {
      query.set("organizationName", organizationName.trim());
    }
    window.location.assign(`/api/auth/google?${query.toString()}`);
  };

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");
    if (error === "google_unavailable") {
      setAuthError(
        "Google sign-in is not configured. Please use email and password.",
      );
    } else if (error === "google_auth_failed") {
      setAuthError("Google sign-in could not be completed. Please try again.");
    } else if (error === "google_role_mismatch") {
      setAuthError("This Google account belongs to a different portal.");
    } else if (error === "google_account_not_found") {
      setAuthError("No account exists for this portal. Choose Sign Up first.");
    } else if (error === "google_organization_required") {
      setAuthError("Enter your organization name to sign up with Google.");
    }
  }, []);

  return (
    <div className="space-y-3 pt-1">
      {authError && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
        >
          {authError}
        </p>
      )}
      <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-wider text-neutral-400">
        <span className="h-px flex-1 bg-neutral-200" />
        <span>Or continue with</span>
        <span className="h-px flex-1 bg-neutral-200" />
      </div>
      <button
        type="button"
        onClick={startGoogleAuth}
        disabled={needsOrganizationName}
        className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-neutral-300 bg-white text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span aria-hidden="true" className="font-bold text-base">
          G
        </span>
        Continue as {roleLabels[role]} with Google
      </button>
      {isSignup && (
        <p className="text-center text-[11px] text-neutral-500">
          {needsOrganizationName
            ? `Enter a ${roleLabels[role].toLowerCase()} name to continue.`
            : `Google access will be limited to the ${roleLabels[role]} portal.`}
        </p>
      )}
    </div>
  );
}
