import { ApiError } from "@/lib/api-error";

export interface InterviewSchedule {
  state: "SCHEDULED" | "CANCELLED";
  startsAt: string;
  timeZone: string;
  durationMinutes: number;
  mode: "ONLINE" | "ONSITE" | "PHONE";
  joiningDetails: string;
  interviewer: string;
  message: string;
  updatedAt: string;
  sequence: number;
}

function wallParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23" }).formatToParts(date);
  const value = (key: string) => parts.find(p => p.type === key)?.value;
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
}

export function localInterviewTime(instant: string, timeZone: string) { return wallParts(new Date(instant), timeZone); }

export function interviewUtc(local: unknown, timeZone: unknown): Date {
  if (typeof local !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local) || typeof timeZone !== "string" || timeZone.length > 100) throw new ApiError("Choose a date, time and valid time zone.");
  try { new Intl.DateTimeFormat("en", {timeZone}).format(); } catch { throw new ApiError("Use an IANA time zone, such as Asia/Kolkata or Europe/London."); }
  const target = Date.parse(`${local}:00Z`);
  if (!Number.isFinite(target)) throw new ApiError("Choose a valid date and time.");
  let utc = target;
  for (let i = 0; i < 4; i++) utc += target - Date.parse(`${wallParts(new Date(utc), timeZone)}:00Z`);
  if (wallParts(new Date(utc), timeZone) !== local) throw new ApiError("This local time does not exist. Choose a time outside the daylight-saving change.");
  if ([-60,-30,30,60].some(minutes => wallParts(new Date(utc + minutes * 60000), timeZone) === local)) throw new ApiError("This local time occurs twice. Use UTC or choose a time outside the daylight-saving change.");
  return new Date(utc);
}

export function validateInterview(input: unknown, now = new Date()): Omit<InterviewSchedule,"state"|"updatedAt"|"sequence"> {
  if (!input || typeof input !== "object") throw new ApiError("Enter the interview details.");
  const b = input as Record<string,unknown>;
  const startsAt = interviewUtc(b.localDateTime,b.timeZone);
  if (startsAt <= now || startsAt.getTime() > now.getTime() + 366 * 86400000) throw new ApiError("Schedule the interview in the future, within the next year.");
  if (!Number.isInteger(b.durationMinutes) || Number(b.durationMinutes) < 15 || Number(b.durationMinutes) > 240) throw new ApiError("Choose a duration from 15 to 240 minutes.");
  if (!["ONLINE","ONSITE","PHONE"].includes(String(b.mode))) throw new ApiError("Choose an interview format.");
  const text = (key: string, max: number) => {
    if (typeof b[key] !== "string" || String(b[key]).length > max) throw new ApiError(`Invalid ${key}.`);
    return String(b[key]).trim();
  };
  const joiningDetails = text("joiningDetails",500);
  if (!joiningDetails) throw new ApiError("Provide a meeting link, location or phone instructions.");
  if (b.mode === "ONLINE") {
    let url: URL; try { url = new URL(joiningDetails); } catch { throw new ApiError("Enter a valid HTTPS meeting link."); }
    if (url.protocol !== "https:" || url.username || url.password) throw new ApiError("Enter a valid HTTPS meeting link without embedded credentials.");
  }
  return {startsAt:startsAt.toISOString(),timeZone:String(b.timeZone),durationMinutes:Number(b.durationMinutes),mode:b.mode as InterviewSchedule["mode"],joiningDetails,interviewer:text("interviewer",150),message:text("message",2000)};
}

export function applicationInterview(timelineJson: string, applicationStatus: string): InterviewSchedule | null {
  try {
    const events = JSON.parse(timelineJson);
    if (!Array.isArray(events)) return null;
    const event = [...events].reverse().find(e => e?.kind === "INTERVIEW_SCHEDULE" && e.interview);
    if (!event) return null;
    const s = event.interview;
    if (!["SCHEDULED","CANCELLED"].includes(s.state) || !Number.isFinite(Date.parse(s.startsAt))) return null;
    if (s.state === "SCHEDULED" && ["WITHDRAWN","REJECTED","OFFERED","SELECTED"].includes(applicationStatus)) {
      const latest = events[events.length-1]?.timestamp;
      return {...s,state:"CANCELLED",sequence:s.sequence+1,updatedAt:Number.isFinite(Date.parse(latest)) ? latest : s.updatedAt};
    }
    return s;
  } catch { return null; }
}

function calendarEscape(value: string) { return value.replace(/\\/g,"\\\\").replace(/\r?\n|\r/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;"); }
function calendarTime(value: string) { return new Date(value).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,""); }
function fold(line: string) {
  const parts: string[] = []; let part = "", size = 0;
  for (const c of line) { const bytes = new TextEncoder().encode(c).length; if (size + bytes > 75) {parts.push(part);part=" ";size=1;}part+=c;size+=bytes; }
  parts.push(part);return parts.join("\r\n");
}
export function interviewCalendar(id: string, title: string, company: string, schedule: InterviewSchedule) {
  const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Vantory//Interview Calendar//EN","CALSCALE:GREGORIAN","METHOD:PUBLISH","BEGIN:VEVENT",
    `UID:${id}@vantory.app`,`SEQUENCE:${schedule.sequence}`,`DTSTAMP:${calendarTime(schedule.updatedAt)}`,`DTSTART:${calendarTime(schedule.startsAt)}`,
    `DTEND:${calendarTime(new Date(Date.parse(schedule.startsAt)+schedule.durationMinutes*60000).toISOString())}`,
    `SUMMARY:${calendarEscape(`Interview: ${title} at ${company}`)}`,`LOCATION:${calendarEscape(schedule.joiningDetails)}`,
    `DESCRIPTION:${calendarEscape([`Time zone: ${schedule.timeZone}`,`Format: ${schedule.mode}`,schedule.interviewer && `Interviewer: ${schedule.interviewer}`,schedule.message].filter(Boolean).join("\n"))}`,
    `STATUS:${schedule.state === "SCHEDULED" ? "CONFIRMED" : "CANCELLED"}`,"END:VEVENT","END:VCALENDAR"];
  return lines.map(fold).join("\r\n")+"\r\n";
}
