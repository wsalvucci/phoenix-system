import { StudentGroup } from "@/app/dataClasses";
import { studentGroupWithRelationsResponseToData } from "@/app/supaApi/mappers/dataMappers";
import addStudentGroup from "@/app/supaApi/server/admin/studentGroups/addStudentGroup";
import addStudentToStudentGroup from "@/app/supaApi/server/admin/studentGroups/addStudentToStudentGroup";
import addTeacherToStudentGroup from "@/app/supaApi/server/admin/studentGroups/addTeacherToStudentGroup";
import { getStudentGroupsForSchool, recursivelyGetStudentGroups } from "@/app/supaApi/server/admin/studentGroups/getSchoolStudentGroups";
import removeStudentFromStudentGroup from "@/app/supaApi/server/admin/studentGroups/removeStudentFromStudentGroup";
import removeTeacherFromStudentGroup from "@/app/supaApi/server/admin/studentGroups/removeTeacherFromStudentGroup";

export async function clientGetStudentGroups(schoolId: number): Promise<StudentGroup[] | null> {
    const studentGroups = await getStudentGroupsForSchool(schoolId);

    if (!studentGroups) return null;

    return studentGroups.map(studentGroupWithRelationsResponseToData);
}

export async function clientGetStudentGroup(studentGroupId: number): Promise<StudentGroup | null> {
    const studentGroup = await recursivelyGetStudentGroups(studentGroupId);

    if (!studentGroup) return null;

    return studentGroupWithRelationsResponseToData(studentGroup);
}

export async function clientAddStudentToStudentGroup(studentGroupId: number, studentId: number): Promise<boolean> {
    return await addStudentToStudentGroup(studentGroupId, studentId);
}

export async function clientRemoveStudentFromStudentGroup(studentGroupId: number, studentId: number): Promise<boolean> {
    return await removeStudentFromStudentGroup(studentGroupId, studentId);
}

export async function clientAddTeacherToStudentGroup(studentGroupId: number, teacherId: number): Promise<boolean> {
    return await addTeacherToStudentGroup(studentGroupId, teacherId);
}

export async function clientRemoveTeacherFromStudentGroup(studentGroupId: number, teacherId: number): Promise<boolean> {
    return await removeTeacherFromStudentGroup(studentGroupId, teacherId);
}

export async function clientAddStudentGroup(schoolId: number, name: string, parentId: number | null): Promise<boolean> {
    return await addStudentGroup(schoolId, name, parentId);
}