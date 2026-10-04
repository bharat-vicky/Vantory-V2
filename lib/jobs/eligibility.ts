import { CareerProfile } from "@/lib/candidate/profile";
import { ApiError } from "@/lib/api-error";
export type Eligibility={graduationYears?:number[];courses?:string[];minCgpa?:number;minPercentage?:number;maxBacklogs?:number};
export function validateEligibility(value:unknown):Eligibility {
 if(!value || typeof value!=="object" || Array.isArray(value))throw new ApiError("Invalid eligibility criteria.");
 const v=value as Eligibility;const out:Eligibility={};
 if(v.graduationYears!==undefined){if(!Array.isArray(v.graduationYears) || v.graduationYears.length>20 || !v.graduationYears.every(y=>Number.isInteger(y) && y>=1990 && y<=2100))throw new ApiError("Invalid graduation years.");out.graduationYears=v.graduationYears;}
 if(v.courses!==undefined){if(!Array.isArray(v.courses) || v.courses.length>30 || !v.courses.every(c=>typeof c==="string" && c.length<=100))throw new ApiError("Invalid courses.");out.courses=v.courses.map(c=>c.trim()).filter(Boolean);}
 for(const [key,max] of [["minCgpa",10],["minPercentage",100],["maxBacklogs",100]] as const)if(v[key]!==undefined){if(typeof v[key]!=="number" || !Number.isFinite(v[key]) || v[key]!<0 || v[key]!>max || key==="maxBacklogs" && !Number.isInteger(v[key]))throw new ApiError("Invalid academic criteria.");out[key]=v[key];}
 return out;
}
export function checkEligibility(criteria:Eligibility|null,profile:{graduationYear:number|null;course:string|null}|null,career:CareerProfile){
 const checks:{label:string;status:"MET"|"NOT_MET"|"UNKNOWN";detail:string}[]=[];
 if(!criteria)return {status:"UNKNOWN",checks,notice:"The employer has not supplied structured eligibility rules. Review the job description."};
 const add=(label:string,value:unknown,met:boolean,detail:string)=>checks.push({label,status:value===null || value===undefined || value===""?"UNKNOWN":met?"MET":"NOT_MET",detail});
 if(criteria.graduationYears?.length)add("Graduation year",profile?.graduationYear,criteria.graduationYears.includes(profile?.graduationYear || 0),criteria.graduationYears.join(", "));
 if(criteria.courses?.length)add("Course",profile?.course,criteria.courses.some(c=>c.toLowerCase()===profile?.course?.toLowerCase()),criteria.courses.join(", "));
 if(criteria.minCgpa!==undefined)add("CGPA",career.cgpa,career.cgpa!==null && career.cgpa>=criteria.minCgpa,`Minimum ${criteria.minCgpa}/10`);
 if(criteria.minPercentage!==undefined)add("Percentage",career.percentage,career.percentage!==null && career.percentage>=criteria.minPercentage,`Minimum ${criteria.minPercentage}%`);
 if(criteria.maxBacklogs!==undefined)add("Active backlogs",career.activeBacklogs,career.activeBacklogs!==null && career.activeBacklogs<=criteria.maxBacklogs,`Maximum ${criteria.maxBacklogs}`);
 return {status:checks.some(c=>c.status==="NOT_MET")?"NOT_MET":!checks.length || checks.some(c=>c.status==="UNKNOWN")?"UNKNOWN":"MET",checks,notice:"Comparison uses your self-reported profile. Confirm ambiguous requirements with the employer."};
}
