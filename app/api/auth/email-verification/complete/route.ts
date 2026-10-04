import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth/errors";
import { completeEmailVerification } from "@/lib/services/auth/email-tokens";
import { authRequestLimit } from "@/lib/auth/request-rate-limit";

export async function POST(request: Request) {
  try {
    const limited = await authRequestLimit(request, "verification-complete");
    if (limited) return limited;
    const body: unknown = await request.json();
    const token =
      body && typeof body === "object"
        ? (body as Record<string, unknown>).token
        : null;
    if (typeof token !== "string" || token.length > 128) {
      return NextResponse.json(
        { success: false, error: "A valid verification link is required." },
        { status: 400 },
      );
    }

    await completeEmailVerification(token);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, code: error.code, error: error.message },
        { status: error.status },
      );
    }
    console.error(
      "Email verification failed due to an unexpected server error.",
      error,
    );
    return NextResponse.json(
      {
        success: false,
        error: "Email verification is temporarily unavailable.",
      },
      { status: 503 },
    );
  }
}
