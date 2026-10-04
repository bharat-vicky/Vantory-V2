import { CANONICAL_SKILL_MAP, evaluateSkillMatch } from "./skills";

export function skillPattern(skill: string, flags = "i") {
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-zA-Z0-9])${escaped}(?=$|[^a-zA-Z0-9])`, flags);
}

export function skillsInText(text: string): string[] {
  return [...new Set(Object.entries(CANONICAL_SKILL_MAP).filter(([alias]) => skillPattern(alias).test(text)).map(([, canonical]) => canonical))];
}

export function textDemonstratesSkill(text: string, skill: string) {
  const match = evaluateSkillMatch(skill, skillsInText(text));
  return skillPattern(skill).test(text) || ["EXACT", "NORMALIZED", "ALIAS"].includes(match.matchType);
}
