"use server";
import { Student } from "@/types/domain";
import { getPhoenixUser } from "./user";
import supabaseServiceClient from "@/app/supaApi/server/supabaseServiceClient";

export async function getOwnStudentData() : Promise<Student | null>  {
    const phoenixUser = await getPhoenixUser();

    if (phoenixUser === null) {
        return null;
    }

    const supabase = await supabaseServiceClient();
    const { data: studentData, error: studentError } = await supabase
        .from("student")
        .select("*")
        .eq("linkedUser", phoenixUser.id)
        .single();

    if (studentError !== null) {
        console.error("Error fetching student data:", studentError);
        return null;
    }

    return {
        id: studentData.id,
        schoolId: studentData.school_id,
        linkCode: studentData.link_code,
        firstName: studentData.first_name,
        lastName: studentData.last_name,
        birthdate: studentData.birthdate,
        grade: studentData.grade,
        gender: studentData.gender,
        linkedUserId: studentData.linkedUser,
    }
}