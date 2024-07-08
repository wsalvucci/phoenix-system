import { RankingGroup } from "@/app/dataClasses";
import { rankingGroupResponseToData } from "@/app/supaApi/mappers/dataMappers";
import addRankingGroup from "@/app/supaApi/server/admin/rankingGroups/addRankingGroup";
import addStudentGroupToRankingGroup from "@/app/supaApi/server/admin/rankingGroups/addStudentGroupToRankingGroup";
import { getRankingGroupsForSchool } from "@/app/supaApi/server/admin/rankingGroups/getSchoolRankingGroups";
import removeStudentGroupFromRankingGroup from "@/app/supaApi/server/admin/rankingGroups/removeStudentGroupFromRankingGroup";
import removeStudentFromStudentGroup from "@/app/supaApi/server/admin/studentGroups/removeStudentFromStudentGroup";

export async function clientGetSchoolRankingGroups(schoolId: number): Promise<RankingGroup[] | null> {
    const rankingGroups = await getRankingGroupsForSchool(schoolId);

    if (!rankingGroups) return null;

    return rankingGroups.map(rankingGroupResponseToData);
}

export async function clientAddSchoolRankingGroup(schoolId: number, name: string): Promise<boolean> {
    return await addRankingGroup(schoolId, name);
}

export async function clientAddStudentGroupToRankingGroup(rankingGroupId: number, studentGroupId: number): Promise<boolean> {
    return await addStudentGroupToRankingGroup(rankingGroupId, studentGroupId);
}

export async function clientRemoveStudentGroupFromRankingGroup(rankingGroupId: number, studentGroupId: number): Promise<boolean> {
    return await removeStudentGroupFromRankingGroup(rankingGroupId, studentGroupId);
}