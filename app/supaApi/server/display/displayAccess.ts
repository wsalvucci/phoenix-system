// Display-device credentials (BACKEND_PLAN.md §4, DATA_DISCLOSURE.md §7.4 #18, D17).
//
// Plain server module (NOT "use server"). A display is not a Supabase session: its only capability is
// "render DISPLAY for one school", carried by a 256-bit token in an httpOnly cookie. The database
// stores SHA-256 digests only; raw tokens exist only in the Set-Cookie header and the kiosk's cookie
// jar, and are never logged. Every resolve goes through display_device_resolve, which refuses a
// revoked device or one whose pairer is no longer staff of the school (D17 condition 1).
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { getCallerAccess } from "../staffAccess";
import supabaseServiceClient from "../supabaseServiceClient";

export const DISPLAY_COOKIE = "__Host-phx_display";
export const PAIRING_COOKIE = "__Host-phx_display_pairing";
const DISPLAY_MAX_AGE_S = 400 * 24 * 60 * 60;
const PAIRING_MAX_AGE_S = 15 * 60;

export type DisplayContext = {
    kind: "display";
    deviceId: string;
    schoolId: number;
    schoolName: string;
    label: string;
    pairedByName: string | null;
};
export type StaffViewer = { kind: "staff"; userId: number; schoolIds: number[] };
export type DashboardViewer = StaffViewer | DisplayContext;

/** 32 random bytes, base64url: the raw cookie value. */
export function mintSecret(): string {
    return randomBytes(32).toString("base64url");
}

/** SHA-256 of the raw value as a Postgres bytea hex literal, for the RPC's bytea parameters. */
export function byteaDigest(raw: string): string {
    return "\\x" + createHash("sha256").update(raw).digest("hex");
}

const cookieBase = { httpOnly: true, secure: true, sameSite: "strict" as const, path: "/" };

/** Only valid inside a server action or route handler (Next forbids cookie writes during render). */
export function setDisplayCookie(token: string): void {
    cookies().set(DISPLAY_COOKIE, token, { ...cookieBase, maxAge: DISPLAY_MAX_AGE_S });
}
export function setPairingCookie(secret: string): void {
    cookies().set(PAIRING_COOKIE, secret, { ...cookieBase, maxAge: PAIRING_MAX_AGE_S });
}
export function clearPairingCookie(): void {
    cookies().set(PAIRING_COOKIE, "", { ...cookieBase, maxAge: 0 });
}
export function readPairingSecret(): string | null {
    const value = cookies().get(PAIRING_COOKIE)?.value;
    return value && value.length >= 32 ? value : null;
}

/** The display device bound to this browser, or null (no cookie, unknown, revoked, or lapsed). */
export async function getDisplayContext(): Promise<DisplayContext | null> {
    const token = cookies().get(DISPLAY_COOKIE)?.value;
    if (!token || token.length < 32) return null;

    const supabase = await supabaseServiceClient();
    const { data, error } = await supabase.rpc("display_device_resolve", { p_token_hash: byteaDigest(token) });
    if (error) {
        console.error("display_device_resolve failed", error.message);
        return null;
    }
    const row = data?.[0];
    if (!row) return null;
    return {
        kind: "display",
        deviceId: row.device_id,
        schoolId: row.school_id,
        schoolName: row.school_name,
        label: row.label,
        pairedByName: row.paired_by_name ?? null,
    };
}

/**
 * Display cookie first, else the staff session. Only app/dashboard/* may accept a DisplayContext;
 * every TEACHER/ADMIN surface keeps using getCallerAccess, which a display cannot satisfy.
 * For a display, its bound schoolId overrides any ?school= the browser sends.
 */
export async function getDashboardViewer(): Promise<DashboardViewer | null> {
    const display = await getDisplayContext();
    if (display) return display;
    const access = await getCallerAccess();
    if (access === null || access.staffSchoolIds.length === 0) return null;
    return { kind: "staff", userId: access.userId, schoolIds: access.staffSchoolIds };
}
