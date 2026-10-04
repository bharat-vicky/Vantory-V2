import {
  hasPortalAccess,
  isPublicRegistrationRole,
  type PublicRegistrationRole,
} from "@/lib/validation/auth";

export const GOOGLE_AUTH_CONTEXT_COOKIE = "vantory_google_oauth_context";

export type GoogleAuthMode = "login" | "signup";

export interface GoogleAuthContext {
  state: string;
  role: PublicRegistrationRole;
  mode: GoogleAuthMode;
  organizationName: string | null;
}

export function encodeGoogleAuthContext(context: GoogleAuthContext): string {
  return Buffer.from(JSON.stringify(context)).toString("base64url");
}

export function decodeGoogleAuthContext(
  value: string | undefined,
): GoogleAuthContext | null {
  if (!value) return null;

  try {
    const context = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Partial<GoogleAuthContext>;
    const role = context.role;
    const mode = context.mode;
    const organizationName =
      typeof context.organizationName === "string"
        ? context.organizationName.trim()
        : null;

    if (
      typeof context.state !== "string" ||
      typeof role !== "string" ||
      !isPublicRegistrationRole(role) ||
      (mode !== "login" && mode !== "signup") ||
      (mode === "signup" &&
        role !== "CANDIDATE" &&
        (!organizationName || organizationName.length < 2))
    ) {
      return null;
    }

    return {
      state: context.state,
      role,
      mode,
      organizationName,
    };
  } catch {
    return null;
  }
}

export function googleRoleMatchesPortal(
  accountRole: string,
  portalRole: PublicRegistrationRole,
): boolean {
  return hasPortalAccess(accountRole, portalRole);
}

export function getGoogleRedirectUri(
  configuredRedirectUri: string | undefined,
  appUrl: string | undefined,
  requestOrigin: string,
): string {
  const callbackPath = "/api/auth/google/callback";
  const redirectUri = configuredRedirectUri?.trim()
    ? new URL(configuredRedirectUri.trim())
    : new URL(callbackPath, appUrl || requestOrigin);

  if (
    redirectUri.pathname !== callbackPath ||
    redirectUri.search ||
    redirectUri.hash ||
    (redirectUri.protocol !== "https:" && redirectUri.hostname !== "localhost")
  ) {
    throw new Error("Google redirect URI must be an HTTPS callback URL.");
  }

  return redirectUri.toString();
}
