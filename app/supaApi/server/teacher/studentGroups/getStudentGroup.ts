"use server";
import { StudentGroupWithRelations } from "@/app/supaApi/mappers/dataTypes";
import supabaseServiceClient from "../../supabaseServiceClient";
import { checkTeacherAccessToStudentGroup } from "./checkTeacherAccessToStudentGroup";

export default async function getStudentGroup(studentGroupId: number): Promise<StudentGroupWithRelations | null> {
    const teacherAccess = await checkTeacherAccessToStudentGroup(studentGroupId);

    if (!teacherAccess) return null;

    const supabase = await supabaseServiceClient();

    const { data: studentGroupData, error: studentGroupError } =
        await supabase
            .from("student_group")
            .select("*, students: student (*), childGroups: student_group (*), teachers: teacher (*, linkedUser: user(*))")
            .eq("id", studentGroupId)
            .single();

    if (studentGroupError) {
        console.error(studentGroupError);
        return null;
    }

    if (studentGroupData === null) return null;

    return studentGroupData as StudentGroupWithRelations ?? null;
}