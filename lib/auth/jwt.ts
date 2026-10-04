import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";
import type { JWTPayload } from "jose";

const LOCAL_JWT_SECRET = "local-development-only-vantory-secret-do-not-deploy";

export function resolveJwtSecret(
  configuredSecret: string | undefined,
  environment: string | undefined,
): string {
  const secret = configuredSecret?.trim();
  const isKnownPlaceholder =
    secret === "your-super-secret-jwt-key-here" ||
    secret === "vantory_super_secret_jwt_key_monochrome_2026" ||
    secret?.startsWith("replace-with-");

  if (environment === "production") {
    if (!secret || secret.length < 32 || isKnownPlaceholder) {
      throw new Error(
        "JWT_SECRET must be set to a unique random value of at least 32 characters in production.",
      );
    }
    return secret;
  }

  return secret || LOCAL_JWT_SECRET;
}

const JWT_SECRET = resolveJwtSecret(
  process.env.JWT_SECRET,
  process.env.NODE_ENV,
);
const secretKey = new TextEncoder().encode(JWT_SECRET);

export interface SessionJWTPayload extends JWTPayload {
  userId: string;
  role: string;
  email: string;
  sessionId: string;
}

/**
 * Signs a JWT token containing minimal safe user session claims.
 */
export async function signToken(payload: {
  userId: string;
  role: string;
  email: string;
  sessionId?: string;
}): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    role: payload.role,
    email: payload.email,
    sessionId: payload.sessionId || globalThis.crypto.randomUUID(),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

/**
 * Verifies a JWT token and returns payload if valid, or null if invalid/expired.
 */
export async function verifyToken(
  token: string,
): Promise<SessionJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (
      typeof payload.userId !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.sessionId !== "string"
    ) {
      return null;
    }
    return payload as SessionJWTPayload;
  } catch {
    return null;
  }
}
