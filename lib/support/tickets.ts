import {db} from "@/lib/db";
import {sendContactEmail} from "@/lib/email/mailer";
export async function dispatchTicket(id:string){
 const lease=await db.supportTicket.updateMany({where:{id,deliveryStatus:{in:["PENDING","FAILED"]},deliveryAttempts:{lt:5}},data:{deliveryStatus:"SENDING",deliveryAttempts:{increment:1}}});if(lease.count!==1)return false;
 const ticket=await db.supportTicket.findUniqueOrThrow({where:{id}});
 const result=await sendContactEmail({...ticket,phone:ticket.phone || undefined,ticketId:ticket.id});
 await db.supportTicket.update({where:{id},data:{deliveryStatus:result.success && result.isRealSmtp?"SENT":"FAILED",messageId:result.messageId || null}});
 return result.success && result.isRealSmtp;
}
