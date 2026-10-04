export const maxDuration = 60;
import { NextResponse } from "next/server";
import { requireCandidate } from "@/lib/auth/authorization";
import { enhanceResumeText } from "@/lib/ai/gemini";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const user = await requireCandidate();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }

    // Rate Limiting: Max 10 requests per 15-minute window per user
    const rateLimit = checkRateLimit(`ai-enhance:${user.id}`, 10, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `AI Rate limit exceeded. You can make up to 10 AI resume enhancements per 15 minutes. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimit.limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimit.resetTime.toString(),
            "Retry-After": (rateLimit.retryAfterSeconds || 60).toString(),
          },
        }
      );
    }

    const body = await request.json();
    const { selectedText, sectionContext, mode, customInstruction } = body;

    if (!selectedText || typeof selectedText !== "string" || !selectedText.trim()) {
      return NextResponse.json(
        { success: false, error: "Selected text is required for AI enhancement." },
        { status: 400 }
      );
    }

    if(selectedText.length>1500 || (customInstruction && (typeof customInstruction!=="string" || customInstruction.length>500)))return NextResponse.json({success:false,error:"Select up to 1,500 characters and use a shorter instruction."},{status:400});
    const result = await enhanceResumeText({
      selectedText,
      sectionContext,
      mode,
      customInstruction,
    });

    if (!result.success) {
      const status = result.isOffTopic ? 400 : 503;
      return NextResponse.json(
        { success: false, error: result.error || "AI Enhancement failed." },
        { status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        enhancedText: result.enhancedText,
        alternativeText: result.alternativeText,
        analysis: result.analysis,
        originalText: result.originalText,
        sectionContext: result.sectionContext,
        provider:result.provider,model:result.model,
      },
      {
        headers: {
          "X-RateLimit-Limit": rateLimit.limit.toString(),
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          "X-RateLimit-Reset": rateLimit.resetTime.toString(),
        },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal AI server error.";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
