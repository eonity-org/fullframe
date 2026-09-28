/**
 * Rate limiting. A fixed-window counter, in-memory — right
 * for the single-instance deployment FullFrame targets (one Node process,
 * one SQLite file). It protects two surfaces:
 *
 *   - jury vote/comment writes (abuse / runaway clients)
 *   - the `/j/{token}` door (token brute-forcing — constant-time lookup
 *     stops timing leaks, this stops volume)
 *
 * Counters live in a Map and reset on restart; that is acceptable for abuse
 * throttling. A multi-instance deployment would move this to Redis/SQLite —
 * one function to swap.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Occasionally evict expired buckets so the Map can't grow unbounded.
let lastSweep = 0;
function sweep(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfter: number; // seconds until the window resets
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, remaining: limit - bucket.count, retryAfter: 0 };
}

/** Best-effort client IP from proxy headers (falls back to a shared bucket). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

/** A 429 with the standard Retry-After header. */
export function tooManyRequests(
  result: RateLimitResult,
  message = 'Too many requests — slow down.',
): Response {
  return Response.json(
    { error: message },
    { status: 429, headers: { 'retry-after': String(result.retryAfter) } },
  );
}
