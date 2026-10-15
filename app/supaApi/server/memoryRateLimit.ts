// Best-effort fixed-window limiter held in server memory (one bucket per server instance).
// Used only where no database bucket exists: display pairing start/approve (BACKEND_PLAN.md §4).
// It is a speed bump, not the security boundary: pairing codes are 40-bit, expire in 10 minutes,
// and approval needs a staff session. Plain module, NOT "use server".

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

/** Counts one hit against `key`; true when the caller is now over `limit` per `windowMs`. */
export function overLimit(key: string, limit: number, windowMs: number, now: number = Date.now()): boolean {
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
        if (buckets.size >= MAX_KEYS) {
            buckets.forEach((b, k) => { if (b.resetAt <= now) buckets.delete(k); });
            // Still full of live buckets: fail closed rather than grow without bound.
            if (buckets.size >= MAX_KEYS) return true;
        }
        bucket = { count: 0, resetAt: now + windowMs };
        buckets.set(key, bucket);
    }
    bucket.count += 1;
    return bucket.count > limit;
}
