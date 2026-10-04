export function executionConfiguration(env: Record<string, string | undefined> = process.env) {
  const base = env.JUDGE0_URL?.trim();
  const token = env.JUDGE0_TOKEN?.trim();
  if (!base || !token) return { available: false as const, reason: "not_configured" };
  try {
    const url = new URL(base);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error();
    const python = Number(env.JUDGE0_PYTHON_LANGUAGE_ID || 71);
    const sql = Number(env.JUDGE0_SQL_LANGUAGE_ID || 82);
    if (![python, sql].every(id => Number.isInteger(id) && id > 0)) throw new Error();
    return { available: true as const, base: base.replace(/\/$/, ""), token, languages: { arrays: python, sql } };
  } catch { return { available: false as const, reason: "invalid_configuration" }; }
}
