import {timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {dispatchTicket} from "@/lib/support/tickets";
import {ApiError,apiError} from "@/lib/api-error";
export async function POST(request:Request){try{
 const secret=process.env.CRON_SECRET;const auth=request.headers.get("authorization") || "";const expected=`Bearer ${secret}`;
 if(!secret || secret.length<32 || Buffer.byteLength(auth)!==Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(auth),Buffer.from(expected)))throw new ApiError("Unauthorized.",401);
 if(!process.env.SMTP_HOST || !process.env.SUPPORT_RECIPIENT_EMAIL)return NextResponse.json({success:false,error:"Delivery is not configured."},{status:503});
 // Expired delivery leases are retryable. SMTP can provide at-least-once delivery only.
 await db.supportTicket.updateMany({where:{deliveryStatus:"SENDING",updatedAt:{lt:new Date(Date.now()-10*60000)}},data:{deliveryStatus:"FAILED"}});
 const tickets=await db.supportTicket.findMany({where:{deliveryStatus:{in:["PENDING","FAILED"]},deliveryAttempts:{lt:5},OR:[{deliveryAttempts:0},{updatedAt:{lt:new Date(Date.now()-5*60000)}}]},select:{id:true},orderBy:{createdAt:"asc"},take:5});
 let sent=0;for(const ticket of tickets)if(await dispatchTicket(ticket.id))sent++;
 return NextResponse.json({success:true,processed:tickets.length,sent});
}catch(e){return apiError(e);}}
