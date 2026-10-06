import {NextResponse} from "next/server";
import {requireCandidate} from "@/lib/auth/authorization";
import {db} from "@/lib/db";
import {applicationInterview} from "@/lib/jobs/interview-schedule";
import {feedbackReminders} from "@/lib/resume/feedback";
import {latestApplicationUpdate} from "@/lib/jobs/application-updates";
import {apiError} from "@/lib/api-error";
import {parseJson,defaultPreferences} from "@/lib/candidate/profile";
export async function GET(){try{const u=await requireCandidate();const p=await db.profile.findUnique({where:{userId:u.id}});const pref=parseJson(p?.preferencesJson,defaultPreferences);const now=new Date(),soon=new Date(Date.now()+7*86400000);const reminders:{id:string;title:string;at:string|null;href:string}[]=[];
 if(pref.reminders){const [external,saved]=await Promise.all([db.candidateOpportunity.findMany({where:{userId:u.id,status:{notIn:["WITHDRAWN","REJECTED","OFFERED"]},OR:[{deadline:{gte:now,lte:soon}},{interviewAt:{gte:now,lte:soon}}]},orderBy:{updatedAt:"desc"},take:30}),db.savedJob.findMany({where:{userId:u.id,job:{status:"ACTIVE",verificationStatus:"VERIFIED",expiresAt:{gte:now,lte:soon}}},include:{job:true},take:30})]);for(const o of external){if(o.deadline && o.deadline>=now && o.deadline<=soon)reminders.push({id:o.id+"deadline",title:`Application deadline: ${o.title} at ${o.company}`,at:o.deadline.toISOString(),href:"/opportunities"});if(o.interviewAt && o.interviewAt>=now && o.interviewAt<=soon)reminders.push({id:o.id+"interview",title:`Interview: ${o.title} at ${o.company}`,at:o.interviewAt.toISOString(),href:"/opportunities"});}for(const s of saved)reminders.push({id:s.id,title:`Saved job closes: ${s.job.title}`,at:s.job.expiresAt!.toISOString(),href:`/jobs/${s.job.id}`});}
 if(pref.reminders){const apps=await db.jobApplication.findMany({where:{userId:u.id,status:"INTERVIEW"},include:{job:{select:{title:true,company:true}}},take:100});for(const app of apps){const interview=applicationInterview(app.timelineJson,app.status);if(interview?.state==="SCHEDULED" && new Date(interview.startsAt)>=now && new Date(interview.startsAt)<=soon)reminders.push({id:app.id+"-scheduled-interview",title:`Interview: ${app.job.title} at ${app.job.company}`,at:interview.startsAt,href:`/jobs/applications/${app.id}`});}}
 if(pref.applicationUpdates){const since=new Date(Date.now()-7*86400000);const apps=await db.jobApplication.findMany({where:{userId:u.id,updatedAt:{gte:since}},include:{job:{select:{title:true,company:true}}},take:15,orderBy:{updatedAt:"desc"}});for(const a of apps){const update=latestApplicationUpdate(a);if(update && new Date(update.at)>=since)reminders.push({id:a.id,title:`${a.job.title}: ${update.title}`,at:update.at,href:`/jobs/applications/${a.id}`});}}
 if(pref.preparationNudges){const task=await db.preparationTask.findFirst({where:{userId:u.id,status:"IN_PROGRESS"},orderBy:{updatedAt:"asc"}});if(task)reminders.push({id:task.id,title:"Continue your preparation task",at:null,href:`/preparation?topicId=${task.topicId}`});}
 if(pref.resumeFeedback)reminders.push(...await feedbackReminders(u.id));
 return NextResponse.json({success:true,reminders});
}catch(e){return apiError(e);}}
