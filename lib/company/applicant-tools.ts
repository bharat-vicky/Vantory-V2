import {ApiError,objectId} from "@/lib/api-error";
import {db} from "@/lib/db";

import {emptyEvaluation,type ApplicantEvaluation} from "@/lib/company/applicant-tools-types";
export function validateEvaluation(value:unknown):ApplicantEvaluation {
  if(!value || typeof value!=="object" || Array.isArray(value))throw new ApiError("Enter evaluation details.");
  const b=value as Record<string,unknown>;
  if(!["UNDECIDED","PROCEED","HOLD","DO_NOT_PROCEED"].includes(String(b.recommendation)) || !["NOT_RECORDED","COMPLETED","NO_SHOW","CANCELLED"].includes(String(b.interviewOutcome)))throw new ApiError("Choose a valid recommendation and interview outcome.");
  const text=(key:string)=>{if(typeof b[key]!=="string" || String(b[key]).length>2000)throw new ApiError("Each evaluation field allows up to 2,000 characters.");return String(b[key]).trim();};
  return {strengths:text("strengths"),concerns:text("concerns"),nextStep:text("nextStep"),recommendation:b.recommendation as ApplicantEvaluation["recommendation"],interviewOutcome:b.interviewOutcome as ApplicantEvaluation["interviewOutcome"]};
}
export function readEvaluation(raw:string|null|undefined):ApplicantEvaluation {
  try{return validateEvaluation(JSON.parse(raw || "null"));}catch{return {...emptyEvaluation};}
}
async function ownedApplication(companyUserId:string,id:string,expectedUpdatedAt:unknown) {
  if(!objectId(id) || typeof expectedUpdatedAt!=="string" || !Number.isFinite(Date.parse(expectedUpdatedAt)))throw new ApiError("Refresh this application before saving.");
  const app=await db.jobApplication.findUnique({where:{id},include:{job:true}});
  if(!app || app.job.companyUserId!==companyUserId)throw new ApiError("Application unavailable.",404);
  if(app.updatedAt.toISOString()!==expectedUpdatedAt)throw new ApiError("This application changed. Refresh before saving.",409);
  return app;
}
export async function saveApplicantEvaluation(companyUserId:string,id:string,body:Record<string,unknown>) {
  const evaluation=validateEvaluation(body.evaluation),app=await ownedApplication(companyUserId,id,body.expectedUpdatedAt);
  // Evaluation never changes hiring status, meeting details or candidate history.
  const savedAt=new Date(Math.max(Date.now(),app.updatedAt.getTime()+1));
  const changed=await db.jobApplication.updateMany({where:{id,updatedAt:app.updatedAt},data:{evaluationJson:JSON.stringify(evaluation),updatedAt:savedAt}});
  if(changed.count!==1)throw new ApiError("This application changed. Refresh before saving.",409);
  return {evaluation,updatedAt:savedAt.toISOString()};
}
export async function publishApplicantUpdate(companyUserId:string,id:string,body:Record<string,unknown>) {
  if(typeof body.message!=="string" || !body.message.trim() || body.message.length>2000)throw new ApiError("Write a candidate update of up to 2,000 characters.");
  const app=await ownedApplication(companyUserId,id,body.expectedUpdatedAt);
  if(app.status==="WITHDRAWN")throw new ApiError("This candidate withdrew. Further updates are unavailable.",409);
  let timeline:Array<Record<string,unknown>>;
  try{timeline=JSON.parse(app.timelineJson);if(!Array.isArray(timeline))throw new Error();}catch{throw new ApiError("Application history is unavailable.",409);}
  const savedAt=new Date(Math.max(Date.now(),app.updatedAt.getTime()+1));
  const event={kind:"EMPLOYER_UPDATE",status:app.status,title:"Update from hiring team",timestamp:savedAt.toISOString(),note:body.message.trim()};
  timeline.push(event);
  const changed=await db.jobApplication.updateMany({where:{id,status:app.status,updatedAt:app.updatedAt},data:{timelineJson:JSON.stringify(timeline),updatedAt:savedAt}});
  if(changed.count!==1)throw new ApiError("This application changed. Refresh before sending.",409);
  return {updatedAt:savedAt.toISOString(),event};
}
