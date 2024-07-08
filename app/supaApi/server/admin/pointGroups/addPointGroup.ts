"use server";

import supabaseServiceClient from "../../supabaseServiceClient";
import checkAdminSchoolAccess from "../schools/checkAdminSchoolAccess";

export default async function addPointGroup(schoolId: number, name: string, parentId: number): Promise<boolean> {
    const adminAccess = checkAdminSchoolAccess(schoolId);

    if (!adminAccess) return false;

    const supabase = await supabaseServiceClient();

    const { error } = await supabase.from("point_group").insert([{ school_id: schoolId, name: name, parent_id: parentId }]);

    if (error) {
        console.error(error);
        return false;
    }

    return true;
}