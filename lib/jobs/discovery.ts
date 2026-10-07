import { ApiError } from "@/lib/api-error";
import type { JobFilterParams } from "./jobs-service";
const escaped=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
export function annualSalary(amount:number|null|undefined,period:string|null|undefined):number|null {if(amount==null || !Number.isFinite(amount))return null;const p=period?.toLowerCase();return p==="month" || p==="monthly" ? amount*12:p==="year" || p==="annual" || p==="yearly" ? amount:null;}
export function discoveryPipeline(p:JobFilterParams,profileTerms:string[]=[],now=new Date()) {
 const page=Number(p.page ?? 1),limit=Number(p.limit ?? 10);
 if(!Number.isInteger(page) || page<1 || page>10000 || !Number.isInteger(limit) || limit<1 || limit>50)throw new ApiError("Invalid pagination.");
 const valid=["recent","relevance","salary","experience"];if(p.sortBy && !valid.includes(p.sortBy))throw new ApiError("Invalid sorting.");
 const active={status:"ACTIVE",verificationStatus:"VERIFIED",$or:[{expiresAt:null},{expiresAt:{$gt:{$date:now.toISOString()}}}]};
 const filters:Record<string,unknown>[]=[active];
 const regex=(value:string)=>({$regex:escaped(value.slice(0,150)),$options:"i"});
 if(p.query?.trim())filters.push({$or:["title","company","skills","location","description"].map(k=>({[k]:regex(p.query!.trim())}))});
 for(const [f,k] of [["jobType","type"],["workMode","workMode"],["location","location"],["company","company"],["skills","skills"]] as const)if(p[f] && p[f]!=="ALL")filters.push({[k]:regex(p[f]!)});
 if(p.experience && p.experience!=="ALL") {const range=p.experience.match(/(\d+)(?:\s*[-\u2013\u2014]\s*(\d+))?/);if(/fresher/i.test(p.experience))filters.push({experienceMin:0});else if(range)filters.push({experienceMin:{$lte:Number(range[2] || range[1])},experienceMax:{$gte:Number(range[1])}});else throw new ApiError("Invalid experience range.");}
 const days:Record<string,number>={today:1,"3days":3,"7days":7,"30days":30};if(p.datePosted && p.datePosted!=="ALL"){if(!days[p.datePosted])throw new ApiError("Invalid posted date.");filters.push({postedAt:{$gte:{$date:new Date(now.getTime()-days[p.datePosted]*86400000).toISOString()}}});}
 const terms=[...(p.query?.trim().split(/\s+/) || []),...profileTerms].filter(Boolean).slice(0,20);
 const match=(field:string,term:string,weight:number)=>({$cond:[{$regexMatch:{input:{$ifNull:[`$${field}`,""]},regex:escaped(term),options:"i"}},weight,0]});
 const normalizedSalary=(field:string)=>({$switch:{branches:[{case:{$in:[{$toLower:{$ifNull:["$salaryPeriod",""]}},["month","monthly"]]},then:{$multiply:[`$${field}`,12]}},{case:{$in:[{$toLower:{$ifNull:["$salaryPeriod",""]}},["year","annual","yearly"]]},then:`$${field}`}],default:null}});
 const pipeline:Record<string,unknown>[]=[{$match:{$and:filters}},{$addFields:{annualMin:normalizedSalary("salaryMin"),annualMax:normalizedSalary("salaryMax"),relevance:terms.length?{$add:terms.flatMap(t=>[match("title",t,4),match("skills",t,3),match("location",t,1),match("description",t,1)])}:0}}];
 const salaryRanges:Record<string,[number,number]>={"0-25k":[0,300000],"25k-50k":[300000,600000],"50k-100k":[600000,1200000],"100k+":[1200000,Number.MAX_SAFE_INTEGER]};
 if(p.salaryRange && p.salaryRange!=="ALL"){const r=salaryRanges[p.salaryRange];if(!r)throw new ApiError("Invalid salary range.");pipeline.push({$match:{annualMin:{$ne:null,$lte:r[1]},annualMax:{$ne:null,$gte:r[0]}}});}
 const order=p.sortBy==="salary"?{annualMax:-1,postedAt:-1,_id:1}:p.sortBy==="experience"?{experienceMin:1,postedAt:-1,_id:1}:p.sortBy==="relevance"?{relevance:-1,postedAt:-1,_id:1}:{postedAt:-1,_id:1};
 pipeline.push({$facet:{jobs:[{$sort:order},{$skip:(page-1)*limit},{$limit:limit},{$project:{_id:1,relevance:1,annualMin:1,annualMax:1}}],count:[{$count:"total"}]}});
 return {pipeline,page,limit,active};
}
