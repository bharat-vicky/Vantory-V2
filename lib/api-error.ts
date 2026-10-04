import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(message: string, public status = 400, public code = "INVALID_REQUEST") {
    super(message);
  }
}

export function apiError(error: unknown, fallback = "Unable to complete this request.") {
  if (error instanceof ApiError) {
    return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Unauthorized")) return NextResponse.json({ success: false, error: "Please sign in." }, { status: 401 });
  if (message.includes("Forbidden")) return NextResponse.json({ success: false, error: "You do not have access to this feature." }, { status: 403 });
  console.error(fallback, error instanceof Error ? error.name : "Unknown error");
  return NextResponse.json({ success: false, error: fallback }, { status: 503 });
}

export function objectId(value: unknown): value is string {
  return typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
}
