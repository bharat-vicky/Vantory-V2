import {db} from "@/lib/db";
import {ApiError,objectId} from "@/lib/api-error";
import {ApplicationState,isApplicationState} from "@/lib/application-state";
import {jobDisplayStatus} from "@/lib/jobs/availability";
import {validDay} from "./saved-filters";
const labels:Record<string,string>={APPLIED:"Applied",UNDER_REVIEW:"Under review",SHORTLISTED:"Shortlisted",INTERVIEW:"Interview",SELECTED:"Selected",OFFERED:"Offered",REJECTED:"Rejected",WITHDRAWN:"Withdrawn"};
export function analyticsFilters(params:URLSearchParams){
 const jobId=params.get("jobId") || "ALL",from=params.get("from") || "",to=params.get("to") || "";
 if(jobId!=="ALL" && !objectId(jobId))throw new ApiError("Choose a valid opening.");
 if(from && !validDay(from) || to && !validDay(to) || from && to && from>to)throw new ApiError("Choose a valid application date range.");
 return {jobId,from,to};
}
type AnalyticsJob={id:string;title:string;status:string;expiresAt?:Date|null};
type AnalyticsApplication={jobId:string;status:string;timelineJson:string;createdAt:Date};
export function summarizeHiring(jobs:AnalyticsJob[],applications:AnalyticsApplication[],now=new Date()){
 const statuses=Object.values(ApplicationState),count=(status:string)=>applications.filter(a=>a.status===status).length;
 let withTimeline=0;
 const seen=applications.map(a=>{
  const reached=new Set<string>(["APPLIED"]);if(isApplicationState(a.status))reached.add(a.status);
  try{
   const events=JSON.parse(a.timelineJson);
   if(Array.isArray(events)){
    const valid=events.filter(e=>e && isApplicationState(e.status) && typeof e.timestamp==="string" && Number.isFinite(Date.parse(e.timestamp)) && Date.parse(e.timestamp)<=now.getTime());
    if(valid.length)withTimeline++;
    for(const e of valid)reached.add(e.status);
   }
  }catch{ /* Current stage remains usable when old history is unavailable. */ }
  return reached;
 });
 const share=(n:number)=>applications.length?Math.round(n/applications.length*1000)/10:null;
 return {
  generatedAt:now.toISOString(),totalApplications:applications.length,
  currentStages:statuses.map(status=>({status,label:labels[status],count:count(status),share:share(count(status))})),
  recordedStages:statuses.map(status=>{const n=seen.filter(s=>s.has(status)).length;return {status,label:labels[status],count:n,share:share(n)};}),
  historyCoverage:{withTimeline,withoutTimeline:applications.length-withTimeline},
  unknownStatusCount:applications.filter(a=>!isApplicationState(a.status)).length,
  perOpening:jobs.map(job=>{
   const rows=applications.filter(a=>a.jobId===job.id);
   return {id:job.id,title:job.title,status:jobDisplayStatus(job,now),totalApplications:rows.length,activePipeline:rows.filter(a=>["APPLIED","UNDER_REVIEW","SHORTLISTED","INTERVIEW","SELECTED"].includes(a.status)).length,offers:rows.filter(a=>a.status==="OFFERED").length,withdrawn:rows.filter(a=>a.status==="WITHDRAWN").length};
  })
 };
}
export async function getHiringAnalytics(userId:string,filters:ReturnType<typeof analyticsFilters>){
 const jobs=await db.jobPosting.findMany({where:{companyUserId:userId},select:{id:true,title:true,status:true,expiresAt:true},orderBy:{createdAt:"desc"}});
 if(filters.jobId!=="ALL" && !jobs.some(j=>j.id===filters.jobId))throw new ApiError("Opening not found.",404);
 const selected=jobs.filter(j=>filters.jobId==="ALL" || j.id===filters.jobId);
 const dates={...(filters.from?{gte:new Date(filters.from+"T00:00:00.000Z")} : {}),...(filters.to?{lt:new Date(Date.parse(filters.to+"T00:00:00.000Z")+86400000)}:{})};
 const applications=selected.length?await db.jobApplication.findMany({where:{jobId:{in:selected.map(j=>j.id)},...(Object.keys(dates).length?{createdAt:dates}:{})},select:{jobId:true,status:true,timelineJson:true,createdAt:true}}):[];
 return {...summarizeHiring(selected,applications),scope:filters,jobs:jobs.map(j=>({id:j.id,title:j.title}))};
}
