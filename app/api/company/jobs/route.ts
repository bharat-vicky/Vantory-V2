import {NextResponse} from "next/server";
import {getCompanyJobs,createCompanyJob} from "@/lib/company/company-service";
import {requireCompany,companyBody} from "@/lib/company/route-helpers";
import {apiError} from "@/lib/api-error";
export async function GET(){try{const user=await requireCompany();return NextResponse.json({success:true,jobs:await getCompanyJobs(user.id)},{headers:{"Cache-Control":"private, no-store"}});}catch(e){return apiError(e);}}
export async function POST(request:Request){try{const user=await requireCompany();const job=await createCompanyJob(user.id,await companyBody(request));return NextResponse.json({success:true,job},{headers:{"Cache-Control":"private, no-store"}});}catch(e){return apiError(e);}}
