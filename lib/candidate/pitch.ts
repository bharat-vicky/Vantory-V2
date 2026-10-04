import { ApiError } from "@/lib/api-error";
export function pitchChecks(transcript:string,targetRole:string,durationSeconds:number){
  if(!transcript.trim() || transcript.length>4000 || !targetRole.trim() || targetRole.length>150 || !Number.isInteger(durationSeconds) || durationSeconds<1 || durationSeconds>180)throw new ApiError("Provide a role, a transcript of up to 4,000 characters and a duration of 1–180 seconds.");
  const words=transcript.trim().split(/\s+/).length;
  const checks=[
    {id:"direction",title:"Career direction",present:targetRole.toLowerCase().split(/\s+/).some(w=>w.length>3 && transcript.toLowerCase().includes(w)),action:"State the role you are pursuing and why it interests you."},
    {id:"example",title:"A real example",present:/\b(project|coursework|internship|built|developed|analysed|analyzed|tested|implemented|designed)\b/i.test(transcript),action:"Include one real project, coursework or work example."},
    {id:"contribution",title:"Personal contribution",present:/\bI\s+(?:personally\s+)?(?:built|developed|tested|implemented|designed|analysed|analyzed|contributed|created|debugged|validated|worked)\b/i.test(transcript),action:"Explain your own contribution to the example."},
    {id:"checks",title:"How you checked the work",present:/\b(test|tests|tested|validated|verified|checked|compared|measured|reviewed)\b/i.test(transcript),action:"Explain a check or observed result; do not invent a metric."}
  ];
  return {version:"pitch-checks.v1",wordCount:words,approximateWordsPerMinute:Math.round(words*60/durationSeconds),durationSeconds,checks,note:"Pattern-based content prompts using your supplied transcript and duration. Recording delivery, confidence, accent and body language are not scored."};
}
