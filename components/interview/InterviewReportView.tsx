"use client";
import Link from "next/link";
import { FinalInterviewReport } from "@/lib/interview/types";
export function InterviewReportView({report,onRestartNewInterview}:{report:FinalInterviewReport;onRestartNewInterview:()=>void}) {
 const display=(v:number|null)=>v===null ? "Not assessed":`${v}/100`;
 return <div className="max-w-5xl mx-auto space-y-6 p-6 bg-white rounded-2xl border">
 <h1 className="text-2xl font-bold">Practice report: {report.targetJobTitle}</h1>
 <p className="text-sm text-neutral-600">{report.assessmentStatus==="HISTORICAL_UNVALIDATED" ? "This historical report used an older heuristic. Its scores are unvalidated.":"AI feedback on the answers you supplied. Scores describe this practice sample; they do not predict hiring outcomes. Written clarity is assessed; voice delivery is not."}</p>
 <p className="text-xl font-semibold">{display(report.overallScore)} · {report.readinessLevel}</p>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">{Object.entries(report.categoryBreakdown).map(([k,v])=><div key={k} className="border p-4 rounded-xl"><p>{k.replace(/Score$/,"").replace(/([A-Z])/g," $1")}</p><strong>{display(v)}</strong></div>)}</div>
 <p className="text-sm">Previous comparable practice average: {display(report.historyProgression.previousAverage)}. Change: {report.historyProgression.improvement ?? "Not available"}.</p>
 <h2 className="font-bold">Skill coverage</h2><div>{Object.entries(report.roleReadinessBreakdown).map(([s,v])=><p key={s}>{s}: {display(v)}</p>)}</div>
 <h2 className="font-bold">Observed strengths</h2><ul className="list-disc pl-5">{report.strongestAreas.map(s=><li key={s}>{s}</li>)}</ul>
 <h2 className="font-bold">Next practice</h2><ul className="list-disc pl-5">{report.areasToImprove.map(s=><li key={s}>{s}</li>)}</ul><Link className="underline" href="/preparation">Open preparation tasks</Link>
 {report.preparationPlan.map(day=><div key={day.topicId || day.day} className="border rounded-xl p-4 text-sm"><strong>{day.topic}</strong><p className="mt-1">{day.whyItMatters}</p><p className="mt-2">{day.suggestedPractice}</p>{day.practiceUrl && <Link className="underline block mt-2" href={day.practiceUrl}>Open this practice task</Link>}</div>)}
 <Link className="text-sm underline" href="/career-studio">Practise a pitch or prepare career documents</Link>
 {report.questionReviews.map(q=><details key={q.questionIndex} className="p-4 border rounded-xl"><summary>{q.questionIndex}. {q.questionText} · {q.score}/100</summary><p className="mt-4 whitespace-pre-wrap">{q.candidateAnswerText}</p><p className="mt-3">{q.evaluation.feedback}</p><p>Evidence: {q.evaluation.evidenceQuotes?.join("; ") || "No supporting quote"}</p><ul className="list-disc pl-5">{q.evaluation.improvementSuggestions.map(s=><li key={s}>{s}</li>)}</ul><p>Suggested structure: {q.evaluation.exampleAnswerStructure}</p></details>)}
 <button onClick={onRestartNewInterview} className="rounded-lg bg-neutral-950 text-white px-4 py-2">Start another practice interview</button>
 </div>;
}
