"use server";
import { StudentGroupWithRelations } from "@/app/supaApi/mappers/dataTypes";
import supabaseServiceClient from "../../supabaseServiceClient";
import checkAdminStudentGroupAccess from "./checkAdminStudentGroupAccess";

export default async function getStudentGroup(studentGroupId: number): Promise<StudentGroupWithRelations | null> {
    const adminAccess = await checkAdminStudentGroupAccess(studentGroupId);

    if (!adminAccess) return null;

    const supabase = await supabaseServiceClient();

    const { data: studentGroup, error: studentGroupError } =
        await supabase
            .from("student_group")
            .select("*, students: student (*), childGroups: student_group (*), teachers: teacher (*, linkedUser: user(*))")
            .eq("id", studentGroupId)
            .single();

    if (studentGroupError) {
        console.error(studentGroupError);
        return null;
    }

    return studentGroup as StudentGroupWithRelations ?? null;
}