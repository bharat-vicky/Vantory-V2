import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";
nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
const client = new PrismaClient();
try {
  await client.$runCommandRaw({ createIndexes: "AuthRateLimit", indexes: [{ key: { expiresAt: 1 }, name: "auth_rate_limit_expiry", expireAfterSeconds: 0 }] });
  console.log("Authentication rate-limit TTL index is ready.");
} catch {
  console.error("Could not create the TTL index. Check database permissions; no raw error or credentials were printed.");
  process.exitCode = 1;
} finally { await client.$disconnect(); }
