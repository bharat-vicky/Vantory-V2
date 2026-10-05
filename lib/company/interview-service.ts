import {db} from "@/lib/db";
import {ApiError,objectId} from "@/lib/api-error";
import {applicationInterview,validateInterview,type InterviewSchedule} from "@/lib/jobs/interview-schedule";

export async function scheduleCompanyInterview(companyUserId: string, id: string, body: Record<string,unknown>) {
  if (!objectId(id)) throw new ApiError("Invalid application.");
  if (typeof body.expectedUpdatedAt !== "string") throw new ApiError("Refresh the application before updating the interview.");
  if (!["schedule","cancel"].includes(String(body.action))) throw new ApiError("Choose schedule or cancel.");
  const app = await db.jobApplication.findUnique({where:{id},include:{job:true}});
  if (!app || app.job.companyUserId !== companyUserId) throw new ApiError("Application unavailable.",404);
  if (app.updatedAt.toISOString() !== body.expectedUpdatedAt) throw new ApiError("This application changed. Refresh before updating it.",409);
  if (!["SHORTLISTED","INTERVIEW"].includes(app.status)) throw new ApiError("Only shortlisted or interviewing applications can be scheduled.",409);
  let events: Array<Record<string,unknown>>;
  try {events=JSON.parse(app.timelineJson);if (!Array.isArray(events)) throw new Error();} catch {throw new ApiError("Application history is unavailable.",409);}
  const existing=applicationInterview(app.timelineJson,app.status), now=new Date();
  let interview: InterviewSchedule;
  if (body.action === "cancel") {
    if (existing?.state !== "SCHEDULED") throw new ApiError("There is no scheduled interview to cancel.",409);
    interview={...existing,state:"CANCELLED",updatedAt:now.toISOString(),sequence:existing.sequence+1};
  } else interview={...validateInterview(body.interview,now),state:"SCHEDULED",updatedAt:now.toISOString(),sequence:(existing?.sequence || 0)+1};
  const title=body.action === "cancel" ? "Interview cancelled" : existing ? "Interview rescheduled" : "Interview scheduled";
  events.push({kind:"INTERVIEW_SCHEDULE",status:"INTERVIEW",title,timestamp:now.toISOString(),note:`${title} by ${app.job.company} hiring team.`,interview});
  const changed=await db.jobApplication.updateMany({where:{id,status:app.status,updatedAt:app.updatedAt},data:{status:"INTERVIEW",timelineJson:JSON.stringify(events)}});
  if (changed.count !== 1) throw new ApiError("This application changed. Refresh before updating it.",409);
  const updated=await db.jobApplication.findUnique({where:{id}});
  if (!updated) throw new ApiError("Application unavailable.",404);
  return {status:updated.status,updatedAt:updated.updatedAt.toISOString(),interview:applicationInterview(updated.timelineJson,updated.status)};
}
