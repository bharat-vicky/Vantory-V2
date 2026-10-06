import { NextResponse } from "next/server";
import { requireCandidate } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { ApiError, apiError } from "@/lib/api-error";
import { defaultCareer, defaultPreferences, parseJson, profileCompletion, validateCareer } from "@/lib/candidate/profile";
export async function GET(){try{const u=await requireCandidate();const user=await db.user.findUnique({where:{id:u.id},select:{name:true,email:true,instituteId:true,profile:true}});return NextResponse.json({success:true,user,career:parseJson(user?.profile?.careerJson,defaultCareer),preferences:parseJson(user?.profile?.preferencesJson,defaultPreferences)});}catch(e){return apiError(e);}}
export async function PATCH(request:Request){try{
 const u=await requireCandidate();const b=await request.json();const existing=await db.profile.findUnique({where:{userId:u.id}});
 const fields=["headline","bio","phone","location","githubUrl","linkedinUrl","portfolioUrl","skills","education","department","course"] as const;
 const data:Record<string,string|number|null>={};
 for(const f of fields) {if(b.profile?.[f]!==undefined){if(b.profile[f]===null){data[f]=null;continue;}if(typeof b.profile[f]!=="string" || b.profile[f].length>(f==="bio"?3000:600))throw new ApiError(`Invalid ${f}.`);const v=b.profile[f].trim();if(f.endsWith("Url") && v){let url:URL;try{url=new URL(v);}catch{throw new ApiError("Use a valid web URL.");}if(!["https:","http:"].includes(url.protocol))throw new ApiError("Use a web URL.");}data[f]=v || null;}}
 if(b.profile?.graduationYear!==undefined){const y=b.profile.graduationYear;if(y!==null && (!Number.isInteger(y) || y<1990 || y>2100))throw new ApiError("Invalid graduation year.");data.graduationYear=y;}
 const career=b.career!==undefined ? validateCareer(b.career):parseJson(existing?.careerJson,defaultCareer);
 if(b.career!==undefined)data.careerJson=JSON.stringify(career);
 if(b.preferences!==undefined){if(!b.preferences || !["applicationUpdates","reminders","preparationNudges"].every(k=>typeof b.preferences[k]==="boolean") || (b.preferences.resumeFeedback!==undefined && typeof b.preferences.resumeFeedback!=="boolean"))throw new ApiError("Invalid notification preferences.");const saved=parseJson(existing?.preferencesJson,defaultPreferences);data.preferencesJson=JSON.stringify(Object.fromEntries(Object.keys(defaultPreferences).map(k=>[k,b.preferences[k] ?? saved[k as keyof typeof saved]])));}
 data.completionScore=profileCompletion({...existing,...data},career);
 const p=await db.profile.upsert({where:{userId:u.id},create:{userId:u.id,...data},update:data});
 return NextResponse.json({success:true,profile:p,career,preferences:parseJson(p.preferencesJson,defaultPreferences)});
}catch(e){return apiError(e);}}
