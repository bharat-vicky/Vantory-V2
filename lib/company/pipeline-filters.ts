export interface PipelineFilters {search:string;jobId:string;status:string;from:string;to:string;sort:"NEWEST"|"OLDEST"|"UPDATED"|"NAME"}
function localDate(instant:string) {const d=new Date(instant);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
export function filterPipeline<T extends {id:string;candidateName:string;candidateEmail:string;jobTitle:string;jobId:string;status:string;appliedAt:string;updatedAt:string}>(items:T[],filters:PipelineFilters):T[] {
  const q=filters.search.trim().toLowerCase();
  return items.filter(a=> (filters.jobId==="ALL" || a.jobId===filters.jobId) && (filters.status==="ALL" || a.status===filters.status) && (!q || [a.candidateName,a.candidateEmail,a.jobTitle].some(t=>t.toLowerCase().includes(q))) && (!filters.from || localDate(a.appliedAt)>=filters.from) && (!filters.to || localDate(a.appliedAt)<=filters.to)).sort((a,b)=>{
    const order=filters.sort==="NAME" ? a.candidateName.localeCompare(b.candidateName) : filters.sort==="OLDEST" ? Date.parse(a.appliedAt)-Date.parse(b.appliedAt) : filters.sort==="UPDATED" ? Date.parse(b.updatedAt)-Date.parse(a.updatedAt) : Date.parse(b.appliedAt)-Date.parse(a.appliedAt);
    return order || a.id.localeCompare(b.id);
  });
}
