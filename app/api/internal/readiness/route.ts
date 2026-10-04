import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { executionConfiguration } from "@/lib/preparation/execution-config";
import { DEFAULT_GEMINI_MODEL } from "@/lib/ai/structured-gemini";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const expected = `Bearer ${secret}`;
  const supplied = request.headers.get("authorization") || "";
  if (!secret || secret.length < 32 || Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return NextResponse.json({success:false,error:"Unauthorized."},{status:401});
  }
  let database = "unavailable";
  try { await db.user.findFirst({select:{id:true}}); database = "reachable"; } catch { /* no raw errors or account data */ }
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const ai = Boolean(process.env.GEMINI_API_KEY?.trim() && /^[\w.-]+$/.test(model));
  const execution = executionConfiguration();
  return NextResponse.json({success:database==="reachable",database,ai:ai?"configured_not_probed":"not_configured",coding:execution.available?"configured_not_probed":execution.reason,checkedAt:new Date().toISOString()}, {status:database==="reachable"?200:503,headers:{"Cache-Control":"no-store"}});
}
