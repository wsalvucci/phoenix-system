/**
 * Returns `next` only if it is a same-origin relative path; otherwise `fallback`.
 * Blocks absolute URLs, protocol-relative URLs ("//evil.com"), backslash tricks
 * ("/\evil.com"), and control characters, all of which browsers may treat as a
 * different origin after a redirect.
 */
export function safeNextPath(next: unknown, fallback: string = "/"): string {
    if (typeof next !== "string" || next.length === 0 || next.length > 2048) return fallback;
    if (!next.startsWith("/") || next.startsWith("//")) return fallback;
    if (/[\\\u0000-\u001f\u007f]/.test(next)) return fallback;

    const base = "http://same-origin.invalid";
    try {
        const url = new URL(next, base);
        if (url.origin !== base) return fallback;
        return url.pathname + url.search + url.hash;
    } catch {
        return fallback;
    }
}
