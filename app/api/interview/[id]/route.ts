import { NextResponse } from "next/server";
import { requireCandidate } from "@/lib/auth/authorization";
import { apiError } from "@/lib/api-error";
import { resumeSession } from "@/lib/interview/session-service";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {try {const u=await requireCandidate();return NextResponse.json({success:true,...await resumeSession(u.id,(await params).id)});} catch(e){return apiError(e);}}
