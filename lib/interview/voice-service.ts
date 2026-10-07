import { ApiError, objectId } from "@/lib/api-error";
import { checkRateLimit } from "@/lib/rate-limit";
import { ownedSession } from "./session-service";

export const INTERVIEW_VOICES = ["Kore", "Aoede", "Charon"] as const;
export function cloudVoiceEnabled() {
  return process.env.INTERVIEW_CLOUD_VOICE_ENABLED === "true" && !!process.env.GEMINI_API_KEY?.trim();
}

export async function questionAudio(userId:string, sessionId:string, questionId:unknown, voice:unknown) {
  // Never accept arbitrary text or a provider URL from the browser.
  if (!objectId(questionId) || !INTERVIEW_VOICES.includes(voice as typeof INTERVIEW_VOICES[number])) throw new ApiError("Select an interview question and voice.");
  const session = await ownedSession(userId,sessionId);
  const question = session.questions.find(q=>q.id===questionId);
  if (!question) throw new ApiError("Question not found.",404);
  if (session.status!=="ACTIVE") throw new ApiError("Resume an active interview to play audio.",409);
  if (!cloudVoiceEnabled()) throw new ApiError("Natural cloud voice is not enabled. Choose a device voice.",503,"VOICE_DISABLED");
  if (!checkRateLimit(`interview-voice:${userId}`,30,15*60*1000).allowed) throw new ApiError("Voice limit reached. Use a device voice for now.",429);
  if (question.questionText.length>2400) throw new ApiError("This question is too long for audio. Read it on screen.",413);
  const model = process.env.INTERVIEW_TTS_MODEL?.trim() || "gemini-3.8-flash-lite-tts";
  if (!/^gemini-3\.8-(flash|flash-lite)-tts$/.test(model)) throw new ApiError("Voice model configuration is unavailable.",503);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
      method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":process.env.GEMINI_API_KEY!.trim()},
      body:JSON.stringify({contents:[{role:"user",parts:[{text:question.questionText,speech_metadata:{style:"Calm, conversational job interviewer. Warm, clear, measured pace, natural pauses; no theatrical delivery."}}]}],generationConfig:{responseModalities:["AUDIO"],speechConfig:{voiceConfig:{voice}}}}),signal:AbortSignal.timeout(25000),
    });
    if (!response.ok) throw new Error("Provider unavailable");
    const data = await response.json();
    const part = data.candidates?.[0]?.content?.parts?.find((p:{inlineData?:{mimeType?:string}})=>p.inlineData?.mimeType?.startsWith("audio/wav"));
    const encoded = part?.inlineData?.data;
    if (typeof encoded!=="string" || encoded.length>5_000_000) throw new Error("Invalid audio");
    const audio = Buffer.from(encoded,"base64");
    if (audio.length<44 || audio.subarray(0,4).toString()!=="RIFF" || audio.subarray(8,12).toString()!=="WAVE") throw new Error("Invalid WAV");
    return audio;
  } catch {
    throw new ApiError("Natural voice is temporarily unavailable. Choose a device voice or continue with text.",503,"VOICE_UNAVAILABLE");
  }
}
