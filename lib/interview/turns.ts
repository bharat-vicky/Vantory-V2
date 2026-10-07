export const PASSED_ANSWER = "I would like to pass this question and move to the next topic.";
export function isPassedAnswer(answer:string) {return answer.trim() === PASSED_ANSWER;}
