"use server";
// Display pairing and management (BACKEND_PLAN.md §4, DATA_DISCLOSURE.md D17, §10.14).
//
// Kiosk side (no session): startDisplayPairing, pollDisplayPairing. The kiosk holds a random secret
// in an httpOnly cookie; only its SHA-256 reaches the database.
// Staff side (Supabase session, never a display cookie): approveDisplayPairing,
// convertThisBrowserToDisplay, listDisplays, revokeDisplay, reconfirmDisplay.
//
// Authorization: staff actions require getCallerAccess() to list the school (admin via
// admin_school_pair, teacher via teacher.linked_user); device actions look the school up from the
// device row, never from the browser. Each RPC re-checks the actor in SQL (is_staff_of_school /
// is_admin_of_school / pairer). Why service_role: a kiosk has no Postgres role or JWT, so RLS has no
// identity to evaluate, and the device tables have no API grants at all.
import { getClientKey } from "@/app/supaApi/server/clientKey";
import { overLimit } from "@/app/supaApi/server/memoryRateLimit";
import { getCallerAccess } from "@/app/supaApi/server/staffAccess";
import supabaseServiceClient from "@/app/supaApi/server/supabaseServiceClient";
import { createClient } from "@/utils/supabase/server";
import {
    byteaDigest,
    clearPairingCookie,
    mintSecret,
    readPairingSecret,
    setDisplayCookie,
    setPairingCookie,
} from "@/app/supaApi/server/display/displayAccess";

const HOUR = 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DisplayListItem = {
    deviceId: string;
    label: string;
    pairedAt: string;
    pairedByName: string | null;
    lastSeenAt: string | null;
    revokedAt: string | null;
    pairerActive: boolean;
};

function validLabel(label: unknown): label is string {
    return typeof label === "string" && label.trim().length >= 1 && label.trim().length <= 60;
}

async function staffOf(schoolId: number): Promise<number | null> {
    if (!Number.isInteger(schoolId)) return null;
    const access = await getCallerAccess();
    if (access === null || !access.staffSchoolIds.includes(schoolId)) return null;
    return access.userId;
}

/** Staff actor allowed to act on this device: staff of the device's own school. */
async function staffOfDevice(deviceId: string): Promise<number | null> {
    if (typeof deviceId !== "string" || !UUID.test(deviceId)) return null;
    const access = await getCallerAccess();
    if (access === null || access.staffSchoolIds.length === 0) return null;
    const supabase = await supabaseServiceClient();
    const { data, error } = await supabase.from("display_device").select("school_id").eq("id", deviceId).maybeSingle();
    if (error || !data || !access.staffSchoolIds.includes(data.school_id)) return null;
    return access.userId;
}

// ---------------------------------------------------------------------------------------------
// Kiosk
// ---------------------------------------------------------------------------------------------

/** Unauthenticated. 20 starts per client per hour (in-memory, per instance). Fails closed without
 *  LINK_RATE_LIMIT_SECRET, which keys the client bucket. */
export async function startDisplayPairing(): Promise<{ userCode: string; expiresAt: string } | { error: "rate_limited" | "unavailable" }> {
    const clientKey = getClientKey();
    if (clientKey === null) return { error: "unavailable" };
    if (overLimit(`display_start:${clientKey}`, 20, HOUR)) return { error: "rate_limited" };

    const secret = mintSecret();
    const supabase = await supabaseServiceClient();
    const { data, error } = await supabase.rpc("display_pairing_start", { p_device_secret_hash: byteaDigest(secret) });
    const row = data?.[0];
    if (error || !row) {
        console.error("display_pairing_start failed", error?.message);
        return { error: "unavailable" };
    }
    setPairingCookie(secret);
    return { userCode: row.user_code, expiresAt: row.expires_at };
}

/** Kiosk poll. On approval, mints the device token, sets the display cookie and consumes the request. */
export async function pollDisplayPairing(): Promise<{ status: "pending" | "paired" | "expired" }> {
    const secret = readPairingSecret();
    if (secret === null) return { status: "expired" };
    const secretHash = byteaDigest(secret);

    const token = mintSecret();
    const supabase = await supabaseServiceClient();
    const { data, error } = await supabase.rpc("display_pairing_claim", {
        p_device_secret_hash: secretHash,
        p_token_hash: byteaDigest(token),
    });
    if (error) {
        console.error("display_pairing_claim failed", error.message);
        return { status: "pending" };
    }
    if (data && data.length > 0) {
        setDisplayCookie(token);
        clearPairingCookie();
        return { status: "paired" };
    }

    const { data: request } = await supabase
        .from("display_pairing_request")
        .select("expires_at, claimed_at")
        .eq("device_secret_hash", secretHash)
        .maybeSingle();
    if (!request || request.claimed_at !== null || new Date(request.expires_at).getTime() <= Date.now()) {
        clearPairingCookie();
        return { status: "expired" };
    }
    return { status: "pending" };
}

