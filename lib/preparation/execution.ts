import { ApiError } from "@/lib/api-error";
export const EXERCISES={arrays:{title:"First repeated value",statement:"Read a JSON array of integers from standard input. Print the first value that occurs a second time, or null if all values are unique. Examples: [2,1,2,1] -> 2; [] -> null. Submit a complete Python 3 program.",language:"python"},sql:{title:"Customer order totals",statement:"Tables: customers(id INTEGER,name TEXT), orders(id INTEGER,customer_id INTEGER,total INTEGER). Return each customer name and SUM(total), including zero for customers without orders. Sort by customer id. Submit a SQLite SELECT query only.",language:"sql"}} as const;
export function executionCases(exercise:keyof typeof EXERCISES){return exercise==="arrays" ? [{input:"[2,1,2,1]",expected:"2"},{input:"[]",expected:"null"},{input:"[-1,0,3,-1]",expected:"-1"},{input:"[1,2,3]",expected:"null"}]:[{setup:"CREATE TABLE customers(id INTEGER,name TEXT); CREATE TABLE orders(id INTEGER,customer_id INTEGER,total INTEGER); INSERT INTO customers VALUES(1,'A'),(2,'B'); INSERT INTO orders VALUES(1,1,10),(2,1,20);",expected:"A|30\nB|0"},{setup:"CREATE TABLE customers(id INTEGER,name TEXT); CREATE TABLE orders(id INTEGER,customer_id INTEGER,total INTEGER); INSERT INTO customers VALUES(1,'A');",expected:"A|0"}];}
export async function executeAssessment(exercise:keyof typeof EXERCISES,code:string){
 if(!code.trim() || code.length>20000)throw new ApiError("Provide code of up to 20,000 characters.");
 if(exercise==="sql" && (!/^\s*(SELECT|WITH)\b/i.test(code) || /\b(insert|update|delete|drop|alter|attach|pragma|create|replace|load_extension)\b/i.test(code)))throw new ApiError("Use a SELECT or WITH query without write operations.");
 const base=process.env.JUDGE0_URL,token=process.env.JUDGE0_TOKEN;
 if(!base || !token)throw new ApiError("Code execution is temporarily unavailable. Your draft is preserved.",503,"EXECUTION_UNAVAILABLE");
 const url=new URL(base);if(url.protocol!=="https:" || url.username || url.password || url.search || url.hash)throw new ApiError("Code execution is unavailable.",503);
 const language=Number(exercise==="sql" ? process.env.JUDGE0_SQL_LANGUAGE_ID || 82:process.env.JUDGE0_PYTHON_LANGUAGE_ID || 71);
 if(!Number.isInteger(language) || language<1)throw new ApiError("Code execution is unavailable.",503);
 const cases=executionCases(exercise);const results=[];
 for(const c of cases){
  let response:Response;
  try{response=await fetch(`${base.replace(/\/$/,"")}/submissions?base64_encoded=false&wait=true`,{method:"POST",redirect:"error",headers:{"Content-Type":"application/json","X-Auth-Token":token},body:JSON.stringify({language_id:language,source_code:exercise==="sql" ? `${"setup" in c?c.setup:""}\n${code}`:code,stdin:"input" in c?c.input:null,cpu_time_limit:2,wall_time_limit:5,memory_limit:128000,max_file_size:1024,max_processes_and_or_threads:1,enable_network:false}),signal:AbortSignal.timeout(12000)});}catch{throw new ApiError("Execution service did not respond. Retry later.",503,"EXECUTION_UNAVAILABLE");}
  if(!response.ok)throw new ApiError("Execution service is unavailable. Retry later.",503,"EXECUTION_UNAVAILABLE");
  const r=await response.json();if(!r.status || !Number.isInteger(r.status.id) || r.status.id<3 || r.status.id===13 || r.status.id===14)throw new ApiError("Execution service could not complete this run. Retry later.",503,"EXECUTION_UNAVAILABLE");
  const output=typeof r.stdout==="string"?r.stdout.trim().replace(/\r/g,""):"";
  results.push({passed:r.status.id===3 && output===c.expected,status:String(r.status.description || "Completed"),time:r.time ?? null,feedback:String(r.stderr || r.compile_output || "").slice(0,1500)});
 }
 return {score:Math.round(results.filter(r=>r.passed).length/results.length*100),passed:results.filter(r=>r.passed).length,total:results.length,results,assessmentVersion:"execution.v1"};
}
