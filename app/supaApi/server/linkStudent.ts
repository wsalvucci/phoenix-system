"use server";
// Legacy entry point, kept so the export does not vanish under any caller. It no longer queries
// anything itself: it delegates to the rate-limited, uniform-failure redeem_link_code RPC
// (BACKEND_PLAN.md §6.3). New code calls redeemLinkCode directly.
import { linkFailureMessage } from "@/lib/linkCode";
import { redeemLinkCode } from "./link/linkCodeActions";

export default async function linkStudent(schoolId: number, linkCode: string): Promise<{ success: boolean, message: string, linkId: number | null }> {
    const { status } = await redeemLinkCode("student_claim", schoolId, linkCode);
    if (status === "linked") return { success: true, message: "Student linked successfully", linkId: null };
    return { success: false, message: linkFailureMessage(status), linkId: null };
}
