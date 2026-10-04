import { ApiError } from "@/lib/api-error";
export interface CareerProfile { track:"SOFTWARE"|"DATA"; targetRoles:string[]; preferredLocations:string[]; workModes:string[]; cgpa:number|null; percentage:number|null; activeBacklogs:number|null; availability:string; mentorConsent:boolean; instituteAnalyticsConsent:boolean; consentUpdatedAt?:string }
export interface CandidatePreferences { applicationUpdates:boolean; reminders:boolean; preparationNudges:boolean }
export const defaultCareer:CareerProfile={track:"SOFTWARE",targetRoles:[],preferredLocations:[],workModes:[],cgpa:null,percentage:null,activeBacklogs:null,availability:"",mentorConsent:false,instituteAnalyticsConsent:false};
export const defaultPreferences:CandidatePreferences={applicationUpdates:true,reminders:true,preparationNudges:false};
export function parseJson<T>(raw:string|null|undefined,fallback:T):T {try {return {...fallback,...JSON.parse(raw || "{}")} as T;} catch {return fallback;}}
export function validateCareer(value:unknown):CareerProfile {
 const b=value as Record<string,unknown>;
 if(!b || !["SOFTWARE","DATA"].includes(String(b.track))) throw new ApiError("Choose a preparation track.");
 const list=(v:unknown)=>{if(!Array.isArray(v) || v.length>15 || !v.every(x=>typeof x==="string" && x.length<=100)) throw new ApiError("Invalid preference list.");return [...new Set(v.map(x=>x.trim()).filter(Boolean))];};
 const num=(v:unknown,max:number)=>{if(v===null || v==="" || v===undefined)return null;if(typeof v!=="number" || !Number.isFinite(v) || v<0 || v>max)throw new ApiError("Invalid academic value.");return v;};
 if(typeof b.mentorConsent!=="boolean" || typeof b.instituteAnalyticsConsent!=="boolean")throw new ApiError("Invalid sharing preferences.");
 const modes=list(b.workModes);if(!modes.every(x=>["REMOTE","ONSITE","HYBRID"].includes(x)))throw new ApiError("Invalid work mode.");
 const activeBacklogs=num(b.activeBacklogs,100);if(activeBacklogs!==null && !Number.isInteger(activeBacklogs))throw new ApiError("Backlogs must be a whole number.");
 return {track:b.track as CareerProfile["track"],targetRoles:list(b.targetRoles),preferredLocations:list(b.preferredLocations),workModes:modes,cgpa:num(b.cgpa,10),percentage:num(b.percentage,100),activeBacklogs,availability:typeof b.availability==="string" ? b.availability.slice(0,150):"",mentorConsent:b.mentorConsent,instituteAnalyticsConsent:b.instituteAnalyticsConsent,consentUpdatedAt:new Date().toISOString()};
}
export function profileCompletion(profile:Record<string,unknown>,career:CareerProfile):number {
 const values=[profile.headline,profile.bio,profile.phone,profile.location,profile.skills,profile.education,profile.course,profile.graduationYear,career.targetRoles.length,career.availability];
 return Math.round(values.filter(v=>typeof v==="string" ? !!v.trim():!!v).length/values.length*100);
}
