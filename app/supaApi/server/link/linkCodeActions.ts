"use server";
// Link-code redemption and the "Is this Maya R.?" preview (BACKEND_PLAN.md §6, DATA_DISCLOSURE.md
// §10.4, D11, D12). These are server actions because the link screen (a client component) calls them.
//
// Authorization: the caller must be signed in with a Phoenix user row; the actor is that row's id,
// resolved from the session, never from the browser. The RPCs (service_role only) re-check the actor,
// apply the shared rate-limit bucket (5 failures per user per hour, 20 per client key per hour), match
// the code within the given school only, and return one uniform 'no_match' for every failure mode.
// Why service_role and not RLS: the caller has no relationship to the student or teacher row yet, so
// no policy could let them see it; the RPC is the only thing that may look the code up.
//
// The school number is typed by the user and is only a match condition: a wrong school is 'no_match'.
// Fails closed: without LINK_RATE_LIMIT_SECRET nothing is redeemed ('unavailable').
import { getClientKey } from "../clientKey";
import { getSessionUserId } from "../sessionActor";
import supabaseServiceClient from "../supabaseServiceClient";
import { isPreviewableLinkCode, MAX_LINK_CODE_INPUT, normalizeLinkCode } from "@/lib/linkCode";

export type LinkPurpose = "student_claim" | "parent_link" | "teacher_claim";
/** 'unavailable': not signed in, the server is misconfigured, or the database call failed. */
export type LinkStatus = "linked" | "no_match" | "rate_limited" | "unavailable";
export type LinkResult = { status: LinkStatus };
export type LinkPreview =
    | { status: "match"; firstName: string; lastInitial: string }
    | { status: "no_match" | "rate_limited" | "unavailable" };

const PURPOSES: readonly LinkPurpose[] = ["student_claim", "parent_link", "teacher_claim"];

function wellFormed(schoolId: unknown, code: unknown): code is string {
    return (
        typeof schoolId === "number" && Number.isInteger(schoolId) && schoolId > 0 &&
        typeof code === "string" && code.length <= MAX_LINK_CODE_INPUT && normalizeLinkCode(code) !== ""
    );
}

/** Claim a student or teacher record, or link a parent to a student. One atomic RPC. */
export async function redeemLinkCode(purpose: LinkPurpose, schoolId: number, code: string): Promise<LinkResult> {
    if (!PURPOSES.includes(purpose)) return { status: "no_match" };
    const userId = await getSessionUserId();
    if (userId === null) return { status: "unavailable" };
    // Malformed input cannot match anything, so it is refused without spending an attempt.
    if (!wellFormed(schoolId, code)) return { status: "no_match" };
    const clientKey = getClientKey();
    if (clientKey === null) return { status: "unavailable" };

    const supabase = await supabaseServiceClient();
    const { data, error } = await supabase.rpc("redeem_link_code", {
        p_actor_user_id: userId,
        p_school_id: schoolId,
        p_code: code,
        p_purpose: purpose,
        p_client_key: clientKey,
    });
    if (error) {
        // Never log the code.
        console.error("redeem_link_code failed", error.code, error.message);
        return { status: "unavailable" };
    }
    if (data === "linked" || data === "no_match" || data === "rate_limited") return { status: data };
    return { status: "unavailable" };
}

/** First name and last initial for a 10-character student code, for the confirm step. No id is
 *  returned: the commit call re-submits school and code (§10.4 condition 2). Legacy 7-character codes
 *  are answered 'no_match' here without touching the database, so they cannot burn an attempt. */
export async function previewLinkCode(
    purpose: "student_claim" | "parent_link",
    schoolId: number,
    code: string,
): Promise<LinkPreview> {
    if (purpose !== "student_claim" && purpose !== "parent_link") return { status: "no_match" };
    const userId = await getSessionUserId();
    if (userId === null) return { status: "unavailable" };
    if (!wellFormed(schoolId, code) || !isPreviewableLinkCode(code)) return { status: "no_match" };
    const clientKey = getClientKey();
    if (clientKey === null) return { status: "unavailable" };

    const supabase = await supabaseServiceClient();
    const { data, error } = await supabase.rpc("preview_link_code", {
        p_actor_user_id: userId,
        p_school_id: schoolId,
        p_code: code,
        p_purpose: purpose,
        p_client_key: clientKey,
    });
    if (error) {
        console.error("preview_link_code failed", error.code, error.message);
        return { status: "unavailable" };
    }
    const row = data?.[0];
    if (row?.status === "match" && row.first_name && row.last_initial) {
        return { status: "match", firstName: row.first_name, lastInitial: row.last_initial };
    }
    if (row?.status === "rate_limited") return { status: "rate_limited" };
    if (row?.status === "no_match") return { status: "no_match" };
    return { status: "unavailable" };
}
