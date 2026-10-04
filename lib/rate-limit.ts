/**
 * In-Memory Sliding Window Rate Limiter for Vantory API Routes
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up stale rate limit entries every 5 minutes
if (typeof setInterval !== "undefined") {
  const cleanupTimer = setInterval(
    () => {
      const now = Date.now();
      const expiryWindow = 15 * 60 * 1000;
      for (const [key, record] of rateLimitStore.entries()) {
        record.timestamps = record.timestamps.filter(
          (ts) => now - ts < expiryWindow,
        );
        if (record.timestamps.length === 0) {
          rateLimitStore.delete(key);
        }
      }
    },
    5 * 60 * 1000,
  );

  if (
    typeof cleanupTimer === "object" &&
    cleanupTimer !== null &&
    "unref" in cleanupTimer &&
    typeof cleanupTimer.unref === "function"
  ) {
    cleanupTimer.unref();
  }
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfterSeconds?: number;
}

/**
 * Check rate limit for a given identifier (e.g., userId or IP)
 * Default: 10 requests per 15 minutes window
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 15 * 60 * 1000,
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitStore.get(identifier) || { timestamps: [] };

  // Filter timestamps within current window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0];
    const resetTime = oldestTimestamp + windowMs;
    const retryAfterSeconds = Math.ceil((resetTime - now) / 1000);

    return {
      allowed: false,
      limit,
      remaining: 0,
      resetTime,
      retryAfterSeconds,
    };
  }

  // Record current request
  record.timestamps.push(now);
  rateLimitStore.set(identifier, record);

  return {
    allowed: true,
    limit,
    remaining: limit - record.timestamps.length,
    resetTime: now + windowMs,
  };
}
