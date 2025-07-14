"use server";
import { StudentGroupWithRelations } from "@/app/supaApi/mappers/dataTypes";
import supabaseServiceClient from "../../supabaseServiceClient";
import getOwnTeacherData from "../getOwnTeacherData";
import getStudentGroup from "./getStudentGroup";

export default async function getOwnStudentGroups(): Promise<StudentGroupWithRelations[] | null> {
    const teacherData = await getOwnTeacherData();

    if (!teacherData) return [];

    const supabase = await supabaseServiceClient();

    const { data: studentGroupsData, error: studentGroupsError } = await supabase.from("teacher_student_group_pair").select("*, student_group: student_group(*)").eq("teacher_id", teacherData.id);

    if (studentGroupsError) {
        console.error(studentGroupsError);
        return [];
    }

    if (studentGroupsData === null) return [];

    console.log(studentGroupsData);

    const fullGroupData: StudentGroupWithRelations[] = [];
    await Promise.all(studentGroupsData.map(async (studentGroupData) => {
        if (studentGroupData.student_group === null) return;
        fullGroupData.push(await getStudentGroup(studentGroupData.student_group?.id) as StudentGroupWithRelations);
    }));

    return fullGroupData;
}