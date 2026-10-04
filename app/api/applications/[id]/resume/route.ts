import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth/authorization";
import {db} from "@/lib/db";
import {ApiError,apiError,objectId} from "@/lib/api-error";
import {compileResumePdf} from "@/lib/resume/pdf-compiler";
import {parseResumeContent} from "@/lib/resume/serialization";
export async function GET(_r:Request,{params}:{params:Promise<{id:string}>}){try{
 const u=await requireUser();const {id}=await params;if(!objectId(id))throw new ApiError("Invalid application.");
 const where=u.role==="COMPANY_ADMIN"?{id,job:{companyUserId:u.id}}:["CANDIDATE","INSTITUTE_STUDENT"].includes(u.role)?{id,userId:u.id}:null;if(!where)throw new ApiError("Access denied.",403);
 const app=await db.jobApplication.findFirst({where,select:{resumeSnapshotJson:true}});if(!app)throw new ApiError("Application not found.",404);if(!app.resumeSnapshotJson)throw new ApiError("This historical application has no captured resume. Its original submission cannot be reconstructed.",409,"SNAPSHOT_UNAVAILABLE");
 const snapshot=JSON.parse(app.resumeSnapshotJson);const pdf=await compileResumePdf(parseResumeContent(snapshot.contentJson));
 return new NextResponse(new Uint8Array(pdf.buffer),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${pdf.fileName}"`,"Cache-Control":"private, no-store"}});
}catch(e){return apiError(e);}}