// ---------------------------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------------------------

/** Staff of `schoolId` approves the code shown on a kiosk. 10 tries per staff account per hour. */
export async function approveDisplayPairing(userCode: string, schoolId: number, label: string): Promise<{ ok: boolean }> {
    const actor = await staffOf(schoolId);
    if (actor === null || typeof userCode !== "string" || userCode.length > 32 || !validLabel(label)) return { ok: false };
    if (overLimit(`display_approve:${actor}`, 10, HOUR)) return { ok: false };

    const supabase = await supabaseServiceClient();
    const { data, error } = await supabase.rpc("display_pairing_approve", {
        p_actor_user_id: actor,
        p_user_code: userCode,
        p_school_id: schoolId,
        p_label: label.trim(),
    });
    if (error) {
        console.error("display_pairing_approve failed", error.message);
        return { ok: false };
    }
    return { ok: data === "approved" };
}

/**
 * A staff member signed in on the kiosk turns it into a display. The staff session is signed out
 * first; if that fails, no device is created (D17 TS condition). The browser leaves with only the
 * display cookie.
 */
export async function convertThisBrowserToDisplay(schoolId: number, label: string): Promise<{ ok: boolean }> {
    const actor = await staffOf(schoolId);
    if (actor === null || !validLabel(label)) return { ok: false };

    const { error: signOutError } = await createClient().auth.signOut();
    if (signOutError) {
        console.error("convertThisBrowserToDisplay: sign-out failed", signOutError.message);
        return { ok: false };
    }

    const token = mintSecret();
    const supabase = await supabaseServiceClient();
    const { data, error } = await supabase.rpc("display_device_create", {
        p_actor_user_id: actor,
        p_school_id: schoolId,
        p_label: label.trim(),
        p_token_hash: byteaDigest(token),
    });
    if (error || !data) {
        console.error("display_device_create failed", error?.message);
        return { ok: false };
    }
    setDisplayCookie(token);
    return { ok: true };
}

/** Admins see every device of the school; other staff see the devices they paired. */
export async function listDisplays(schoolId: number): Promise<DisplayListItem[]> {
    const actor = await staffOf(schoolId);
    if (actor === null) return [];
    const supabase = await supabaseServiceClient();
    const { data, error } = await supabase.rpc("display_devices_for_school", { p_actor_user_id: actor, p_school_id: schoolId });
    if (error) {
        console.error("display_devices_for_school failed", error.message);
        return [];
    }
    return (data ?? []).map((row) => ({
        deviceId: row.device_id,
        label: row.label,
        pairedAt: row.paired_at,
        pairedByName: row.paired_by_name ?? null,
        lastSeenAt: row.last_seen_at ?? null,
        revokedAt: row.revoked_at ?? null,
        pairerActive: row.pairer_active === true,
    }));
}

/** Any admin of the device's school, or the staff member who paired it. */
export async function revokeDisplay(deviceId: string): Promise<{ ok: boolean }> {
    const actor = await staffOfDevice(deviceId);
    if (actor === null) return { ok: false };
    const supabase = await supabaseServiceClient();
    const { data, error } = await supabase.rpc("display_device_revoke", { p_actor_user_id: actor, p_device_id: deviceId });
    if (error) {
        console.error("display_device_revoke failed", error.message);
        return { ok: false };
    }
    return { ok: data === true };
}

/** Admin of the device's school only (SQL enforces admin). Makes the caller the pairer of a lapsed device. */
export async function reconfirmDisplay(deviceId: string): Promise<{ ok: boolean }> {
    const actor = await staffOfDevice(deviceId);
    if (actor === null) return { ok: false };
    const supabase = await supabaseServiceClient();
    const { data, error } = await supabase.rpc("display_device_reconfirm", { p_actor_user_id: actor, p_device_id: deviceId });
    if (error) {
        console.error("display_device_reconfirm failed", error.message);
        return { ok: false };
    }
    return { ok: data === true };
}
