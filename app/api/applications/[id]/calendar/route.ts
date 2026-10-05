import {getCurrentUser} from "@/lib/auth/authorization";
import {db} from "@/lib/db";
import {ApiError,apiError,objectId} from "@/lib/api-error";
import {applicationInterview,interviewCalendar} from "@/lib/jobs/interview-schedule";
export async function GET(_request: Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const user=await getCurrentUser();if (!user) throw new ApiError("Please sign in.",401);
    const {id}=await params;if (!objectId(id)) throw new ApiError("Invalid application.");
    const app=await db.jobApplication.findUnique({where:{id},include:{job:true}});
    if (!app || !((app.userId===user.id && ["CANDIDATE","INSTITUTE_STUDENT"].includes(user.role)) || (app.job.companyUserId===user.id && ["COMPANY_ADMIN","SUPER_ADMIN"].includes(user.role)))) throw new ApiError("Application unavailable.",404);
    const interview=applicationInterview(app.timelineJson,app.status);
    if (!interview) throw new ApiError("No interview has been scheduled.",404);
    return new Response(interviewCalendar(id,app.job.title,app.job.company,interview),{headers:{"Content-Type":"text/calendar; charset=utf-8","Content-Disposition":'attachment; filename="vantory-interview.ics"',"Cache-Control":"private, no-store"}});
  } catch (error) {return apiError(error);}
}
