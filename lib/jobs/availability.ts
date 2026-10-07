import type {Prisma} from "@prisma/client";
export function activeJobWhere(now=new Date()):Prisma.JobPostingWhereInput {
 return {status:"ACTIVE",verificationStatus:"VERIFIED",OR:[{expiresAt:null},{expiresAt:{isSet:false}},{expiresAt:{gt:now}}]};
}
export function jobDisplayStatus(job:{status:string;expiresAt?:Date|string|null},now=new Date()){
 return job.status==="ACTIVE" && job.expiresAt && new Date(job.expiresAt)<=now?"EXPIRED":job.status;
}
export function jobAvailable(job:{status:string;verificationStatus:string;expiresAt?:Date|string|null},now=new Date()){
 return jobDisplayStatus(job,now)==="ACTIVE" && job.verificationStatus==="VERIFIED";
}
export function localDeadline(value:string|null|undefined){
 if(!value)return "";
 const d=new Date(value);if(!Number.isFinite(d.getTime()))return "";
 return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
