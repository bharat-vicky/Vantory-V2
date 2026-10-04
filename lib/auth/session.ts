import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { signToken, verifyToken, type SessionJWTPayload } from "./jwt";

export const COOKIE_NAME = "vantory_session";
export const COOKIE_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 Days

/**
 * Sets an HttpOnly, secure authentication cookie on the client response.
 */
export async function setSessionCookie(payload: {
  userId: string;
  role: string;
  email: string;
}): Promise<void> {
  const sessionId = globalThis.crypto.randomUUID();
  const expiresAt = new Date(Date.now() + COOKIE_DURATION_SECONDS * 1000);
  await db.authSession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  await db.authSession.create({
    data: { sessionId, userId: payload.userId, expiresAt },
  });

  const token = await signToken({ ...payload, sessionId });
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_DURATION_SECONDS,
  });
}

/**
 * Clears the authentication cookie from client headers.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (cookie?.value) {
    const session = await verifyToken(cookie.value);
    if (session) {
      try {
        await db.authSession.updateMany({
          where: { sessionId: session.sessionId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      } catch {
        // Clear the local cookie even if the database is temporarily unavailable.
      }
    }
  }
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Retrieves and verifies the current session payload from cookies.
 */
export async function getSession(): Promise<SessionJWTPayload | null> {
  // No request context means there is no authenticated request to authorize.
  let cookieStore: Awaited<ReturnType<typeof cookies>>;
  try {
    cookieStore = await cookies();
  } catch (error) {
    if (error instanceof Error && /outside a request scope/i.test(error.message)) return null;
    throw error;
  }
  const cookie = cookieStore.get(COOKIE_NAME);

  if (!cookie || !cookie.value) {
    return null;
  }

  const session = await verifyToken(cookie.value);
  if (!session) return null;

  const storedSession = await db.authSession.findUnique({
    where: { sessionId: session.sessionId },
    select: { userId: true, expiresAt: true, revokedAt: true },
  });
  if (
    !storedSession ||
    storedSession.userId !== session.userId ||
    storedSession.revokedAt ||
    storedSession.expiresAt <= new Date()
  ) {
    return null;
  }

  return session;
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await db.authSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
