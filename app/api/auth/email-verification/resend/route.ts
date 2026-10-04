import { NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/validation/auth";
import { resendEmailVerification } from "@/lib/services/auth/email-tokens";
import { authRequestLimit } from "@/lib/auth/request-rate-limit";

export async function POST(request: Request) {
  let email = "";
  try {
    const body: unknown = await request.json();
    const value =
      body && typeof body === "object"
        ? (body as Record<string, unknown>).email
        : null;
    if (typeof value === "string") email = normalizeEmail(value);
    const limited = await authRequestLimit(request, "verification-resend", email);
    if (limited) return limited;
    if (email && email.length <= 254) await resendEmailVerification(email);
  } catch (error) {
    console.error("Verification email resend could not be completed.", error);
  }

  return NextResponse.json({
    success: true,
    message:
      "If that account needs verification, a link will be sent to its email address.",
  });
}
