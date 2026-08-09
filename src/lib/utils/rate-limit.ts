import "server-only";

/**
 * In-memory sliding-window rate limiter, keyed per user per named bucket.
 * Good enough for a single-instance MVP deployment. If this app ever runs
 * on multiple server instances, swap this for a shared store (e.g. Redis)
 * behind the same `checkRateLimit` signature.
 */

const buckets = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const windowStart = now - windowMs;
  const timestamps = (buckets.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= limit) {
    const retryAfterMs = timestamps[0] + windowMs - now;
    buckets.set(key, timestamps);
    return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return { allowed: true, retryAfterMs: 0 };
}
