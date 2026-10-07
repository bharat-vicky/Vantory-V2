import {NextResponse} from "next/server";
import {requireCompany} from "@/lib/company/route-helpers";
import {analyticsFilters,getHiringAnalytics} from "@/lib/company/hiring-analytics";
import {apiError} from "@/lib/api-error";
export async function GET(request:Request){
 try{const user=await requireCompany();const analytics=await getHiringAnalytics(user.id,analyticsFilters(new URL(request.url).searchParams));return NextResponse.json({success:true,analytics},{headers:{"Cache-Control":"private, no-store"}});}catch(e){return apiError(e);}
}
