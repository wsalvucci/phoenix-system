"use server";
import supabaseServiceClient from "../../supabaseServiceClient";
import checkAdminTeacherAccess from "../teachers/checkAdminTeacherAccess";
import checkAdminStudentGroupAccess from "./checkAdminStudentGroupAccess";

export default async function addTeacherToStudentGroup(teacherId: number, studentGroupId: number): Promise<boolean> {
    const adminGroupAccess = await checkAdminStudentGroupAccess(studentGroupId);

    if (!adminGroupAccess) return false;

    const adminTeacherAccess = await checkAdminTeacherAccess(teacherId);

    if (!adminTeacherAccess) return false;

    const supabase = await supabaseServiceClient();

    const { error } = await supabase.from("teacher_student_group_pair").insert([{ teacher_id: teacherId, group_id: studentGroupId }]);

    if (error) {
        console.error(error);
        return false;
    }

    return true;
}