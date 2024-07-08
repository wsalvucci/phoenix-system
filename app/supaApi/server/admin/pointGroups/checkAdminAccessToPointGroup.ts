"use server";

import supabaseServiceClient from "../../supabaseServiceClient";
import getAdminSchoolPairs from "../schools/getAdminSchoolPairs";

export default async function checkAdminAccessToPointGroup(pointGroupId: number): Promise<boolean> {
    const adminPairs = await getAdminSchoolPairs();

    if (adminPairs === null) return false;

    const supabase = await supabaseServiceClient();

    const { data: pointGroup, error: pointGroupError } = await supabase.from("point_group").select("id, school_id").eq("id", pointGroupId).single();

    if (pointGroupError) {
        console.error(pointGroupError);
        return false;
    }

    if (pointGroup === null) return false;

    return adminPairs.some(pair => pair.school_id === pointGroup.school_id);
}