import {NextResponse} from "next/server";
import {getCurrentUser} from "@/lib/auth/authorization";
import {apiError,ApiError} from "@/lib/api-error";
import {saveApplicantEvaluation,publishApplicantUpdate} from "@/lib/company/applicant-tools";
import {checkRateLimit} from "@/lib/rate-limit";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const user=await getCurrentUser();
    if(!user)throw new ApiError("Please sign in.",401);
    if(!["COMPANY_ADMIN","SUPER_ADMIN"].includes(user.role))throw new ApiError("Employer access required.",403);
    const raw=await request.text();if(raw.length>25000)throw new ApiError("Review request is too large.",413);
    let body;try{body=JSON.parse(raw);}catch{throw new ApiError("Invalid review request.");}
    if(!body || typeof body!=="object" || !["evaluation","candidateUpdate"].includes(body.action))throw new ApiError("Choose a review action.");
    if(!checkRateLimit(`applicant-review:${user.id}`,60,15*60000).allowed)throw new ApiError("Too many updates. Try again later.",429);
    const {id}=await params;
    const result=body.action==="evaluation" ? await saveApplicantEvaluation(user.id,id,body) : await publishApplicantUpdate(user.id,id,body);
    return NextResponse.json({success:true,...result},{headers:{"Cache-Control":"private, no-store"}});
  }catch(e){return apiError(e);}
}
