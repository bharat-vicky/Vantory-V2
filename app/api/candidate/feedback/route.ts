import {NextResponse} from "next/server";
import {requireCandidate} from "@/lib/auth/authorization";
import {apiError} from "@/lib/api-error";
import {candidateFeedback} from "@/lib/resume/feedback";
export async function GET(request:Request) {
  try {const user=await requireCandidate();return NextResponse.json({success:true,...await candidateFeedback(user.id,new URL(request.url).searchParams)},{headers:{"Cache-Control":"private, no-store"}});}catch(error){return apiError(error);}
}
