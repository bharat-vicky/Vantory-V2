export interface BulletCriteria {
  action: boolean;
  scope: boolean;
  method: boolean;
  verification: boolean;
  readable: boolean;
  contradictory: boolean;
}

/** Conservative writing checks, not verification of the candidate's achievements. */
export function assessBullet(text: string) {
  const clean = text.trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const criteria: BulletCriteria = {
    action: /^(built|implemented|developed|designed|architected|tested|analysed|analyzed|created|debugged|automated|documented|investigated|validated|compared|measured|maintained|configured|refactored|optimized|improved|resolved|fixed|engineered|led|contributed)\b/i.test(clean),
    scope: words.length >= 8 && /\b(api|app|application|endpoint|form|dashboard|dataset|data|report|query|queries|model|service|feature|test|tests|pipeline|component|project|system|workflow|database|customers?|orders?)\b/i.test(clean),
    method: /\b(using|with|through|by|via)\s+\S+/i.test(clean),
    verification: /\b(tested|tests|validated|verified|measured|compared|checked|assertions|test cases|unit testing|integration testing)\b/i.test(clean) || /\b(reduced|reducing|increased|increasing|improved|improving|processed|supported)\b.{0,50}\d+\s*(%|ms\b|seconds?\b|records?\b|users?\b|requests?\b)/i.test(clean),
    readable: words.length >= 6 && words.length <= 45 && !/(\b\w+\b)(?:\s+\1){3}/i.test(clean),
    contradictory: /\b(nothing useful|no working|did not (?:work|build|implement|test)|never (?:worked|tested)|unverified results?|fabricated|invented metrics?)\b/i.test(clean),
  };
  if(/\b(no|without|never)\s+(?:automated\s+|working\s+)?(?:tests|testing|validation)\b/i.test(clean))criteria.verification=false;
  const raw = (criteria.action ? 20 : 0) + (criteria.scope ? 25 : 0) + (criteria.method ? 15 : 0) + (criteria.verification ? 25 : 0) + (criteria.readable ? 15 : 0);
  const score = criteria.contradictory ? Math.min(25, raw) : raw;
  const verdict = score >= 85 ? "STRONG" as const : score >= 60 ? "BETTER" as const : "WEAK" as const;
  const issues: string[] = [];
  if (criteria.contradictory) issues.push("This wording describes an unsuccessful or unsupported result. Explain the actual limitation or what you corrected.");
  if (!criteria.action) issues.push("State your own action or contribution, rather than a list of responsibilities.");
  if (!criteria.scope) issues.push("Name what you built, analysed or changed and the problem it addressed.");
  if (!criteria.method) issues.push("Explain the approach or tool you actually used.");
  if (!criteria.verification) issues.push("Describe how you checked the work or an observed result. A numerical metric is optional.");
  if (!criteria.readable) issues.push("Use a concise sentence with enough detail to understand your contribution.");
  return { originalText: text, score, verdict, criteria, issues, suggestion: issues.join(" ") || "The wording includes a contribution, scope, approach and a described check or result. Confirm that each claim is accurate; these writing checks do not verify it." };
}

export function normalizedBulletScore(bullets: { originalText: string; score: number }[]) {
  const unique = new Map(bullets.map(b => [b.originalText.trim().replace(/\s+/g, " ").toLowerCase(), b.score]));
  return unique.size ? Math.round([...unique.values()].reduce((a, b) => a + b, 0) / unique.size) : 0;
}
