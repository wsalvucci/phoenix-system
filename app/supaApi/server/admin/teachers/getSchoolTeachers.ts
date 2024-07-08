"use server";
import { LinkedTeacher } from "@/app/supaApi/mappers/dataTypes";
import checkAdminSchoolAccess from "../schools/checkAdminSchoolAccess";
import supabaseServiceClient from "../../supabaseServiceClient";

export default async function getSchoolTeachers(schoolId: number): Promise<LinkedTeacher[] | null> {
    const adminAccess = await checkAdminSchoolAccess(schoolId);

    if (!adminAccess) return null;

    const supabase = await supabaseServiceClient();

    const { data: teacherData, error: teacherDataError } = await supabase.from("teacher").select("*, linkedUser: user (*)").eq("school_id", schoolId);

    if (teacherDataError) {
        console.error(teacherDataError);
        return null;
    }

    if (teacherData === null) return null;

    return teacherData as LinkedTeacher[] | null;
}