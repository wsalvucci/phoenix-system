// Rate-limit client key: HMAC-SHA256(LINK_RATE_LIMIT_SECRET, client IP), hex.
//
// Plain server module (NOT "use server"). The raw IP never reaches the database or a log line; only
// this keyed digest does, so the link_attempt table cannot be joined back to an address without the
// secret. The secret is server-only (no NEXT_PUBLIC_ prefix) and has no default: when it is missing
// or too short every caller of this module must fail closed (refuse the attempt), never fall back to
// an unkeyed or per-user-only bucket.
import { createHmac } from "crypto";
import { headers } from "next/headers";

/** A 32-byte secret, hex or base64, is at least 32 characters. Shorter values are treated as missing. */
const MIN_SECRET_LENGTH = 32;

/** Requests with no forwarded address share one bucket (fails closed rather than unlimited). */
const UNKNOWN_CLIENT = "unknown";

export function readRateLimitSecret(): string | null {
    const secret = process.env.LINK_RATE_LIMIT_SECRET;
    if (typeof secret !== "string" || secret.length < MIN_SECRET_LENGTH) return null;
    return secret;
}

/** Pure: exported for tests. 64 hex characters, inside link_attempt.client_key's 16..128 check. */
export function computeClientKey(secret: string, clientIp: string): string {
    return createHmac("sha256", secret).update(clientIp).digest("hex");
}

/** First hop of x-forwarded-for (set by Vercel's edge), else x-real-ip, else a shared "unknown". */
export function clientIpFrom(forwardedFor: string | null, realIp: string | null): string {
    const first = forwardedFor?.split(",")[0]?.trim();
    if (first) return first;
    const real = realIp?.trim();
    if (real) return real;
    return UNKNOWN_CLIENT;
}

/** The current request's client key, or null when LINK_RATE_LIMIT_SECRET is not configured. */
export function getClientKey(): string | null {
    const secret = readRateLimitSecret();
    if (secret === null) {
        console.error("LINK_RATE_LIMIT_SECRET is missing or shorter than 32 characters; refusing rate-limited actions");
        return null;
    }
    const h = headers();
    return computeClientKey(secret, clientIpFrom(h.get("x-forwarded-for"), h.get("x-real-ip")));
}
