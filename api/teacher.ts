"use server";
import supabaseServiceClient from "@/app/supaApi/server/supabaseServiceClient";
import { Teacher } from "@/types/domain";
import { getPhoenixUser } from "./user";

export async function getOwnTeacherData() : Promise<Teacher | null> {
    const phoenixUser = await getPhoenixUser();

    if (phoenixUser === null) {
        return null;
    }

    if (phoenixUser.teacherId === null) {
        return null;
    }

    const supabase = await supabaseServiceClient();
    const { data: teacherData, error: teacherDataError } = await supabase
        .from('teacher')
        .select('*')
        .eq('id', phoenixUser.teacherId)
        .single();

    if (teacherDataError !== null) {
        console.error("Error fetching teacher data:", teacherDataError);
        return null;
    }

    return {
        id: teacherData.id,
        schoolId: teacherData.school_id,
        linkCode: teacherData.link_code,
        firstName: teacherData.first_name,
        lastName: teacherData.last_name,
        linkedUserId: teacherData.linked_user,
    };
}