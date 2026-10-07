import {getCurrentUser} from "@/lib/auth/authorization";
import {ApiError} from "@/lib/api-error";
export async function requireCompany(){
 const user=await getCurrentUser();if(!user)throw new ApiError("Please sign in.",401);
 if(!["COMPANY_ADMIN","SUPER_ADMIN"].includes(user.role))throw new ApiError("Employer access required.",403);
 return user;
}
export async function companyBody(request:Request,limit=80000){
 const raw=await request.text();if(raw.length>limit)throw new ApiError("Request is too large.",413);
 try{return JSON.parse(raw);}catch{throw new ApiError("Invalid request JSON.");}
}
