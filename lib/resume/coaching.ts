import { ApiError } from "@/lib/api-error";
import type { ResumeData } from "./types";
import { assessBullet } from "./bullet-feedback";
export type BulletAnchor={section:"experience"|"projects";itemId:string;bulletIndex:number};
export function changeAnchoredBullet(data:ResumeData,anchor:BulletAnchor,before:string,after:string) {
  if(!anchor || !["experience","projects"].includes(anchor.section) || typeof anchor.itemId!=="string" || !Number.isInteger(anchor.bulletIndex) || anchor.bulletIndex<0)throw new ApiError("Invalid bullet selection.");
  if(typeof before!=="string" || typeof after!=="string" || !after.trim() || after.length>1500 || before.length>1500 || before===after.trim())throw new ApiError("Write a changed bullet of up to 1,500 characters.");
  const items=data[anchor.section];
  const item=items.find(i=>i.id===anchor.itemId);
  if(!item || items.filter(i=>i.id===anchor.itemId).length!==1 || item.bullets[anchor.bulletIndex]!==before)throw new ApiError("This bullet changed. Reload its current text before applying your revision.",409);
  const changed=items.map(i=>i.id===anchor.itemId?{...i,bullets:i.bullets.map((text,index)=>index===anchor.bulletIndex?after.trim():text)}:i);
  return {data:{...data,[anchor.section]:changed} as ResumeData,before:assessBullet(before),after:assessBullet(after.trim())};
}
