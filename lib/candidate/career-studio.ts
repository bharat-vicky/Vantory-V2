import { ApiError } from "@/lib/api-error";
import type { ResumeData } from "@/lib/resume/types";
import { visibleResume } from "@/lib/resume/visible-content";
import { parseStructuredResume } from "@/lib/ats/parser/resume-parser";
import { parseJobDescription } from "@/lib/ats/parser/job-parser";
import { textDemonstratesSkill } from "@/lib/ats/taxonomy/text-skills";
import { TOPICS } from "@/lib/preparation/curriculum";

export const CAREER_ROLES=[
  {id:"frontend",title:"Frontend Developer",track:"SOFTWARE",skills:["React","JavaScript","TypeScript","Accessibility","Testing","Git"],topics:["software-frontend","software-testing","software-api"]},
  {id:"backend",title:"Backend Developer",track:"SOFTWARE",skills:["REST APIs","SQL","Python","Testing","Git"],topics:["software-api","software-db","software-arrays","software-testing"]},
  {id:"qa",title:"QA Automation Engineer",track:"SOFTWARE",skills:["Testing","JavaScript","REST APIs","SQL","Git"],topics:["software-testing","software-api","software-db"]},
  {id:"analyst",title:"Data Analyst",track:"DATA",skills:["SQL","Excel","Python","Statistics","Power BI"],topics:["data-sql","data-quality","data-statistics","data-dashboard"]}
] as const;
export function candidateExamples(data:ResumeData){
  const resume=visibleResume(data);
  return [...resume.projects.flatMap(p=>p.bullets.map((text,index)=>({id:`project:${p.id}:${index}`,title:p.title,text}))),...resume.experience.flatMap(e=>e.bullets.map((text,index)=>({id:`experience:${e.id}:${index}`,title:`${e.role}${e.company?` at ${e.company}`:""}`,text})))].filter(e=>e.text.trim());
}
export function roleEvidence(data:ResumeData,attempts:{topicId:string;kind:string;score:number;createdAt:Date}[]){
  const parsed=parseStructuredResume(data);
  const contexts=parsed.projects.flatMap(p=>[p.description,...p.bullets]).concat(parsed.experiences.flatMap(e=>[e.description,...e.bullets])).join("\n");
  return CAREER_ROLES.map(role=>({...role,skills:role.skills.map(skill=>{
    const topics=TOPICS.filter(t=>t.skills.some(s=>textDemonstratesSkill(s,skill)));
    const execution=attempts.find(a=>a.kind==="execute" && a.score>=80 && topics.some(t=>t.id===a.topicId));
    const quiz=attempts.find(a=>a.kind==="quiz" && a.score>=80 && topics.some(t=>t.id===a.topicId));
    return {skill,described:textDemonstratesSkill(contexts,skill),listed:parsed.skills.some(s=>textDemonstratesSkill(s,skill)),practice:execution?"EXECUTION_CHECK":quiz?"KNOWLEDGE_CHECK":"NOT_ASSESSED",practiceAt:(execution || quiz)?.createdAt,topicId:topics.find(t=>t.track===role.track)?.id || topics[0]?.id};
  })}));
}
export type CareerDraft={kind:"COVER_LETTER"|"LINKEDIN";title:string;targetRole:string;company:string;jobDescription:string;motivation:string;headline:string;body:string;exampleIds:string[]};
export function validateCareerDraft(value:unknown):CareerDraft {
  if(!value || typeof value!=="object")throw new ApiError("Invalid career document.");const b=value as Record<string,unknown>;
  const text=(key:string,max:number)=>{const v=b[key]??"";if(typeof v!=="string" || v.length>max)throw new ApiError(`Invalid ${key}.`);return v.trim();};
  if(!["COVER_LETTER","LINKEDIN"].includes(String(b.kind)))throw new ApiError("Choose a document type.");
  if(!Array.isArray(b.exampleIds) || b.exampleIds.length>3 || !b.exampleIds.every(id=>typeof id==="string" && id.length<=150))throw new ApiError("Select up to three resume examples.");
  const draft={kind:b.kind as CareerDraft["kind"],title:text("title",150),targetRole:text("targetRole",150),company:text("company",150),jobDescription:text("jobDescription",20000),motivation:text("motivation",1500),headline:text("headline",220),body:text("body",8000),exampleIds:[...new Set(b.exampleIds)] as string[]};
  if(!draft.targetRole)throw new ApiError("Choose a target role.");return draft;
}
export function seedCareerDraft(data:ResumeData,draft:CareerDraft):CareerDraft {
  const available=candidateExamples(data);const selected=draft.exampleIds.map(id=>available.find(e=>e.id===id));
  if(selected.some(e=>!e))throw new ApiError("A selected example changed. Reload your resume.",409);
  const examples=selected.map(e=>e!.text);
  const name=data.personalInfo.fullName;
  if(draft.kind==="COVER_LETTER") {
    if(!draft.company || !draft.jobDescription)throw new ApiError("Provide the company and job description to tailor this letter.");
    if(!examples.length)throw new ApiError("Select a real project or experience example.");
    return {...draft,title:draft.title || `${draft.targetRole} — ${draft.company}`,headline:"",body:["Dear Hiring Team,",`I am applying for the ${draft.targetRole} position at ${draft.company}.`,draft.motivation,...examples,"I would welcome the opportunity to discuss this work and the requirements of the role.",`Sincerely,\n${name}`].filter(Boolean).join("\n\n")};
  }
  const resume=visibleResume(data);
  return {...draft,title:draft.title || `${draft.targetRole} LinkedIn draft`,headline:draft.headline || resume.personalInfo.headline || draft.targetRole,body:[resume.summary,draft.motivation,...examples].filter(Boolean).join("\n\n")};
}
export function careerDocumentChecks(data:ResumeData,draft:CareerDraft){
  const jd=parseJobDescription(draft.jobDescription,draft.targetRole);
  const text=`${draft.headline}\n${draft.body}`;
  const mentioned=jd.requiredSkills.filter(s=>textDemonstratesSkill(text,s));
  const resume=parseStructuredResume(data);
  const unsupported=jd.requiredSkills.filter(s=>textDemonstratesSkill(text,s) && !textDemonstratesSkill(resume.rawText,s));
  const issues:string[]=[];
  if(draft.body.split(/\s+/).filter(Boolean).length>450)issues.push("Consider shortening the document to its most relevant examples.");
  if(!draft.body.trim())issues.push("Add a factual introduction and relevant examples.");
  if(draft.kind==="COVER_LETTER" && !draft.motivation)issues.push("Add your own genuine reason for applying to this role or company.");
  if(/\b(\[.*?\]|insert here|your name|company name)\b/i.test(text))issues.push("Replace remaining placeholders before using this document.");
  if(unsupported.length)issues.push(`Check claims mentioning ${unsupported.join(", ")}; these were not found in the selected resume.`);
  return {issues,mentionedRequirements:mentioned,notMentionedRequirements:jd.requiredSkills.filter(s=>!mentioned.includes(s)),unsupportedClaims:unsupported,wordCount:draft.body.split(/\s+/).filter(Boolean).length,assessmentVersion:"document-checks.v1"};
}
