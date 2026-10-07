import { ApiError } from "@/lib/api-error";
import { executionConfiguration } from "./execution-config";
import {EXERCISES,executionCases, type ExerciseId} from "./exercise-bank";
export {EXERCISES,executionCases} from "./exercise-bank";
// Judge0's launch wrapper needs child processes before Python or SQLite starts.
// Keep a small bound that permits the wrapper without allowing a fork bomb.
const SANDBOX_PROCESS_LIMIT = 8;
export async function executeAssessment(exercise:ExerciseId,code:string){
 const definition=EXERCISES[exercise];if(!definition)throw new ApiError("Exercise not found.",404);
 if(!code.trim() || code.length>20000)throw new ApiError("Provide code of up to 20,000 characters.");
 if(definition.language==="sql" && (!/^\s*(SELECT|WITH)\b/i.test(code) || /\b(insert|update|delete|drop|alter|attach|pragma|create|replace|load_extension)\b/i.test(code)))throw new ApiError("Use a SELECT or WITH query without write operations.");
 const config=executionConfiguration();
 if(!config.available)throw new ApiError("Code execution is unavailable on this deployment. You can keep editing your solution and use knowledge checks.",503,"EXECUTION_UNAVAILABLE");
 const {base,token}=config;const language=config.languages[definition.language==="sql"?"sql":"arrays"];
 const cases=executionCases(exercise);const results=[];const deadline=Date.now()+45000;
 for(const c of cases){
  const remaining=deadline-Date.now();if(remaining<=0)throw new ApiError("Execution service took too long. Retry later.",503,"EXECUTION_UNAVAILABLE");
  let response:Response;
  try{response=await fetch(`${base.replace(/\/$/,"")}/submissions?base64_encoded=false&wait=true`,{method:"POST",redirect:"error",headers:{"Content-Type":"application/json","X-Auth-Token":token},body:JSON.stringify({language_id:language,source_code:definition.language==="sql" ? `${"setup" in c?c.setup:""}\n${code}`:code,stdin:"input" in c?c.input:null,cpu_time_limit:2,wall_time_limit:5,memory_limit:128000,max_file_size:1024,max_processes_and_or_threads:SANDBOX_PROCESS_LIMIT,enable_network:false}),signal:AbortSignal.timeout(Math.min(10000,remaining))});}catch{throw new ApiError("Execution service did not respond. Retry later.",503,"EXECUTION_UNAVAILABLE");}
  if(!response.ok)throw new ApiError("Execution service is unavailable. Retry later.",503,"EXECUTION_UNAVAILABLE");
  const r=await response.json();if(!r.status || !Number.isInteger(r.status.id) || r.status.id<3 || r.status.id===13 || r.status.id===14)throw new ApiError("Execution service could not complete this run. Retry later.",503,"EXECUTION_UNAVAILABLE");
  const output=typeof r.stdout==="string"?r.stdout.trim().replace(/\r/g,""):"";
  const passed=r.status.id===3 && output===c.expected;
  // Judge0 reports Accepted when code runs, even if our expected output differs.
  const status=r.status.id===3 ? (passed ? "Passed" : "Output did not match") : String(r.status.description || "Completed");
  results.push({passed,status,time:r.time ?? null,feedback:String(r.stderr || r.compile_output || "").slice(0,1500)});
 }
 return {score:Math.round(results.filter(r=>r.passed).length/results.length*100),passed:results.filter(r=>r.passed).length,total:results.length,results,assessmentVersion:"execution.v1"};
}
