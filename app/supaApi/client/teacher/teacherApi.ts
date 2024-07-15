import getOwnStudentGroups from "../../server/teacher/studentGroups/getOwnStudentGroups";
import { ScorebookData, StudentGroup } from "@/app/dataClasses";
import { pointEventResponseToData, studentGroupWithRelationsResponseToData } from "../../mappers/dataMappers";
import getStudentGroup from "../../server/teacher/studentGroups/getStudentGroup";
import { createPointEvent } from "../../server/teacher/teacherServerActions";

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

export async function clientCreatePointEvent(studentGroupId: number, pointTemplateId: number, date: string): Promise<boolean> {
    console.log("Creating point event", studentGroupId, pointTemplateId, date);
    return createPointEvent(studentGroupId, pointTemplateId, date);
}

export async function clientGetGroupScorebookData(studentGroupId: number): Promise<ScorebookData> {

}