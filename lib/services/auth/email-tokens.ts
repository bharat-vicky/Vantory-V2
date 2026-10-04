import { db } from "@/lib/db";
import { AuthError } from "@/lib/auth/errors";
import { createRawAuthToken, hashAuthToken } from "@/lib/auth/token-utils";
import { hashPassword } from "@/lib/auth/password";
import { sendAuthEmail } from "@/lib/email/auth-mailer";
import { normalizeEmail, validatePasswordFields } from "@/lib/validation/auth";

const EMAIL_VERIFICATION = "EMAIL_VERIFICATION";
const PASSWORD_RESET = "PASSWORD_RESET";
const EMAIL_VERIFICATION_TTL_MS = 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

function getAppUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = new URL(appUrl);
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("Authentication email links require an HTTPS app URL.");
  }
  return url.toString().replace(/\/$/, "");
}

async function replaceToken(
  userId: string,
  purpose: string,
  expiresAt: Date,
): Promise<string> {
  const token = createRawAuthToken();
  await db.$transaction(async (tx) => {
    await tx.authToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    await tx.authToken.deleteMany({ where: { userId, purpose } });
    await tx.authToken.create({
      data: {
        userId,
        purpose,
        tokenHash: hashAuthToken(token),
        expiresAt,
      },
    });
  });
  return token;
}

export async function sendEmailVerification(user: {
  id: string;
  email: string;
  name: string;
}): Promise<void> {
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
  const token = await replaceToken(user.id, EMAIL_VERIFICATION, expiresAt);
  await sendAuthEmail({
    to: user.email,
    subject: "Verify your Vantory email",
    title: "Verify your email address",
    message: `Hello ${user.name}, confirm your email address to activate your Vantory account.`,
    actionLabel: "Verify email",
    actionUrl: `${getAppUrl()}/verify-email#token=${encodeURIComponent(token)}`,
    expiresIn: "1 hour",
  });
}

export async function resendEmailVerification(email: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { email: normalizeEmail(email) },
    select: { id: true, email: true, name: true, emailVerifiedAt: true },
  });
  if (!user || user.emailVerifiedAt) return;
  await sendEmailVerification(user);
}

export async function completeEmailVerification(token: string): Promise<void> {
  const tokenHash = hashAuthToken(token);
  const authToken = await db.authToken.findUnique({ where: { tokenHash } });
  if (
    !authToken ||
    authToken.purpose !== EMAIL_VERIFICATION ||
    authToken.expiresAt <= new Date()
  ) {
    throw new AuthError(
      "This verification link is invalid or expired.",
      "INVALID_TOKEN",
      400,
    );
  }

  await db.$transaction(async (tx) => {
    const currentToken = await tx.authToken.findUnique({
      where: { tokenHash },
    });
    if (
      !currentToken ||
      currentToken.purpose !== EMAIL_VERIFICATION ||
      currentToken.expiresAt <= new Date()
    ) {
      throw new AuthError(
        "This verification link is invalid or expired.",
        "INVALID_TOKEN",
        400,
      );
    }
    await tx.authToken.delete({ where: { id: currentToken.id } });
    await tx.user.update({
      where: { id: currentToken.userId },
      data: { emailVerifiedAt: new Date() },
    });
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { email: normalizeEmail(email) },
    select: { id: true, email: true, name: true, emailVerifiedAt: true },
  });
  if (!user?.emailVerifiedAt) return;

  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  const token = await replaceToken(user.id, PASSWORD_RESET, expiresAt);
  await sendAuthEmail({
    to: user.email,
    subject: "Reset your Vantory password",
    title: "Reset your password",
    message: `Hello ${user.name}, use this link to choose a new Vantory password.`,
    actionLabel: "Reset password",
    actionUrl: `${getAppUrl()}/reset-password#token=${encodeURIComponent(token)}`,
    expiresIn: "30 minutes",
  });
}

export async function completePasswordReset(input: {
  token: string;
  password: string;
  confirmPassword: string;
}): Promise<void> {
  const validation = validatePasswordFields(
    input.password,
    input.confirmPassword,
  );
  if (!validation.isValid) {
    throw new AuthError(
      Object.values(validation.errors)[0],
      "INVALID_PASSWORD",
      400,
    );
  }

  const tokenHash = hashAuthToken(input.token);
  const authToken = await db.authToken.findUnique({ where: { tokenHash } });
  if (
    !authToken ||
    authToken.purpose !== PASSWORD_RESET ||
    authToken.expiresAt <= new Date()
  ) {
    throw new AuthError(
      "This password reset link is invalid or expired.",
      "INVALID_TOKEN",
      400,
    );
  }

  const passwordHash = await hashPassword(input.password);
  await db.$transaction(async (tx) => {
    const currentToken = await tx.authToken.findUnique({
      where: { tokenHash },
    });
    if (
      !currentToken ||
      currentToken.purpose !== PASSWORD_RESET ||
      currentToken.expiresAt <= new Date()
    ) {
      throw new AuthError(
        "This password reset link is invalid or expired.",
        "INVALID_TOKEN",
        400,
      );
    }
    await tx.authToken.delete({ where: { id: currentToken.id } });
    await tx.user.update({
      where: { id: currentToken.userId },
      data: { passwordHash },
    });
    await tx.authToken.deleteMany({
      where: { userId: currentToken.userId, purpose: PASSWORD_RESET },
    });
    await tx.authSession.updateMany({
      where: { userId: currentToken.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });
}
