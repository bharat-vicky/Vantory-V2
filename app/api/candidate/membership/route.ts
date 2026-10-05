import {NextResponse} from "next/server";
import {requireCandidate} from "@/lib/auth/authorization";
import {apiError} from "@/lib/api-error";
import {candidateMembership,leaveCandidateInstitute} from "@/lib/candidate/membership";
export async function GET() {try {const user=await requireCandidate();return NextResponse.json({success:true,...await candidateMembership(user.id)});} catch(error) {return apiError(error);}}
export async function POST(request:Request) {try {const user=await requireCandidate();await leaveCandidateInstitute(user.id,await request.json());return NextResponse.json({success:true});} catch(error) {return apiError(error);}}
