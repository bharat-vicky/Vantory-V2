import {requireCandidate} from "@/lib/auth/authorization";
import {FeedbackDetail} from "@/components/candidate/FeedbackDetail";
export default async function Page({params}:{params:Promise<{id:string}>}) {await requireCandidate();const {id}=await params;return <FeedbackDetail id={id}/>;}
