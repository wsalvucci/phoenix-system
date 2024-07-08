"use server";
import supabaseServiceClient from "../../supabaseServiceClient";
import getAdminSchoolPairs from "../schools/getAdminSchoolPairs";

export default async function checkAdminStudentGroupAccess(studentGroupId: number): Promise<boolean> {
    const adminSchoolPairs = await getAdminSchoolPairs();

    if (adminSchoolPairs === null) return false;

    // Check if the student group is in the school
    const supabase = await supabaseServiceClient();

    const { data: studentGroup, error: studentGroupError } = await supabase.from("student_group").select("id, school_id").eq("id", studentGroupId).single();

    if (studentGroupError) {
        console.error(studentGroupError);
        return false;
    }

    if (studentGroup === null) return false;

    return adminSchoolPairs.some(pair => pair.school_id === studentGroup.school_id);
}