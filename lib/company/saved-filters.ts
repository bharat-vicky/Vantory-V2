import {createHash,randomUUID} from "node:crypto";
import {ApiError,objectId} from "@/lib/api-error";
import {isApplicationState} from "@/lib/application-state";
import {db} from "@/lib/db";
import {getOrCreateCompanyProfile} from "./company-service";
import type {PipelineFilters} from "./pipeline-filters";
import type {SavedApplicantFilter} from "./saved-filters-types";
export function validDay(value:unknown):value is string {
 return typeof value==="string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value;
}
export function validateSavedFilters(value:unknown):PipelineFilters {
 if(!value || typeof value!=="object" || Array.isArray(value))throw new ApiError("Invalid applicant filters.");
 const b=value as Record<string,unknown>;
 if(typeof b.search!=="string" || b.search.length>150 || typeof b.jobId!=="string" || b.jobId!=="ALL" && !objectId(b.jobId) || b.status!=="ALL" && !isApplicationState(b.status) || !["NEWEST","OLDEST","UPDATED","NAME"].includes(String(b.sort)))throw new ApiError("Invalid applicant filters.");
 if((b.from!=="" && !validDay(b.from)) || (b.to!=="" && !validDay(b.to)) || b.from && b.to && String(b.from)>String(b.to))throw new ApiError("Choose a valid application date range.");
 return {search:b.search.trim(),jobId:b.jobId,status:String(b.status),from:String(b.from),to:String(b.to),sort:b.sort as PipelineFilters["sort"]};
}
const revision=(raw:string|null|undefined)=>createHash("sha256").update(raw ?? "").digest("hex");
function readItems(raw:string|null|undefined):SavedApplicantFilter[]{
 if(!raw)return [];
 try{
  const data=JSON.parse(raw);
  if(data.version!==1 || !Array.isArray(data.items) || data.items.length>40)throw new Error();
  return data.items.map((item:SavedApplicantFilter)=>{
   if(typeof item.id!=="string" || typeof item.name!=="string" || !item.name.trim() || item.name.length>60 || item.archivedAt!==null && !Number.isFinite(Date.parse(item.archivedAt)))throw new Error();
   return {...item,filters:validateSavedFilters(item.filters)};
  });
 }catch{throw new ApiError("Saved filters could not be read. Existing saved filters were kept.",409);}
}
export async function getSavedApplicantFilters(userId:string){
 const {profile}=await getOrCreateCompanyProfile(userId);
 return {items:readItems(profile.savedApplicantFiltersJson),revision:revision(profile.savedApplicantFiltersJson)};
}
export async function changeSavedApplicantFilters(userId:string,value:unknown){
 if(!value || typeof value!=="object" || Array.isArray(value))throw new ApiError("Invalid saved-filter request.");
 const b=value as Record<string,unknown>;
 if(!["save","archive","restore"].includes(String(b.action)))throw new ApiError("Unsupported saved-filter action.");
 const {profile}=await getOrCreateCompanyProfile(userId),raw=profile.savedApplicantFiltersJson;
 if(b.expectedRevision!==revision(raw))throw new ApiError("Saved filters changed in another tab. Reload the saved filters before trying again.",409);
 const items=readItems(raw),active=items.filter(i=>!i.archivedAt);
 if(b.action==="save"){
  if(typeof b.name!=="string" || !b.name.trim() || b.name.trim().length>60 || /[\x00-\x1f]/.test(b.name))throw new ApiError("Use a filter name of 1–60 characters.");
  const filters=validateSavedFilters(b.filters);
  if(filters.jobId!=="ALL"){
   const job=await db.jobPosting.findFirst({where:{id:filters.jobId,companyUserId:userId},select:{id:true}});
   if(!job)throw new ApiError("Choose an opening owned by your company.",404);
  }
  const name=b.name.trim(),existing=active.find(i=>i.name.toLowerCase()===name.toLowerCase());
  if(existing){existing.name=name;existing.filters=filters;}
  else{
   if(active.length>=20 || items.length>=40)throw new ApiError("You can keep up to 20 active filters and 40 filters including archived ones.");
   items.push({id:randomUUID(),name,filters,archivedAt:null});
  }
 }else{
  const item=items.find(i=>i.id===b.id);if(!item)throw new ApiError("Saved filter not found.",404);
  if(b.action==="restore" && item.archivedAt && active.length>=20)throw new ApiError("Archive an active filter before restoring this one.");
  if(b.action==="restore" && active.some(other=>other.id!==item.id && other.name.toLowerCase()===item.name.toLowerCase()))throw new ApiError("An active filter already has this name. Archive it before restoring this one.");
  item.archivedAt=b.action==="archive"?new Date().toISOString():null;
 }
 const next=JSON.stringify({version:1,items});
 const result=await db.companyProfile.updateMany({where:{id:profile.id,userId,...(raw==null?{OR:[{savedApplicantFiltersJson:null},{savedApplicantFiltersJson:{isSet:false}}]}:{savedApplicantFiltersJson:raw})},data:{savedApplicantFiltersJson:next}});
 if(result.count!==1)throw new ApiError("Saved filters changed in another tab. Reload before trying again.",409);
 return {items,revision:revision(next)};
}
