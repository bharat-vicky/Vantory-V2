import nodemailer from "nodemailer";
export interface ContactMessagePayload {name:string;email:string;phone?:string;subject?:string;message:string;ticketId?:string}
export async function sendContactEmail(payload:ContactMessagePayload):Promise<{success:boolean;messageId?:string;isRealSmtp:boolean}>{
 if(process.env.VANTORY_UNIT_TESTS==="1")return {success:false,isRealSmtp:false};
 const {SMTP_HOST:host,SMTP_USER:user,SMTP_PASS:pass,SUPPORT_RECIPIENT_EMAIL:recipient}=process.env;
 if(!host || !user || !pass || !recipient)return {success:false,isRealSmtp:false};
 const transporter=nodemailer.createTransport({host,port:Number(process.env.SMTP_PORT)||465,secure:(Number(process.env.SMTP_PORT)||465)===465,auth:{user,pass},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000});
 try{const info=await transporter.sendMail({from:process.env.SMTP_FROM || user,to:recipient,replyTo:payload.email,messageId:payload.ticketId?`<support-${payload.ticketId}@vantory>`:undefined,subject:`[Vantory ${payload.ticketId || "Support"}] ${(payload.subject || "Inquiry").replace(/[\r\n]/g," ")}`,text:`Sender: ${payload.name} (${payload.email})\nPhone: ${payload.phone || "Not supplied"}\nTicket: ${payload.ticketId || "Not supplied"}\n\n${payload.message}`});return {success:true,messageId:info.messageId,isRealSmtp:true};}catch{return {success:false,isRealSmtp:false};}finally{transporter.close();}
}
