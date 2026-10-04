import { NextResponse } from "next/server";
import { clearSessionCookie, revokeAllUserSessions } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/authorization";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthenticated" },
      { status: 401 },
    );
  }

  await revokeAllUserSessions(user.id);
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
