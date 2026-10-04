import bcrypt from "bcryptjs";
import {
  MAX_BCRYPT_PASSWORD_BYTES,
  passwordByteLength,
} from "@/lib/validation/auth";

const SALT_ROUNDS = 12;

/**
 * Hashes a plain text password using bcryptjs.
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }
  if (passwordByteLength(password) > MAX_BCRYPT_PASSWORD_BYTES) {
    throw new Error("Password must not exceed 72 UTF-8 bytes.");
  }
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compares a plain text password against a stored bcrypt hash.
 */
export async function verifyPassword(
  plainTextPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  if (
    !plainTextPassword ||
    !hashedPassword ||
    passwordByteLength(plainTextPassword) > MAX_BCRYPT_PASSWORD_BYTES
  ) {
    return false;
  }
  return bcrypt.compare(plainTextPassword, hashedPassword);
}
