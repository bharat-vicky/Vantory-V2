import {NextResponse} from "next/server";
import {cloneCompanyJob} from "@/lib/company/job-postings";
import {requireCompany} from "@/lib/company/route-helpers";
import {apiError,ApiError} from "@/lib/api-error";
import {checkRateLimit} from "@/lib/rate-limit";
export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const user=await requireCompany(),{id}=await params;
  if(!checkRateLimit("job-clone:"+user.id,20,15*60000).allowed)throw new ApiError("Too many copies. Try again later.",429);
  const job=await cloneCompanyJob(user.id,id);
  return NextResponse.json({success:true,job},{headers:{"Cache-Control":"private, no-store"}});
 }catch(e){return apiError(e);}
}
