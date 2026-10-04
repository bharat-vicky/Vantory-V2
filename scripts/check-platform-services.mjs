import nextEnv from "@next/env";

// Safe deployment diagnostics. Do not print credentials or candidate content.
nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
const model = process.argv.find(arg => arg.startsWith("--model="))?.slice(8) || process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
const key = process.env.GEMINI_API_KEY?.trim();
console.log(`AI configuration: ${key ? "key present" : "key missing"}; model ${/^[\w.-]+$/.test(model) ? model : "invalid"}`);
console.log(`Coding execution: ${process.env.JUDGE0_URL && process.env.JUDGE0_TOKEN ? "configured (connectivity not checked)" : "not configured: JUDGE0_URL and JUDGE0_TOKEN required"}`);
if (process.argv.includes("--list-models") && key) {
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", { headers: { "x-goog-api-key": key }, signal: AbortSignal.timeout(15000) });
    const data = await response.json();
    console.log(`Available text generation models (HTTP ${response.status}):`, (data.models || []).filter(m => m.supportedGenerationMethods?.includes("generateContent") && /^models\/gemini-[\w.-]+$/.test(m.name)).map(m => m.name.replace("models/", "")).join(", "));
  } catch { console.log("Could not list models: network or timeout."); process.exitCode = 1; }
}
if (process.argv.includes("--probe-ai")) {
  if (!key || !/^[\w.-]+$/.test(model)) process.exitCode = 1;
  else {
    try {
      const started = Date.now();
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Return only JSON {"ok":true}. This is a synthetic connectivity check.' }] }], generationConfig: { responseMimeType: "application/json", maxOutputTokens: 256, ...(model.startsWith("gemini-2.5-flash") ? { thinkingConfig: { thinkingBudget: 0 } } : {}) } }),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.filter(p => !p.thought).map(p => p.text || "").join("");
      const status = String(data.error?.status || "").replace(/[^A-Z_]/g, "").slice(0, 60);
      console.log(`AI probe: HTTP ${response.status}; ${Date.now()-started} ms; ${response.ok ? `finish ${data.candidates?.[0]?.finishReason || "missing"}; JSON received ${Boolean(text)}` : `provider status ${status || "unknown"}`}`);
      if (!response.ok || !text) process.exitCode = 1;
    } catch {
      console.log("AI probe failed: network or timeout. No credential or raw provider response was logged.");
      process.exitCode = 1;
    }
  }
}
if (process.argv.includes("--probe-assessment")) {
  try {
    const { defaultAIProvider } = await import("../lib/interview/ai-provider.ts");
    const { buildInterviewContext } = await import("../lib/interview/context-builder.ts");
    const profile = await buildInterviewContext({targetJobTitle:"Data Analyst",jobDescription:"SQL required",interviewType:"FULL",difficulty:"Easy",durationMinutes:10,interviewerStyle:"Professional"});
    const result = await defaultAIProvider.evaluateAnswer({questionText:"Explain how LEFT JOIN handles customers without orders.",category:"Technical Fundamentals",candidateAnswerText:"LEFT JOIN retains every customer row from the left table. Matching orders appear on the right; when a customer has no order, the order columns are NULL. COUNT(order.id) counts matching orders without counting unmatched rows as orders.",profile,difficulty:"Easy",interviewerStyle:"Professional"});
    console.log(`Interview transport and rubric: PASS; model ${result.model}; version ${result.assessmentVersion}; assessed dimensions ${result.assessedDimensions?.length}`);
  } catch {
    console.log("Interview transport or rubric: FAIL. Review sanitized AI_REQUEST_FAILED metadata.");
    process.exitCode = 1;
  }
}
