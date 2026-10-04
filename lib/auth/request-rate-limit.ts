import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { normalizeEmail } from "@/lib/validation/auth";

export async function consumeAuthLimit(scope: string, identifier: string, limit: number, windowMs: number, now = Date.now()) {
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const id = createHash("sha256").update(JSON.stringify([scope, identifier, windowStart])).digest("hex");
  const expiresAt = new Date(windowStart + windowMs);
  const args = { where: { id }, create: { id, count: 1, expiresAt }, update: { count: { increment: 1 } } };
  let record;
  try { record = await db.authRateLimit.upsert(args); }
  catch (error) {
    // Concurrent first requests may race to create the same MongoDB _id.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    record = await db.authRateLimit.update({where:{id},data:{count:{increment:1}}});
  }
  return { allowed: record.count <= limit, retryAfterSeconds: Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000)) };
}

export async function authRequestLimit(request: Request, scope: string, email?: unknown): Promise<NextResponse | null> {
  const network = (request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for") || "local").split(",")[0].trim().slice(0, 128);
  const windowMs = 15 * 60_000;
  try {
    const networkResult = await consumeAuthLimit(`${scope}:network`, network, scope === "login" ? 40 : 20, windowMs);
    const account = typeof email === "string" ? normalizeEmail(email).slice(0, 254) : "";
    const result = !networkResult.allowed ? networkResult : account ? await consumeAuthLimit(`${scope}:account`, account, scope === "login" ? 10 : 5, windowMs) : networkResult;
    if (result.allowed) return null;
    return NextResponse.json({success:false,code:"RATE_LIMITED",error:"Too many attempts. Please wait before trying again."}, {status:429,headers:{"Retry-After":String(result.retryAfterSeconds),"Cache-Control":"no-store"}});
  } catch {
    console.error("AUTH_RATE_LIMIT_UNAVAILABLE", { scope });
    return NextResponse.json({success:false,error:"Sign-in services are temporarily unavailable. Please try again later."}, {status:503});
  }
}
