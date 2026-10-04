import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { AuthError } from "@/lib/auth/errors";
import { sendEmailVerification } from "@/lib/services/auth/email-tokens";
import {
  normalizeEmail,
  isPublicRegistrationRole,
  validateRegistration,
  type RegisterInput,
} from "@/lib/validation/auth";

export async function registerUser(input: RegisterInput) {
  // 1. Server-side validation
  const validation = validateRegistration(input);
  if (!validation.isValid) {
    throw new AuthError(
      Object.values(validation.errors)[0] || "Invalid registration input.",
      "INVALID_REGISTRATION",
      400,
    );
  }

  const normalizedEmail = normalizeEmail(input.email!);
  const requestedRole = input.role || "CANDIDATE";
  if (!isPublicRegistrationRole(requestedRole)) {
    throw new AuthError(
      "This role cannot be selected during public registration.",
      "INVALID_ROLE",
      400,
    );
  }
  const targetRole = requestedRole;

  // 2. Check for duplicate email
  const existingUser = await db.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new AuthError(
      "An account with this email already exists.",
      "ACCOUNT_EXISTS",
      409,
    );
  }

  // 3. Hash password using bcryptjs
  const passwordHash = await hashPassword(input.password!);

  // 4. Create User & initialized role entity in database transaction
  const { user, redirectUrl } = await db.$transaction(async (tx) => {
    let userName = (input.name || "").trim();
    let destination = "/dashboard";

    if (targetRole === "COMPANY_ADMIN") {
      userName = (input.companyName || "").trim();
      destination = "/company/dashboard";
    } else if (targetRole === "INSTITUTE_ADMIN") {
      userName = (input.instituteName || "").trim();
      destination = "/institute/dashboard";
    }

    const newUser = await tx.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: userName,
        role: targetRole,
      },
    });

    if (targetRole === "COMPANY_ADMIN") {
      await tx.companyProfile.create({
        data: {
          userId: newUser.id,
          companyName: userName,
          verificationStatus: "PENDING",
        },
      });
    } else if (targetRole === "INSTITUTE_ADMIN") {
      const inst = await tx.institute.create({
        data: {
          name: userName,
          contactPhone: input.phone || null,
          verificationStatus: "PENDING",
        },
      });
      await tx.user.update({
        where: { id: newUser.id },
        data: { instituteId: inst.id },
      });
    } else {
      // Candidate
      await tx.profile.create({
        data: {
          userId: newUser.id,
          headline: "Candidate",
          phone: input.phone || null,
          education: input.college || null,
          completionScore: 25,
        },
      });
    }

    await tx.activityLog.create({
      data: {
        userId: newUser.id,
        type: "USER_REGISTERED",
        title: "Account Created",
        detail: `Registered as ${targetRole} on Vantory.`,
      },
    });

    return { user: newUser, redirectUrl: destination };
  });

  try {
    await sendEmailVerification(user);
  } catch {
    throw new AuthError(
      "Your account was created, but the verification email could not be sent. Use the resend link on the sign-in page.",
      "EMAIL_DELIVERY_FAILED",
      503,
    );
  }

  // A password signup remains unauthenticated until the email link is consumed.
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    verificationRequired: true,
    redirectUrl,
  };
}

// Retain export alias for backwards compatibility
export const registerCandidateUser = registerUser;
