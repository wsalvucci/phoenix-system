"use server";
import { LinkedRankingGroups } from "@/app/supaApi/mappers/dataTypes";
import checkAdminSchoolAccess from "../schools/checkAdminSchoolAccess";
import supabaseServiceClient from "../../supabaseServiceClient";

export async function getRankingGroupsForSchool(schoolId: number): Promise<LinkedRankingGroups[] | null> {
    const adminAccess = await checkAdminSchoolAccess(schoolId);

    if (!adminAccess) return null;

    const supabase = await supabaseServiceClient();

    const { data: rankingGroups, error: rankingGroupsError } =
        await supabase.from("ranking_group").select("*, linkedGroups: student_group (*)").eq("school_id", schoolId);

    if (rankingGroupsError) {
        console.error(rankingGroupsError);
        return null;
    }

    if (rankingGroups === null) return null;

    return rankingGroups;
}