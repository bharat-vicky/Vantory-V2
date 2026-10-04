import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth/errors";
import { loginUser } from "@/lib/services/auth/login";
import { authRequestLimit } from "@/lib/auth/request-rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const limited = await authRequestLimit(request, "login", body?.email);
    if (limited) return limited;
    const user = await loginUser(body);

    return NextResponse.json({
      success: true,
      message: "Login successful.",
      user,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, code: error.code, error: error.message },
        { status: error.status },
      );
    }
    console.error("Login failed due to an unexpected server error.", error);
    return NextResponse.json(
      { success: false, error: "Sign-in is temporarily unavailable." },
      { status: 503 },
    );
  }
}
