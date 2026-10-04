import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth/errors";
import { registerCandidateUser } from "@/lib/services/auth/register";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await registerCandidateUser(body);

    return NextResponse.json({
      success: true,
      message: "Account created. Verify your email before signing in.",
      verificationRequired: user.verificationRequired,
      user,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, code: error.code, error: error.message },
        { status: error.status },
      );
    }
    console.error(
      "Registration failed due to an unexpected server error.",
      error,
    );
    return NextResponse.json(
      { success: false, error: "Registration is temporarily unavailable." },
      { status: 503 },
    );
  }
}
