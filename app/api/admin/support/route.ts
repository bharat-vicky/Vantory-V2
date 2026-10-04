import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth/authorization";
import {db} from "@/lib/db";
import {ApiError,apiError} from "@/lib/api-error";
export async function GET(){try{const u=await requireUser();if(u.role!=="SUPER_ADMIN")throw new ApiError("Admin access required.",403);return NextResponse.json({success:true,tickets:await db.supportTicket.findMany({orderBy:{createdAt:"desc"},take:100})});}catch(e){return apiError(e);}}
