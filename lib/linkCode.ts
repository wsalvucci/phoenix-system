// Link-code helpers shared by the server wrappers and their tests. Pure, no I/O.
// The SQL side (public.normalize_link_code, 20261014230500) is the authority; this mirrors it so the
// server can reject obviously malformed input without spending a rate-limit attempt.

/** Crockford normalisation, identical to public.normalize_link_code: case-insensitive, spaces and
 *  hyphens ignored, I/L read as 1 and O as 0. Legacy hex codes contain none of I, L, O. */
export function normalizeLinkCode(code: string): string {
    return code
        .replace(/[\s-]/g, "")
        .toUpperCase()
        .replace(/[IL]/g, "1")
        .replace(/O/g, "0");
}

/** Longest input the server forwards. Real codes are 7 (legacy) or 10 characters; anything longer
 *  than this cannot match and is refused before it reaches the database. */
export const MAX_LINK_CODE_INPUT = 64;

/** The name preview works only for 50-bit codes (D12, §10.4 condition 5). Legacy 7-character codes
 *  must not be previewed, and are not sent to the preview RPC at all. */
export const PREVIEWABLE_CODE_LENGTH = 10;

/** One message per outcome. 'no_match' covers wrong code, wrong school and already linked alike
 *  (D11 / §10.4 condition 3), and no message echoes the code. */
export const LINK_NO_MATCH_MESSAGE = "That code did not match. Check the school number and code and try again.";
export const LINK_RATE_LIMITED_MESSAGE = "Too many tries. Wait an hour, then try again, or ask your school for help.";
export const LINK_UNAVAILABLE_MESSAGE = "Linking is not available right now. Try again later.";

export function linkFailureMessage(status: "no_match" | "rate_limited" | "unavailable"): string {
    if (status === "rate_limited") return LINK_RATE_LIMITED_MESSAGE;
    if (status === "unavailable") return LINK_UNAVAILABLE_MESSAGE;
    return LINK_NO_MATCH_MESSAGE;
}

export function isPreviewableLinkCode(code: string): boolean {
    const normalized = normalizeLinkCode(code);
    return normalized.length === PREVIEWABLE_CODE_LENGTH && /^[0-9A-HJKMNP-TV-Z]+$/.test(normalized);
}
