import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {ApiError,apiError} from "@/lib/api-error";
import {checkRateLimit} from "@/lib/rate-limit";
export async function POST(request:Request){try{
 const raw=await request.text();if(raw.length>15000)throw new ApiError("Message is too long.",413);let b;try{b=JSON.parse(raw);}catch{throw new ApiError("Invalid message.");}
 const field=(key:string,max:number,min=0)=>{if(typeof b?.[key]!=="string" && b?.[key]!==undefined)throw new ApiError("Invalid contact details.");const v=(b?.[key] || "").trim();if(v.length<min || v.length>max)throw new ApiError(`Please check ${key}.`);return v;};
 const name=field("name",150,2),email=field("email",254,5).toLowerCase(),phone=field("phone",40),subject=field("subject",200),message=field("message",10000,5);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new ApiError("Enter a valid email.");
 if(!checkRateLimit(`support:${email}`,3,15*60000).allowed)throw new ApiError("Please wait before creating another ticket.",429);
 const ticket=await db.supportTicket.create({data:{name,email,phone:phone || null,subject:subject || "General inquiry",message}});
 return NextResponse.json({success:true,ticketId:ticket.id,deliveryStatus:ticket.deliveryStatus,message:"Your support ticket is saved. Keep this reference for follow-up."},{status:201});
}catch(e){return apiError(e,"Could not save your support request. Please retry.");}}
