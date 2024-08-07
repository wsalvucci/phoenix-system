import { PointGroup } from "@/app/dataClasses";
import { pointGroupResponseToData } from "@/app/supaApi/mappers/dataMappers";
import teacherGetSchoolPointGroups from "@/app/supaApi/server/teacher/pointGroups/teacherGetSchoolPointGroups";

export default async function clientTeacherGetSchoolPointGroups(): Promise<PointGroup[] | null> {
    const pointGroups = await teacherGetSchoolPointGroups();

    if (!pointGroups) {
        return null;
    }

    return pointGroups.map(pointGroupResponseToData)
}