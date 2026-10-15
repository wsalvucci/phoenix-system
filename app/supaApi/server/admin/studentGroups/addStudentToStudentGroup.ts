"use server";
import { requireSameSchoolAdmin } from "../../adminScope";
import supabaseServiceClient from "../../supabaseServiceClient";
import checkAdminStudentAccess from "../students/checkAdminStudentAccess";
import checkAdminStudentGroupAccess from "./checkAdminStudentGroupAccess";

export default async function addStudentToStudentGroup(studentId: number, studentGroupId: number): Promise<boolean> {
    const adminAccess = await checkAdminStudentGroupAccess(studentGroupId);

    if (!adminAccess) return false;

    const adminStudentAccess = await checkAdminStudentAccess(studentId);

    if (!adminStudentAccess) return false;

    // Both records must be in one school the caller administers (no cross-school pairs)
    try {
        await requireSameSchoolAdmin([["student", studentId], ["student_group", studentGroupId]]);
    } catch {
        return false;
    }

    const supabase = await supabaseServiceClient();

    const { error } = await supabase.from("student_group_pair").insert([{ student_id: studentId, student_group_id: studentGroupId }]);

    if (error) {
        console.error(error);
        return false;
    }

    return true;
}