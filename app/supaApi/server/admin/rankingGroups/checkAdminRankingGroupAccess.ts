"use server";
import supabaseServiceClient from "../../supabaseServiceClient";
import getAdminSchoolPairs from "../schools/getAdminSchoolPairs";

export default async function checkAdminRankingGroupAccess(rankingGroupId: number): Promise<boolean> {
    const adminPairs = await getAdminSchoolPairs();

    if (adminPairs === null) return false;

    const supabase = await supabaseServiceClient();

    const { data: rankingGroup, error: rankingGroupError } = await supabase.from("ranking_group").select("id, school_id").eq("id", rankingGroupId).single();

    if (rankingGroupError) {
        console.error(rankingGroupError);
        return false;
    }

    if (rankingGroup === null) return false;

    return adminPairs.some(pair => pair.school_id === rankingGroup.school_id);
}