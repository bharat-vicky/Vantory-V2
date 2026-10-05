import {db} from "@/lib/db";
import {ApiError,objectId} from "@/lib/api-error";
import {getOrCreateInstituteProfile} from "@/lib/institute/institute-service";
import type {Prisma} from "@prisma/client";
export async function listInstituteInvitations(adminId:string,params:URLSearchParams) {
  const {institute}=await getOrCreateInstituteProfile(adminId),now=new Date();
  const status=params.get("status") || "ALL",search=(params.get("search") || "").trim().slice(0,150);
  if (!["ALL","PENDING","EXPIRED","ACCEPTED","DECLINED","REVOKED","LEFT"].includes(status)) throw new ApiError("Choose a valid invitation status.");
  const page=Math.min(10000,Math.max(1,Number(params.get("page")) || 1));if(!Number.isInteger(page))throw new ApiError("Invalid page.");
  const where:Prisma.InstituteInvitationWhereInput={instituteId:institute.id};
  if(status !== "ALL")where.status=status === "EXPIRED" ? "PENDING" : status;
  if(status === "EXPIRED")where.expiresAt={lte:now};if(status === "PENDING")where.expiresAt={gt:now};
  if(search)where.OR=[{email:{contains:search,mode:"insensitive"}},{name:{contains:search,mode:"insensitive"}}];
  const [total,rows]=await Promise.all([db.instituteInvitation.count({where}),db.instituteInvitation.findMany({where,orderBy:{createdAt:"desc"},skip:(page-1)*25,take:25})]);
  return {total,page,pageSize:25,invitations:rows.map(row=>({id:row.id,name:row.name,email:row.email,status:row.status === "PENDING" && row.expiresAt <= now ? "EXPIRED" : row.status,expiresAt:row.expiresAt.toISOString(),updatedAt:row.updatedAt.toISOString()}))};
}
export async function changeInstituteInvitation(adminId:string,body:Record<string,unknown>) {
  if (!body || typeof body !== "object") throw new ApiError("Choose an invitation action.");
  if(!objectId(body.id) || !["renew","revoke"].includes(String(body.action)) || typeof body.expectedUpdatedAt !== "string" || !Number.isFinite(Date.parse(body.expectedUpdatedAt)))throw new ApiError("Choose an invitation action.");
  const {institute}=await getOrCreateInstituteProfile(adminId);
  const row=await db.instituteInvitation.findFirst({where:{id:body.id,instituteId:institute.id}});
  if(!row)throw new ApiError("Invitation unavailable.",404);
  if(row.status === "ACCEPTED")throw new ApiError("Accepted memberships cannot be changed through invitation controls.",409);
  if(body.action === "revoke" && row.status !== "PENDING")throw new ApiError("Only pending invitations can be revoked.",409);
  const result=await db.instituteInvitation.updateMany({where:{id:row.id,instituteId:institute.id,status:row.status,updatedAt:new Date(body.expectedUpdatedAt)},data:body.action === "renew" ? {status:"PENDING",expiresAt:new Date(Date.now()+30*86400000)} : {status:"REVOKED"}});
  if(result.count !== 1)throw new ApiError("Invitation changed. Refresh before updating it.",409);
}
