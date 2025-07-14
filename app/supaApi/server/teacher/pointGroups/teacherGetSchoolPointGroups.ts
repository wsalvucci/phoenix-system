"use server";
import { LinkedPointGroups } from "@/app/supaApi/mappers/dataTypes"
import { getAllPointGroups } from "../../shared/pointGroups/getPointGroup"
import supabaseServiceClient from "../../supabaseServiceClient";
import { createClient } from "@/utils/supabase/server";

export default async function teacherGetSchoolPointGroups(): Promise<LinkedPointGroups[] | null> {
    const supabase = await supabaseServiceClient();
    const authClient = createClient();

    // Get current user
    const { data: { user: supabaseUser }, error: authError } = await authClient.auth.getUser();
    
    if (authError || !supabaseUser) {
        console.error("User not authenticated", authError);
        return null;
    }

    // Get numeric user ID from user table
    const { data: userRow, error: userError } = await supabase
        .from("user")
        .select("id")
        .eq("supabase_id", supabaseUser.id)
        .single();
    if (userError || !userRow) {
        console.error("Could not find user row for supabase_id", supabaseUser.id, userError);
        return null;
    }
    const numericUserId = userRow.id;

    // Get all teacher records for this user
    const { data: teacherData, error: teacherError } = await supabase
        .from("teacher")
        .select("id, school_id")
        .eq("linked_user", numericUserId);

    if (teacherError) {
        console.error("Error getting teacher data", teacherError);
        return null;
    }

    if (!teacherData || teacherData.length === 0) {
        console.error("No teacher records found for user");
        return null;
    }

    // Get unique school IDs from all teacher records
    const schoolIds = [...new Set(teacherData.map(teacher => teacher.school_id))];

    // Get point groups from all schools
    const allPointGroups: LinkedPointGroups[] = [];
    for (const schoolId of schoolIds) {
        const pointGroups = await getAllPointGroups(schoolId);
        if (pointGroups) {
            allPointGroups.push(...pointGroups);
        }
    }

    return allPointGroups.length > 0 ? allPointGroups : null;
}