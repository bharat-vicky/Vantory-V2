import { NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/validation/auth";
import { requestPasswordReset } from "@/lib/services/auth/email-tokens";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const value =
      body && typeof body === "object"
        ? (body as Record<string, unknown>).email
        : null;
    if (typeof value === "string") {
      const email = normalizeEmail(value);
      if (email.length <= 254) await requestPasswordReset(email);
    }
  } catch (error) {
    console.error("Password reset email could not be requested.", error);
  }

  return NextResponse.json({
    success: true,
    message:
      "If a verified account exists for that email, a reset link will be sent.",
  });
}
