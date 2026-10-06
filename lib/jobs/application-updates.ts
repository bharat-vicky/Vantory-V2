/** Public activity dates must not advance when private hiring notes are saved. */
export function latestApplicationUpdate(app:{timelineJson:string;status:string;updatedAt:Date}):{title:string;at:string}|null {
  try {
    const events=JSON.parse(app.timelineJson);
    if(!Array.isArray(events))return null;
    const event=[...events].reverse().find(e=>e && typeof e.timestamp==='string' && Number.isFinite(Date.parse(e.timestamp)) && typeof e.status==='string');
    if(!event || (event.status==='APPLIED' && event.kind!=='EMPLOYER_UPDATE'))return null;
    return {title:event.kind==='EMPLOYER_UPDATE' ? 'Update from hiring team' : event.status.replaceAll('_',' '),at:event.timestamp};
  }catch{return app.status==='APPLIED' ? null : {title:app.status.replaceAll('_',' '),at:app.updatedAt.toISOString()};}
}
