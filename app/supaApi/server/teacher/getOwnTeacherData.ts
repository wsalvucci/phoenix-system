"use server";
import getOwnUserData from "../getOwnUserData";
import supabaseServiceClient from "../supabaseServiceClient";
import { LinkedTeacher } from "../../mappers/dataTypes";

export default async function getOwnTeacherData(): Promise<LinkedTeacher | null> {
    const userData = await getOwnUserData();
    if (!userData) return null;

    const supabase = await supabaseServiceClient();

    const { data: teacherData, error: teacherError } = await supabase.from("teacher").select("*, linkedUser: user (*)").eq("linked_user", userData.id).single();

    if (teacherError) {
        console.error(teacherError);
        return null;
    }

    if (teacherData === null) return null;

    return teacherData;
}