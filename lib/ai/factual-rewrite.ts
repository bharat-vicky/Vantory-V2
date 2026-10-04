import { skillsInText } from "@/lib/ats/taxonomy/text-skills";

const grammaticalWords = new Set("a an the and or to for of in on with by from as at through using use used build built develop developed developing create created creating implement implemented implementing deliver delivered delivering design designed designing responsible responsibility work worked working support supported supporting contribute contributed contributing led lead leading helped help assisted assist collaborated collaborate collaborated collaboration improve improved improving improvement reduce reduced reducing reduction increase increased increasing increase achieve achieved achieving achievement concise professional experience skills project projects solution solutions application applications system systems candidate summary successfully effective effectively efficient efficiently".split(" "));

/** Conservative fact guard: new quantities, technologies, and substantive vocabulary require candidate evidence. */
export function preservesResumeFacts(original: string, rewritten: string) {
  const claimFamilies = [/\b(?:led|lead|leading|managed|management)\b/i,/\bimprov\w*\b/i,/\breduc\w*\b/i,/\bincreas\w*\b/i,/\bachiev\w*\b/i,/\bsuccess\w*\b/i,/\beffectiv\w*\b/i,/\befficien\w*\b/i];
  if(claimFamilies.some(claim=>claim.test(rewritten) && !claim.test(original)))return false;
  const quantities = rewritten.match(/\d+(?:[.,]\d+)?(?:\s*[+%])?/g) || [];
  if (quantities.some(quantity => !original.replace(/\s/g, "").includes(quantity.replace(/\s/g, "")))) return false;
  const originalSkills = new Set(skillsInText(original));
  if (skillsInText(rewritten).some(skill => !originalSkills.has(skill))) return false;
  const words = new Set((original.toLowerCase().match(/[a-z][a-z'-]*/g) || []).map(word => word.replace(/s$/, "")));
  return (rewritten.toLowerCase().match(/[a-z][a-z'-]*/g) || []).every(word => grammaticalWords.has(word) || words.has(word.replace(/s$/, "")));
}
