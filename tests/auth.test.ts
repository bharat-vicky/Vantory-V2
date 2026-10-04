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
import { consumeAuthLimit, authRequestLimit } from "../lib/auth/request-rate-limit";
import { db } from "../lib/db";
import { stubMethod } from "./fixtures";
import { Prisma } from "@prisma/client";
import { GET as readiness } from "../app/api/internal/readiness/route";

test("Concurrent initial auth buckets retry a unique-key race without skipping a count",async()=>{
 const restores=[stubMethod(db.authRateLimit,"upsert",async()=>{throw new Prisma.PrismaClientKnownRequestError("fixture collision",{code:"P2002",clientVersion:"fixture"});}),stubMethod(db.authRateLimit,"update",async(args:any)=>{assert.equal(args.data.count.increment,1);return {count:11};})];
 try{assert.equal((await consumeAuthLimit("login","fixture",10,60000)).allowed,false);}finally{restores.reverse().forEach(restore=>restore());}
});

test("Readiness diagnostics require a secret and do not claim unprobed providers are healthy",async()=>{
 const previous=process.env.CRON_SECRET;process.env.CRON_SECRET="fixture-readiness-secret-of-more-than-32-characters";
 const restore=stubMethod(db.user,"findFirst",async()=>({id:"private-id"}));
 try{
  assert.equal((await readiness(new Request("https://example.com/api/internal/readiness"))).status,401);
  const response=await readiness(new Request("https://example.com/api/internal/readiness",{headers:{authorization:`Bearer ${process.env.CRON_SECRET}`}}));
  const body=await response.json();assert.equal(body.database,"reachable");assert.equal(body.ai,"not_configured");assert.equal(body.coding,"not_configured");assert.ok(!JSON.stringify(body).includes("private-id"));
 }finally{restore();process.env.CRON_SECRET=previous;}
});

test("Shared auth buckets enforce concurrent attempts without storing raw identifiers", async () => {
  const counts = new Map<string,number>();
  const restore=stubMethod(db.authRateLimit,"upsert",async(args:any)=>{assert.match(args.where.id,/^[a-f0-9]{64}$/);assert.ok(!JSON.stringify(args).includes("private@example.com"));const count=(counts.get(args.where.id)||0)+1;counts.set(args.where.id,count);return {...args.create,count};});
  try {
    const results=await Promise.all(Array.from({length:12},()=>consumeAuthLimit("login","private@example.com",10,60000,100000)));
    assert.equal(results.filter(r=>r.allowed).length,10);
    assert.equal((await consumeAuthLimit("login","private@example.com",10,60000,120001)).allowed,true);
  } finally {restore();}
});

test("Auth throttling returns retry guidance and fails closed if storage is unavailable", async () => {
  const request=new Request("https://example.com/api/auth/login",{headers:{"x-vercel-forwarded-for":"203.0.113.1"}});
  let restore=stubMethod(db.authRateLimit,"upsert",async()=>({count:100}));
  try {const response=await authRequestLimit(request,"login","candidate@example.com");assert.equal(response?.status,429);assert.ok(Number(response?.headers.get("retry-after"))>0);} finally {restore();}
  restore=stubMethod(db.authRateLimit,"upsert",async()=>{throw new Error("fixture outage");});
  try {assert.equal((await authRequestLimit(request,"login"))?.status,503);}finally{restore();}
});

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
