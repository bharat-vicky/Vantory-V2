export interface ApplicantEvaluation {
  strengths:string;
  concerns:string;
  nextStep:string;
  recommendation:"UNDECIDED"|"PROCEED"|"HOLD"|"DO_NOT_PROCEED";
  interviewOutcome:"NOT_RECORDED"|"COMPLETED"|"NO_SHOW"|"CANCELLED";
}
export const emptyEvaluation:ApplicantEvaluation={strengths:"",concerns:"",nextStep:"",recommendation:"UNDECIDED",interviewOutcome:"NOT_RECORDED"};
