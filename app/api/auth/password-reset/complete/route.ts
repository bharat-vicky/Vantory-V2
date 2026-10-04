import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth/errors";
import { completePasswordReset } from "@/lib/services/auth/email-tokens";
import { authRequestLimit } from "@/lib/auth/request-rate-limit";

export async function POST(request: Request) {
  try {
    const limited = await authRequestLimit(request, "password-reset-complete");
    if (limited) return limited;
    const body: unknown = await request.json();
    const values =
      body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    if (
      typeof values.token !== "string" ||
      values.token.length > 128 ||
      typeof values.password !== "string" ||
      typeof values.confirmPassword !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid reset link and password are required.",
        },
        { status: 400 },
      );
    }

    await completePasswordReset({
      token: values.token,
      password: values.password,
      confirmPassword: values.confirmPassword,
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, code: error.code, error: error.message },
        { status: error.status },
      );
    }
    console.error(
      "Password reset failed due to an unexpected server error.",
      error,
    );
    return NextResponse.json(
      { success: false, error: "Password reset is temporarily unavailable." },
      { status: 503 },
    );
  }
}
