import { normalizeEmail } from "@/lib/validation/auth";

export interface VerifiedGoogleProfile {
  subject: string;
  email: string;
  name: string;
}

export function parseVerifiedGoogleProfile(
  value: unknown,
): VerifiedGoogleProfile | null {
  if (!value || typeof value !== "object") return null;

  const profile = value as Record<string, unknown>;
  if (
    typeof profile.sub !== "string" ||
    typeof profile.email !== "string" ||
    profile.email_verified !== true
  ) {
    return null;
  }

  const email = normalizeEmail(profile.email);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

  const name = typeof profile.name === "string" ? profile.name.trim() : "";
  return {
    subject: profile.sub,
    email,
    name: name || email.split("@")[0],
  };
}
