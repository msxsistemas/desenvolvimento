/**
 * Rate limiting utilities for Edge Functions
 * Uses in-memory store with sliding window algorithm
 */

// In-memory store (resets on cold start)
const store = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs: number;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(identifier);

  // Clean up expired entries
  if (entry && entry.resetAt <= now) {
    store.delete(identifier);
  }

  const currentEntry = store.get(identifier);

  if (!currentEntry) {
    // First request in this window
    store.set(identifier, {
      count: 1,
      resetAt: now + config.windowMs,
    });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
      retryAfterMs: 0,
    };
  }

  if (currentEntry.count >= config.maxRequests) {
    // Rate limited
    return {
      allowed: false,
      remaining: 0,
      resetAt: currentEntry.resetAt,
      retryAfterMs: currentEntry.resetAt - now,
    };
  }

  // Increment counter
  currentEntry.count++;
  store.set(identifier, currentEntry);

  return {
    allowed: true,
    remaining: config.maxRequests - currentEntry.count,
    resetAt: currentEntry.resetAt,
    retryAfterMs: 0,
  };
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    ...(result.allowed ? {} : { 'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)) }),
  };
}

export function rateLimitResponse(result: RateLimitResult, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfterMs: result.retryAfterMs,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        ...getRateLimitHeaders(result),
        'Content-Type': 'application/json',
      },
    }
  );
}
