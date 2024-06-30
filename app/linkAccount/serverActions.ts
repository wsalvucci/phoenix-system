"use server";
import { createClient } from "@/utils/supabase/server";

const supabase = createClient();

export async function linkTeacher(schoolId: number, linkCode: string): Promise<boolean | string> {
    // Check if the teacher exists
    const { data: teacherData, error: teacherDataError } = await supabase.from("teacher").select("*").eq("link_code", linkCode);
    if (teacherDataError) {
        console.error("Error fetching teacher", teacherDataError);
        return "Error fetching teacher"
    } else if (teacherData === null || teacherData.length === 0) {
        console.log("No teacher found for link code: " + linkCode);
        return "No teacher found for link code: " + linkCode;
    }

    const teacher = teacherData[0];

    // Check if the teacher belongs to the school
    if (teacher.school_id !== schoolId) {
        console.log("Teacher is not associated with this school");
        return "Teacher is not associated with this school"
    }

    // Check if the teacher is already linked
    const { data: linkedUser, error: linkedUserError } = await supabase.from("user").select("*").eq("teacher_id", teacher.id);
    if (linkedUserError) {
        console.error("Error fetching linked user", linkedUserError);
        return "Error fetching linked user"
    } else if (linkedUser !== null && linkedUser.length > 0) {
        console.log("Teacher is already linked");
        return "Teacher is already linked"
    }

    // Get the user's supabase id
    const { data: supabaseData, error: supabaseDataError } = await supabase.auth.getUser();
    if (supabaseDataError) {
        console.error("Error fetching supabase data", supabaseDataError);
        return "Error fetching supabase data"
    }

    if (supabaseData === null) {
        console.log("No supabase data found");
        return "No supabase data found"
    }

    const supabaseId = supabaseData.user.id;

    // Check if the user exists
    const { data: userData, error: userDataError } = await supabase.from("user").select("*").eq("supabase_id", supabaseId);
    if (userDataError) {
        console.error("Error fetching user", userDataError);
        return "Error fetching user"
    } else if (userData === null || userData.length === 0) {
        console.log("No user found for supabase id: " + supabaseId);
        return "No user found for supabase id: " + supabaseId;
    }

    const userId = userData[0].id;

    // Link the teacher
    const { error: linkError } = await supabase.from("user").update({ teacher_id: teacher.id }).eq("id", userId);
    if (linkError) {
        console.error("Error linking teacher", linkError);
        return "Error linking teacher"
    }

    return true;

}