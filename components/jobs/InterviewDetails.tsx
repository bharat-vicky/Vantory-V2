import type {InterviewSchedule} from "@/lib/jobs/interview-schedule";
export function InterviewDetails({interview,applicationId}:{interview:InterviewSchedule|null;applicationId:string}) {
  if (!interview) return null;
  const time = new Intl.DateTimeFormat(undefined,{dateStyle:"full",timeStyle:"short",timeZone:interview.timeZone}).format(new Date(interview.startsAt));
  return <section className="border rounded-xl p-4 space-y-2 bg-white text-sm">
    <h3 className="font-bold">{interview.state === "SCHEDULED" ? "Scheduled interview" : "Interview cancelled"}</h3>
    <p>{time} ({interview.timeZone}) · {interview.durationMinutes} minutes</p><p>Format: {interview.mode.toLowerCase()}</p>
    {interview.interviewer && <p>Interviewer: {interview.interviewer}</p>}
    {interview.mode === "ONLINE" && interview.state === "SCHEDULED" ? <a className="underline break-all" href={interview.joiningDetails} target="_blank" rel="noopener noreferrer">Open meeting link</a> : <p className="whitespace-pre-wrap">{interview.joiningDetails}</p>}
    {interview.message && <p className="whitespace-pre-wrap">{interview.message}</p>}
    <p><a className="underline" href={`/api/applications/${applicationId}/calendar`}>{interview.state === "SCHEDULED" ? "Download calendar event (.ics)" : "Download cancelled calendar event (.ics)"}</a></p>
    <p className="text-xs text-neutral-500">After a change, download the latest event to update your calendar. No calendar invitation email is sent automatically.</p>
  </section>;
}
