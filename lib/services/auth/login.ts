import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { AuthError } from "@/lib/auth/errors";
import { sendEmailVerification } from "@/lib/services/auth/email-tokens";
import {
  hasPortalAccess,
  isPublicRegistrationRole,
  normalizeEmail,
  validateLogin,
  type LoginInput,
} from "@/lib/validation/auth";

export async function loginUser(input: LoginInput) {
  // 1. Validate input
  const validation = validateLogin(input);
  if (!validation.isValid) {
    throw new AuthError(
      Object.values(validation.errors)[0] || "Invalid email or password.",
      "INVALID_LOGIN",
      400,
    );
  }

  const normalizedEmail = normalizeEmail(input.email!);

  // 2. Find user by email
  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
  });

  const GENERIC_ERROR = "Invalid email or password.";

  if (!user || user.isActive === false || !user.passwordHash) {
    throw new AuthError(GENERIC_ERROR, "INVALID_CREDENTIALS", 401);
  }

  // 3. Verify password hash using bcryptjs
  const isValidPassword = await verifyPassword(
    input.password!,
    user.passwordHash,
  );
  if (!isValidPassword) {
    throw new AuthError(GENERIC_ERROR, "INVALID_CREDENTIALS", 401);
  }

  if (!user.emailVerifiedAt) {
    await sendEmailVerification(user);
    throw new AuthError(
      "Verify your email before signing in. We sent you a new verification link.",
      "EMAIL_NOT_VERIFIED",
      403,
    );
  }

  if (
    input.expectedRole &&
    (!isPublicRegistrationRole(input.expectedRole) ||
      !hasPortalAccess(user.role, input.expectedRole))
  ) {
    throw new AuthError(
      "This account does not have access to the selected portal.",
      "PORTAL_ACCESS_DENIED",
      403,
    );
  }

  // 4. Determine redirect URL based on the selected portal
  const redirectRole = input.expectedRole || user.role;
  let redirectUrl = "/dashboard";
  if (redirectRole === "COMPANY_ADMIN") {
    redirectUrl = "/company/dashboard";
  } else if (
    redirectRole === "INSTITUTE_ADMIN" ||
    redirectRole === "SUPER_ADMIN"
  ) {
    redirectUrl = "/institute/dashboard";
  }

  // 5. Record login activity
  await db.activityLog.create({
    data: {
      userId: user.id,
      type: "USER_LOGIN",
      title: "Signed In",
      detail: `Authenticated session established as ${user.role}.`,
    },
  });

  // 6. Issue session cookie
  await setSessionCookie({
    userId: user.id,
    role: user.role,
    email: user.email,
  });

  // 7. Return safe user data
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    redirectUrl,
  };
}
