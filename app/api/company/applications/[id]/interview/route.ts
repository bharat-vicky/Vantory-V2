import {NextResponse} from "next/server";
import {getCurrentUser} from "@/lib/auth/authorization";
import {ApiError,apiError} from "@/lib/api-error";
import {scheduleCompanyInterview} from "@/lib/company/interview-service";
export async function PATCH(request: Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const user=await getCurrentUser();
    if (!user) throw new ApiError("Please sign in.",401);
    if (!["COMPANY_ADMIN","SUPER_ADMIN"].includes(user.role)) throw new ApiError("Employer access required.",403);
    const body=await request.json();
    if (!body || typeof body !== "object") throw new ApiError("Enter the interview details.");
    return NextResponse.json({success:true,...await scheduleCompanyInterview(user.id,(await params).id,body)});
  } catch (error) {return apiError(error);}
}
