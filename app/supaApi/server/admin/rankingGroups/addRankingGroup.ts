"use server";

import supabaseServiceClient from "../../supabaseServiceClient";
import checkAdminSchoolAccess from "../schools/checkAdminSchoolAccess";

export default async function addRankingGroup(schoolId: number, name: string): Promise<boolean> {
    const adminAccess = await checkAdminSchoolAccess(schoolId);

    if (!adminAccess) return false;

    const supabase = await supabaseServiceClient();

    const { error } = await supabase.from("ranking_group").insert([{ school_id: schoolId, name: name }]);

    if (error) {
        console.error(error);
        return false;
    }

    return true;
}