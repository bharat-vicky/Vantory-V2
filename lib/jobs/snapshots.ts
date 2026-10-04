export function readApplicationSnapshot<T>(app:{jobSnapshotJson?:string|null;resumeSnapshotJson?:string|null;job:T;resume?:unknown}) {
 let job=app.job;let resume:{id:string;title:string;templateId:string;contentJson:string;updatedAt:string}|null=null;
 try{if(app.jobSnapshotJson)job=JSON.parse(app.jobSnapshotJson);}catch{}
 try{if(app.resumeSnapshotJson)resume=JSON.parse(app.resumeSnapshotJson);}catch{}
 return {job,resume,snapshotAvailable:!!resume};
}
