import { randomUUID } from "node:crypto";
import { ApiError } from "@/lib/api-error";

export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
const MESSAGE = "AI assessment is unavailable. Your work is preserved; try again later.";

// Metadata only: never credentials, candidate content, or raw provider errors.
function diagnose(requestId: string, model: string, category: string, attempt: number, started: number, status?: number) {
  console.warn("AI_REQUEST_FAILED", { requestId, model, category, attempt, status, durationMs: Date.now() - started });
}

/** Server-only JSON transport. Never manufactures a successful fallback. */
export async function generateGeminiJson<T>(options: {
  system: string; input: unknown; validate: (value: unknown) => T; model?: string; schema?: Record<string, unknown>;
}): Promise<{ value: T; model: string }> {
  const requestId = randomUUID();
  const started = Date.now();
  const key = process.env.GEMINI_API_KEY?.trim();
  let model = options.model?.trim() || process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  if (!key || !/^[\w.-]+$/.test(model)) {
    diagnose(requestId, /^[\w.-]+$/.test(model) ? model : "invalid", "configuration", 0, started);
    throw new ApiError(MESSAGE, 503, "AI_UNAVAILABLE");
  }
  const contents = {
    systemInstruction: { parts: [{ text: options.system }] },
    contents: [{ role: "user", parts: [{ text: JSON.stringify(options.input) }] }],
  };
  if (JSON.stringify(contents).length > 100_000) throw new ApiError("The AI request is too large.", 413);
  for (let attempt = 0; attempt < 2; attempt++) {
    const body = JSON.stringify({ ...contents, generationConfig: {
      temperature: model.startsWith("gemini-3") ? 1 : 0,
      responseMimeType: "application/json", maxOutputTokens: 8192,
      ...(options.schema ? { responseSchema: options.schema } : {}),
      ...(model.startsWith("gemini-2.5-flash") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    } });
    let category = "network";
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body, signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) {
        diagnose(requestId, model, "provider_http", attempt + 1, started, response.status);
        // Recover unavailable legacy models only; quota/auth failures do not
        // trigger a switch. Returned metadata identifies the actual model.
        if (attempt === 0 && response.status === 404 && /^gemini-2\.5-(flash|flash-lite|pro)$/.test(model)) {
          model = DEFAULT_GEMINI_MODEL;
          continue;
        }
        if (attempt === 0 && (response.status === 429 || response.status >= 500)) {
          const retryAfter = Number(response.headers.get("retry-after"));
          await new Promise(resolve => setTimeout(resolve, Math.min(1500, Math.max(500, retryAfter * 1000 || 500))));
          continue;
        }
        throw new ApiError(MESSAGE, 503, "AI_UNAVAILABLE");
      }
      category = "response_json";
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.filter((part: { thought?: boolean }) => !part.thought).map((part: { text?: string }) => part.text || "").join("").trim();
      category = "incomplete_response";
      const finishReason = data.candidates?.[0]?.finishReason;
      if (!text || (finishReason && finishReason !== "STOP")) throw new Error();
      category = "output_json";
      const parsed: unknown = JSON.parse(text);
      category = "schema_validation";
      return { value: options.validate(parsed), model };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)) category = "timeout";
      diagnose(requestId, model, category, attempt + 1, started);
      if (attempt === 0 && ["network", "timeout", "incomplete_response", "output_json", "schema_validation"].includes(category)) continue;
      throw new ApiError(MESSAGE, 503, "AI_UNAVAILABLE");
    }
  }
  throw new ApiError(MESSAGE, 503, "AI_UNAVAILABLE");
}
