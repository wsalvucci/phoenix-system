"use server";
import { Database } from "@/types/supabase";
import getAdminSchoolPairs from "../schools/getAdminSchoolPairs";
import supabaseServiceClient from "../../supabaseServiceClient";
import getStudentGroup from "./getStudentGroup";
import { LinkedTeacher, StudentGroupWithRelations } from "@/app/supaApi/mappers/dataTypes";

export async function recursivelyGetStudentGroups(studentGroupId: number): Promise<StudentGroupWithRelations | null> {
    const groupData = await getStudentGroup(studentGroupId);

    if (groupData === null) return null;

    const childGroups = groupData.childGroups;

    if (childGroups === null) return groupData;

    var newChildGroups: StudentGroupWithRelations[] = [];

    await Promise.all(childGroups.map(async childGroup => {
        const childGroupData = await recursivelyGetStudentGroups(childGroup.id);

        if (childGroupData === null) return;

        newChildGroups.push(childGroupData);
    }))

    groupData.childGroups = newChildGroups;

    return groupData;
}

export async function getStudentGroupsForSchool(schoolId: number): Promise<StudentGroupWithRelations[] | null> {
    const adminSchoolPairs = await getAdminSchoolPairs();

    if (adminSchoolPairs === null) return null;

    const schoolIds = adminSchoolPairs.map(pair => pair.school_id);

    if (!schoolIds.includes(schoolId)) return null;

    const supabase = await supabaseServiceClient();

    const { data: parentStudentGroups, error: parentStudentGroupsError } =
        await supabase.from("student_group").select("id").eq("school_id", schoolId).is("parent_id", null);

    if (parentStudentGroupsError) {
        console.error(parentStudentGroupsError);
        return null;
    }

    if (parentStudentGroups === null) return null;

    var studentGroups: StudentGroupWithRelations[] = [];

    await Promise.all(parentStudentGroups.map(async studentGroup => {
        const studentGroupData = await recursivelyGetStudentGroups(studentGroup.id);

        if (studentGroupData === null) return;

        studentGroups.push(studentGroupData);
    }))

    return studentGroups as StudentGroupWithRelations[] ?? null;
}