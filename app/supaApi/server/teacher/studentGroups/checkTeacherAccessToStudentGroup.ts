"use server";
import supabaseServiceClient from "../../supabaseServiceClient";
import { createClient } from "@/utils/supabase/server";

export async function checkTeacherAccessToStudentGroup(studentGroupId: number): Promise<boolean> {
        const supabase = await supabaseServiceClient();
        const authClient = createClient();

        // Get current user
        const { data: { user: supabaseUser }, error: authError } = await authClient.auth.getUser();
        
        if (authError || !supabaseUser) {
                console.error("User not authenticated", authError);
                return false;
        }

        // Get numeric user ID from user table
        const { data: userRow, error: userError } = await supabase
                .from("user")
                .select("id")
                .eq("supabase_id", supabaseUser.id)
                .single();
        if (userError || !userRow) {
                console.error("Could not find user row for supabase_id", supabaseUser.id, userError);
                return false;
        }
        const numericUserId = userRow.id;

        // Get all teacher records for this user
        const { data: teacherData, error: teacherError } = await supabase
                .from("teacher")
                .select("id")
                .eq("linked_user", numericUserId);

        if (teacherError) {
                console.error("Error getting teacher data", teacherError);
                return false;
        }

        if (!teacherData || teacherData.length === 0) {
                console.error("No teacher records found for user");
                return false;
        }

        // Get all teacher IDs
        const teacherIds = teacherData.map(teacher => teacher.id);

        // Check if any of the teacher records have access to this student group
        const { data: studentGroupPairData, error: studentGroupPairError } = await supabase
                .from("teacher_student_group_pair")
                .select("*")
                .in("teacher_id", teacherIds)
                .eq("group_id", studentGroupId)
                .limit(1);

        if (studentGroupPairError) {
                console.error("Error getting teacher student group pairing", studentGroupPairError);
                return false;
        }

        if (!studentGroupPairData || studentGroupPairData.length === 0) {
                console.error("Teacher does not have access to this student group", {
                        teacherIds,
                        studentGroupId
                });
                return false;
        }

        return true;
}
