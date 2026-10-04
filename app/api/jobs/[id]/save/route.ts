import { NextResponse } from "next/server";
import { requireCandidate } from "@/lib/auth/authorization";
import { setSavedJob } from "@/lib/jobs/jobs-service";
import { apiError } from "@/lib/api-error";
async function set(params:Promise<{id:string}>,saved:boolean){try{const u=await requireCandidate();return NextResponse.json({success:true,...await setSavedJob(u.id,(await params).id,saved)});}catch(e){return apiError(e);}}
export async function POST(_r:Request,{params}:{params:Promise<{id:string}>}){return set(params,true);}
export async function DELETE(_r:Request,{params}:{params:Promise<{id:string}>}){return set(params,false);}
