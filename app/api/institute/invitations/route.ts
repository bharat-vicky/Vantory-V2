import {NextResponse} from "next/server";
import {requireInstituteAdmin} from "@/lib/auth/authorization";
import {apiError} from "@/lib/api-error";
import {listInstituteInvitations,changeInstituteInvitation} from "@/lib/institute/invitations";
export async function GET(request:Request){try {const user=await requireInstituteAdmin();return NextResponse.json({success:true,...await listInstituteInvitations(user.id,new URL(request.url).searchParams)});}catch(error){return apiError(error);}}
export async function PATCH(request:Request){try {const user=await requireInstituteAdmin();await changeInstituteInvitation(user.id,await request.json());return NextResponse.json({success:true});}catch(error){return apiError(error);}}
