"use server";
// Dead legacy path (no importer). It used to write "user".teacher_id through the cookie client with
// no rate limit. It now delegates to the rate-limited RPC so that, if anything ever imports it again,
// it cannot be used as a code oracle. Safe to delete.
import linkTeacherViaRpc from "@/app/supaApi/server/linkTeacher";

export async function linkTeacher(schoolId: number, linkCode: string): Promise<boolean | string> {
    const result = await linkTeacherViaRpc(schoolId, linkCode);
    return result.success ? true : result.message;
}
