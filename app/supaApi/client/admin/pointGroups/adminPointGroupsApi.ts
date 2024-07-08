import { PointGroup } from "@/app/dataClasses";
import { pointGroupResponseToData } from "@/app/supaApi/mappers/dataMappers";
import { getPointGroupsForSchool } from "@/app/supaApi/server/admin/pointGroups/getSchoolPointGroups";

export async function clientGetSchoolPointGroups(schoolId: number): Promise<PointGroup[] | null> {
    const groupsData = await getPointGroupsForSchool(schoolId);

    if (!groupsData) return null;

    return groupsData.map(pointGroupResponseToData);
}