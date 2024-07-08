"use server";
import supabaseServiceClient from "../../supabaseServiceClient";
import checkAdminStudentAccess from "../students/checkAdminStudentAccess";
import checkAdminStudentGroupAccess from "./checkAdminStudentGroupAccess";

export default async function addStudentToStudentGroup(studentId: number, studentGroupId: number): Promise<boolean> {
    const adminAccess = await checkAdminStudentGroupAccess(studentGroupId);

    if (!adminAccess) return false;

    const adminStudentAccess = await checkAdminStudentAccess(studentId);

    if (!adminStudentAccess) return false;

    const supabase = await supabaseServiceClient();

    const { error } = await supabase.from("student_group_pair").insert([{ student_id: studentId, student_group_id: studentGroupId }]);

    if (error) {
        console.error(error);
        return false;
    }

    return true;
}