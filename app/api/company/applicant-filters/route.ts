import {NextResponse} from "next/server";
import {requireCompany,companyBody} from "@/lib/company/route-helpers";
import {getSavedApplicantFilters,changeSavedApplicantFilters} from "@/lib/company/saved-filters";
import {apiError,ApiError} from "@/lib/api-error";
import {checkRateLimit} from "@/lib/rate-limit";
export async function GET(){try{const user=await requireCompany();return NextResponse.json({success:true,...await getSavedApplicantFilters(user.id)},{headers:{"Cache-Control":"private, no-store"}});}catch(e){return apiError(e);}}
export async function PATCH(request:Request){try{const user=await requireCompany();if(!checkRateLimit("saved-filters:"+user.id,60,15*60000).allowed)throw new ApiError("Too many changes. Try again later.",429);return NextResponse.json({success:true,...await changeSavedApplicantFilters(user.id,await companyBody(request,4000))},{headers:{"Cache-Control":"private, no-store"}});}catch(e){return apiError(e);}}
