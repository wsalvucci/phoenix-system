"use server";
// Legacy entry point. Delegates to the rate-limited redeem_link_code RPC (BACKEND_PLAN.md §6.3),
// which matches the code inside the school only and links with `linked_user IS NULL` in the same
// UPDATE, so two simultaneous claims cannot both win. New code calls redeemLinkCode directly.
import { linkFailureMessage } from "@/lib/linkCode";
import { redeemLinkCode } from "./link/linkCodeActions";

export default async function linkTeacher(schoolId: number, linkCode: string): Promise<{ success: boolean, message: string, linkId: number | null }> {
    const { status } = await redeemLinkCode("teacher_claim", schoolId, linkCode);
    if (status === "linked") return { success: true, message: "Teacher linked successfully", linkId: null };
    return { success: false, message: linkFailureMessage(status), linkId: null };
}
