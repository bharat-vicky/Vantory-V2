import {NextResponse} from "next/server";
import {requireCandidate} from "@/lib/auth/authorization";
import {db} from "@/lib/db";
import {ApiError,apiError} from "@/lib/api-error";
import {pitchChecks} from "@/lib/candidate/pitch";
import {checkRateLimit} from "@/lib/rate-limit";
export async function GET(){try{const u=await requireCandidate();const attempts=await db.pitchAttempt.findMany({where:{userId:u.id},orderBy:{createdAt:"desc"},take:12});return NextResponse.json({success:true,attempts:attempts.map(a=>({...a,checks:JSON.parse(a.checksJson)}))});}catch(e){return apiError(e);}}
export async function POST(request:Request){try{
  const u=await requireCandidate();const raw=await request.text();if(raw.length>10000)throw new ApiError("Pitch request is too large.",413);
  let b;try{b=JSON.parse(raw);}catch{throw new ApiError("Invalid pitch request.");}
  if(typeof b?.transcript!=="string" || typeof b.targetRole!=="string" || typeof b.requestKey!=="string" || !/^[\w-]{16,80}$/.test(b.requestKey))throw new ApiError("Provide a role, transcript and submission identifier.");
  const checks=pitchChecks(b.transcript,b.targetRole,b.durationSeconds);
  const existing=await db.pitchAttempt.findUnique({where:{userId_requestKey:{userId:u.id,requestKey:b.requestKey}}});
  if(existing){if(existing.transcript!==b.transcript.trim() || existing.targetRole!==b.targetRole.trim() || existing.durationSeconds!==b.durationSeconds)throw new ApiError("Submission identifier already used for another pitch.",409);return NextResponse.json({success:true,attempt:existing,checks:JSON.parse(existing.checksJson)});}
  if(!checkRateLimit(`pitch:${u.id}`,20,15*60000).allowed)throw new ApiError("Pitch limit reached. Try again later.",429);
  const attempt=await db.pitchAttempt.create({data:{userId:u.id,targetRole:b.targetRole.trim(),transcript:b.transcript.trim(),durationSeconds:b.durationSeconds,requestKey:b.requestKey,checksJson:JSON.stringify(checks)}});
  return NextResponse.json({success:true,attempt,checks});
}catch(e){return apiError(e);}}
