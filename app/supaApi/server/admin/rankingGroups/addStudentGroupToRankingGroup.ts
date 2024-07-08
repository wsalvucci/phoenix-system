"use server";

import supabaseServiceClient from "../../supabaseServiceClient";
import checkAdminRankingGroupAccess from "./checkAdminRankingGroupAccess";

export default async function addStudentGroupToRankingGroup(studentGroupId: number, rankingGroupId: number): Promise<boolean> {
    const adminAccess = await checkAdminRankingGroupAccess(rankingGroupId);

    if (!adminAccess) return false;

    const supabase = await supabaseServiceClient();

    const { error } = await supabase.from("ranking_group_pair").insert([{ student_group_id: studentGroupId, ranking_group_id: rankingGroupId }]);

    if (error) {
        console.error(error);
        return false;
    }

    return true;
}