import { NextResponse } from "next/server";
import { requireCandidate } from "@/lib/auth/authorization";
import { apiError } from "@/lib/api-error";
import { startSession } from "@/lib/interview/session-service";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
 try { const user=await requireCandidate(); const {id}=await params; const result=await startSession(user.id,id); return NextResponse.json(result); } catch(e) { return apiError(e); }
}
