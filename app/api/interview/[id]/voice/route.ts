import { NextResponse } from "next/server";
import { requireCandidate } from "@/lib/auth/authorization";
import { apiError } from "@/lib/api-error";
import { cloudVoiceEnabled, questionAudio } from "@/lib/interview/voice-service";
export const maxDuration = 60;
export async function GET() {
  try { await requireCandidate(); return NextResponse.json({enabled:cloudVoiceEnabled()},{headers:{"Cache-Control":"no-store"}}); } catch(e) {return apiError(e);}
}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const user = await requireCandidate(); const {id} = await params;
    const body = await request.json();
    const audio = await questionAudio(user.id,id,body.questionId,body.voice);
    return new Response(new Uint8Array(audio),{headers:{"Content-Type":"audio/wav","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
  } catch(e) {return apiError(e);}
}
