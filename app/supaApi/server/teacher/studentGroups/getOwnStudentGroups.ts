"use server";
import { StudentGroupWithRelations } from "@/app/supaApi/mappers/dataTypes";
import supabaseServiceClient from "../../supabaseServiceClient";
import { createClient } from "@/utils/supabase/server";
import getStudentGroup from "./getStudentGroup";

export default async function getOwnStudentGroups(): Promise<StudentGroupWithRelations[] | null> {
    const supabase = await supabaseServiceClient();
    const authClient = createClient();

    // Get current user
    const { data: { user: supabaseUser }, error: authError } = await authClient.auth.getUser();
    
    if (authError || !supabaseUser) {
        console.error("User not authenticated", authError);
        return [];
    }

    // Get numeric user ID from user table
    const { data: userRow, error: userError } = await supabase
        .from("user")
        .select("id")
        .eq("supabase_id", supabaseUser.id)
        .single();
    if (userError || !userRow) {
        console.error("Could not find user row for supabase_id", supabaseUser.id, userError);
        return [];
    }
    const numericUserId = userRow.id;

    // Get all teacher records for this user
    const { data: teacherData, error: teacherError } = await supabase
        .from("teacher")
        .select("id")
        .eq("linked_user", numericUserId);

    if (teacherError) {
        console.error("Error getting teacher data", teacherError);
        return [];
    }

    if (!teacherData || teacherData.length === 0) {
        console.error("No teacher records found for user");
        return [];
    }

    // Get all teacher IDs
    const teacherIds = teacherData.map(teacher => teacher.id);

    // Get student groups for all teacher records
    const { data: studentGroupsData, error: studentGroupsError } = await supabase
        .from("teacher_student_group_pair")
        .select("*, student_group: student_group(*)")
        .in("teacher_id", teacherIds);

    if (studentGroupsError) {
        console.error("Error getting student groups", studentGroupsError);
        return [];
    }

    if (!studentGroupsData || studentGroupsData.length === 0) return [];

    // Deduplicate student groups by ID to avoid showing the same group multiple times
    const uniqueGroupIds = [...new Set(studentGroupsData
        .filter(data => data.student_group !== null)
        .map(data => data.student_group!.id))];

    const fullGroupData: StudentGroupWithRelations[] = [];
    await Promise.all(uniqueGroupIds.map(async (groupId) => {
        const groupData = await getStudentGroup(groupId);
        if (groupData) {
            fullGroupData.push(groupData);
        }
    }));

    return fullGroupData;
}