"use server";
import { LinkedTeacher } from "@/app/supaApi/mappers/dataTypes";
import supabaseServiceClient from "../../supabaseServiceClient";
import checkAdminTeacherAccess from "./checkAdminTeacherAccess";

export default async function getSchoolTeacher(teacherId: number): Promise<LinkedTeacher | null> {
    const adminAccess = await checkAdminTeacherAccess(teacherId);

    if (!adminAccess) return null;

    const supabase = await supabaseServiceClient();

    const { data: teacherData, error: teacherDataError } = await supabase.from("teacher").select("*, linkedUser: user (*)").eq("id", teacherId).single();

    if (teacherDataError) {
        console.error(teacherDataError);
        return null;
    }

    if (teacherData === null) return null;

    return teacherData as LinkedTeacher | null;
}