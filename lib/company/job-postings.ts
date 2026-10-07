import type {JobPosting,Prisma} from "@prisma/client";
import {db} from "@/lib/db";
import {ApiError,objectId} from "@/lib/api-error";
import {validateEligibility} from "@/lib/jobs/eligibility";
import {getOrCreateCompanyProfile} from "./company-service";

export function jobFields(value:unknown,current?:JobPosting,now=new Date()){
 if(!value || typeof value!=="object" || Array.isArray(value))throw new ApiError("Invalid job details.");
 const b=value as Record<string,unknown>;
 if(b.republish!==undefined && typeof b.republish!=="boolean")throw new ApiError("Invalid publish action.");
 const status=b.republish===true?"ACTIVE":b.status ?? current?.status ?? "ACTIVE";
 if(!["ACTIVE","DRAFT","PAUSED","CLOSED"].includes(String(status)))throw new ApiError("Unsupported job status.");
 if(!current && !["ACTIVE","DRAFT"].includes(String(status)))throw new ApiError("New jobs must be a draft or active.");
 if(current && current.status!=="DRAFT" && status==="DRAFT")throw new ApiError("Published jobs cannot become drafts. Close the opening or clone it as a draft.");
 if(current?.status==="DRAFT" && !["DRAFT","ACTIVE"].includes(String(status)))throw new ApiError("Keep this opening as a private draft or publish it. Only published openings can be paused or closed.");
 const text=(key:keyof JobPosting,max:number,fallback="")=>{
  const v=b[key]===undefined?current?.[key] ?? fallback:b[key];
  if(v==null)return "";
  if(typeof v!=="string" || v.length>max)throw new ApiError(String(key)+" is too long or invalid.");
  return v.trim();
 };
 const choice=(key:keyof JobPosting,values:string[],fallback:string)=>{
  const v=text(key,40,fallback);if(!values.includes(v))throw new ApiError("Choose a supported "+String(key)+".");return v;
 };
 const number=(key:keyof JobPosting,max:number,fallback:number|null)=>{
  const v=b[key]===undefined?current?.[key] ?? fallback:b[key];
  if(v===null || v==="")return null;
  if(typeof v!=="number" || !Number.isFinite(v) || v<0 || v>max || !Number.isInteger(v))throw new ApiError("Invalid "+String(key)+".");return v;
 };
 const title=text("title",180),description=text("description",20000),requirements=text("requirements",12000);
 if(!title)throw new ApiError("Job title is required.");
 if(status==="ACTIVE" && (!description || !requirements))throw new ApiError("Add the job description and requirements before publishing.");
 let expiresAt=current?.expiresAt ?? null;
 if(b.expiresAt!==undefined){
  if(b.expiresAt===null || b.expiresAt==="")expiresAt=null;
  else{
   if(typeof b.expiresAt!=="string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(b.expiresAt))throw new ApiError("Choose a valid application deadline.");
   expiresAt=new Date(b.expiresAt);
   if(!Number.isFinite(expiresAt.getTime()) || expiresAt.toISOString()!==b.expiresAt)throw new ApiError("Choose a valid application deadline.");
  }
 }
 if(status==="ACTIVE" && expiresAt && expiresAt<=now)throw new ApiError("The application deadline has passed. Set a future deadline or clear it before publishing.");
 const experienceMin=number("experienceMin",60,0) ?? 0,experienceMax=number("experienceMax",60,2) ?? 2;
 const salaryMin=number("salaryMin",1000000000,null),salaryMax=number("salaryMax",1000000000,null);
 if(experienceMin>experienceMax)throw new ApiError("Minimum experience cannot exceed maximum experience.");
 if(salaryMin!==null && salaryMax!==null && salaryMin>salaryMax)throw new ApiError("Minimum salary cannot exceed maximum salary.");
 const salaryPeriod=choice("salaryPeriod",["month","year","hour"],"year");
 let companyUrl=text("companyUrl",2048);
 if(companyUrl){try{const url=new URL(companyUrl);if(!["https:","http:"].includes(url.protocol) || url.username || url.password)throw new Error();companyUrl=url.toString();}catch{throw new ApiError("Use a valid HTTP or HTTPS company website.");}}
 const salary=salaryMin!==null || salaryMax!==null?"₹"+(salaryMin??0).toLocaleString("en-IN")+" - ₹"+(salaryMax??0).toLocaleString("en-IN")+"/"+({month:"mo",year:"yr",hour:"hr"}[salaryPeriod]):text("salary",200,"Competitive") || "Competitive";
 return {
  title,description,requirements,status:String(status),expiresAt,experienceMin,experienceMax,experience:experienceMin+"-"+experienceMax+" Years",salaryMin,salaryMax,salaryPeriod,salary,
  location:text("location",200,"Remote") || "Remote",workMode:choice("workMode",["Remote","Hybrid","On-site"],"Remote"),type:choice("type",["Full-time","Part-time","Contract","Internship"],"Full-time"),
  companyUrl:companyUrl || null,aboutCompany:text("aboutCompany",10000) || null,responsibilities:text("responsibilities",12000) || null,preferredRequirements:text("preferredRequirements",12000) || null,skills:text("skills",2000),tags:text("tags",1000),
  eligibilityJson:b.eligibility===undefined?current?.eligibilityJson ?? null:b.eligibility===null?null:JSON.stringify(validateEligibility(b.eligibility))
 };
}
export async function createCompanyJob(companyUserId:string,value:unknown){
 const fields=jobFields(value);
 const {profile}=await getOrCreateCompanyProfile(companyUserId);
 const job=await db.$transaction(async tx=>{
  const created=await tx.jobPosting.create({data:{...fields,company:profile.companyName,companyUserId,companyLogo:profile.logo,companyUrl:fields.companyUrl || profile.website || null,aboutCompany:fields.aboutCompany || profile.description || null,verificationStatus:profile.verificationStatus || "PENDING",hiringContact:profile.companyName}});
  await tx.activityLog.create({data:{userId:companyUserId,type:fields.status==="DRAFT"?"COMPANY_JOB_DRAFTED":"COMPANY_JOB_CREATED",title:(fields.status==="DRAFT"?"Saved draft: ":"Published job: ")+created.title,detail:created.id}});
  return created;
 });
 return job;
}
export async function ownedJob(companyUserId:string,jobId:string){
 if(!objectId(jobId))throw new ApiError("Invalid job ID.");
 const job=await db.jobPosting.findUnique({where:{id:jobId}});
 if(!job || job.companyUserId!==companyUserId)throw new ApiError("Job posting not found.",404);
 return job;
}
export async function updateCompanyJob(companyUserId:string,jobId:string,value:unknown){
 const existing=await ownedJob(companyUserId,jobId);
 const fields=jobFields(value,existing);
 const b=value as Record<string,unknown>;
 if(typeof b.expectedUpdatedAt!=="string" || !Number.isFinite(Date.parse(b.expectedUpdatedAt)))throw new ApiError("Reload the opening before saving.");
 if(existing.updatedAt.toISOString()!==b.expectedUpdatedAt)throw new ApiError("This opening changed. Reload it before saving.",409);
 const updatedAt=new Date(Math.max(Date.now(),existing.updatedAt.getTime()+1));
 return db.$transaction(async tx=>{
  const data:Prisma.JobPostingUpdateManyMutationInput={...fields,updatedAt};
  if(b.republish===true || existing.status==="DRAFT" && fields.status==="ACTIVE")data.postedAt=updatedAt;
  const result=await tx.jobPosting.updateMany({where:{id:jobId,companyUserId,updatedAt:existing.updatedAt},data});
  if(result.count!==1)throw new ApiError("This opening changed. Reload it before saving.",409);
  const updated=await tx.jobPosting.findUniqueOrThrow({where:{id:jobId}});
  await tx.activityLog.create({data:{userId:companyUserId,type:"COMPANY_JOB_UPDATED",title:"Updated job: "+updated.title,detail:"Status: "+updated.status}});
  return updated;
 });
}
export async function cloneCompanyJob(companyUserId:string,jobId:string){
 const source=await ownedJob(companyUserId,jobId);
 let eligibility;try{eligibility=source.eligibilityJson?JSON.parse(source.eligibilityJson):null;}catch{throw new ApiError("The source eligibility rules need correcting before cloning.");}
 return createCompanyJob(companyUserId,{...source,title:source.title.slice(0,173)+" (copy)",status:"DRAFT",expiresAt:null,eligibility});
}
