import { ApiError } from "@/lib/api-error";

/** Server-only JSON transport. Never manufactures a successful fallback. */
export async function generateGeminiJson<T>(options: {
  system: string; input: unknown; validate: (value: unknown) => T; model?: string;
}): Promise<{ value: T; model: string }> {
  const key = process.env.GEMINI_API_KEY;
  const model = options.model || process.env.GEMINI_MODEL || "gemini-2.5-flash";
  if (!key || !/^[\w.-]+$/.test(model)) throw new ApiError("AI assessment is unavailable. Your work is preserved; try again later.", 503, "AI_UNAVAILABLE");
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: options.system }] },
    contents: [{ role: "user", parts: [{ text: JSON.stringify(options.input) }] }],
    generationConfig: { temperature: 0, responseMimeType: "application/json", maxOutputTokens: 4096 },
  });
  if (body.length > 100_000) throw new ApiError("The AI request is too large.", 413);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body, signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) {
        if (attempt === 0 && (response.status === 429 || response.status >= 500)) continue;
        throw new Error("Provider unavailable");
      }
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.filter((part: { thought?: boolean }) => !part.thought).map((part: { text?: string }) => part.text || "").join("").trim();
      if (!text || data.candidates?.[0]?.finishReason === "MAX_TOKENS") throw new Error("Incomplete provider response");
      return { value: options.validate(JSON.parse(text)), model };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (attempt === 0 && error instanceof TypeError) continue;
      throw new ApiError("AI assessment is unavailable. Your work is preserved; try again later.", 503, "AI_UNAVAILABLE");
    }
  }
  throw new ApiError("AI assessment is unavailable.", 503, "AI_UNAVAILABLE");
}
