import getOwnStudentGroups from "../../server/teacher/studentGroups/getOwnStudentGroups";
import { StudentGroup } from "@/app/dataClasses";
import { studentGroupWithRelationsResponseToData } from "../../mappers/dataMappers";
import getStudentGroup from "../../server/teacher/studentGroups/getStudentGroup";

export async function clientGetOwnStudentGroups(): Promise<StudentGroup[]> {
    const groups = await getOwnStudentGroups();

    if (!groups) return [];

    return groups.map(studentGroupWithRelationsResponseToData);
}

export async function clientGetStudentGroup(studentGroupId: number): Promise<StudentGroup | null> {
    const group = await getStudentGroup(studentGroupId);

    if (!group) return null;

    return studentGroupWithRelationsResponseToData(group);
}