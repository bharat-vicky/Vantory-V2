import test from "node:test";
import assert from "node:assert";
import { hashPassword, verifyPassword } from "../lib/auth/password";
import { resolveJwtSecret, signToken, verifyToken } from "../lib/auth/jwt";
import {
  validateRegistration,
  validateLogin,
  normalizeEmail,
  passwordByteLength,
} from "../lib/validation/auth";
import { hasRole } from "../lib/auth/authorization";
import { createRawAuthToken, hashAuthToken } from "../lib/auth/token-utils";

test("Password Hashing & Verification", async () => {
  const plainPassword = "SuperSecretPassword123!";
  const hash = await hashPassword(plainPassword);

  assert.ok(hash !== plainPassword, "Password hash must not equal plain text");
  assert.ok(hash.startsWith("$2"), "Hash must be a valid bcrypt string");

  const isValid = await verifyPassword(plainPassword, hash);
  assert.strictEqual(
    isValid,
    true,
    "Correct password must verify successfully",
  );

  const isInvalid = await verifyPassword("WrongPassword123!", hash);
  assert.strictEqual(
    isInvalid,
    false,
    "Incorrect password must fail verification",
  );
});

test("JWT Token Signing & Verification", async () => {
  const payload = {
    userId: "user-uuid-123456",
    role: "CANDIDATE",
    email: "candidate@skillassociate.com",
  };

  const token = await signToken(payload);
  assert.ok(
    typeof token === "string" && token.length > 20,
    "Token must be a valid JWT string",
  );

  const decoded = await verifyToken(token);
  assert.ok(decoded !== null, "Valid token must decode successfully");
  assert.strictEqual(decoded?.userId, payload.userId);
  assert.strictEqual(decoded?.role, payload.role);
  assert.strictEqual(decoded?.email, payload.email);

  const invalidTokenResult = await verifyToken("invalid.jwt.token");
  assert.strictEqual(
    invalidTokenResult,
    null,
    "Invalid token must return null",
  );
});

test("Production JWT configuration rejects missing and placeholder secrets", () => {
  assert.throws(() => resolveJwtSecret(undefined, "production"), /JWT_SECRET/);
  assert.throws(
    () => resolveJwtSecret("your-super-secret-jwt-key-here", "production"),
    /JWT_SECRET/,
  );
  assert.throws(
    () => resolveJwtSecret("too-short", "production"),
    /JWT_SECRET/,
  );
  assert.strictEqual(
    resolveJwtSecret(
      "a-unique-production-secret-with-more-than-32-characters",
      "production",
    ),
    "a-unique-production-secret-with-more-than-32-characters",
  );
});

test("Input Validation Logic", () => {
  const validReg = validateRegistration({
    name: "Alex Morgan",
    email: "ALEX@EXAMPLE.COM",
    password: "password123",
    confirmPassword: "password123",
  });
  assert.strictEqual(validReg.isValid, true);
  assert.strictEqual(normalizeEmail("ALEX@EXAMPLE.COM "), "alex@example.com");

  const mismatchReg = validateRegistration({
    name: "Alex Morgan",
    email: "alex@example.com",
    password: "password123",
    confirmPassword: "differentPassword123",
  });
  assert.strictEqual(mismatchReg.isValid, false);
  assert.ok(mismatchReg.errors.confirmPassword);

  const weakPasswordReg = validateRegistration({
    name: "Alex Morgan",
    email: "alex@example.com",
    password: "short",
    confirmPassword: "short",
  });
  assert.strictEqual(weakPasswordReg.isValid, false);
  assert.ok(weakPasswordReg.errors.password);

  const invalidLogin = validateLogin({ email: "", password: "" });
  assert.strictEqual(invalidLogin.isValid, false);
  assert.ok(invalidLogin.errors.email);
  assert.ok(invalidLogin.errors.password);
});

test("Bcrypt password limit counts UTF-8 bytes", () => {
  assert.strictEqual(passwordByteLength("a".repeat(72)), 72);
  assert.strictEqual(passwordByteLength("😀".repeat(18)), 72);
  assert.strictEqual(
    validateLogin({ email: "user@example.com", password: "😀".repeat(19) })
      .isValid,
    false,
  );
});

test("One-time auth tokens are random and stored as fixed-length hashes", () => {
  const token = createRawAuthToken();
  const secondToken = createRawAuthToken();
  const tokenHash = hashAuthToken(token);

  assert.strictEqual(token.length, 43);
  assert.notStrictEqual(token, secondToken);
  assert.strictEqual(tokenHash.length, 64);
  assert.notStrictEqual(tokenHash, token);
  assert.strictEqual(hashAuthToken(token), tokenHash);
});

test("Role Authorization Helpers", () => {
  assert.strictEqual(
    hasRole("CANDIDATE", ["CANDIDATE", "INSTITUTE_ADMIN"]),
    true,
  );
  assert.strictEqual(hasRole("INSTITUTE_ADMIN", ["CANDIDATE"]), false);
  assert.strictEqual(
    hasRole("SUPER_ADMIN", ["INSTITUTE_ADMIN", "SUPER_ADMIN"]),
    true,
  );
});
