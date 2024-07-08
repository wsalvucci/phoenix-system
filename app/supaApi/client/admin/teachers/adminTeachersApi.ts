import { Teacher } from "@/app/dataClasses";
import { teacherResponseToData, teacherToResponseData } from "@/app/supaApi/mappers/dataMappers";
import getSchoolTeachers from "@/app/supaApi/server/admin/teachers/getSchoolTeachers";
import updateTeacher from "@/app/supaApi/server/admin/teachers/updateTeacher";
import { createHash } from "crypto";

export async function clientGetSchoolTeachers(schoolId: number): Promise<Teacher[] | null> {
    const teachers = await getSchoolTeachers(schoolId);

    if (!teachers) return null;

    return teachers.map(teacherResponseToData);
}

export async function clientUpdateTeacher(teacherId: number, property: string, value: any): Promise<boolean> {
    return updateTeacher(teacherId, property, value);
}

const generateLinkCode = (): string => {
    const hash = createHash("md5").update(Date.now().toString()).digest("hex").slice(0, 7);
    return hash;
}

export async function clientRevokeTeacher(teacherId: number): Promise<boolean> {
    const unlink = await updateTeacher(teacherId, "linked_user", null);
    const changeCode = await updateTeacher(teacherId, "link_code", generateLinkCode());

    return unlink && changeCode;
}