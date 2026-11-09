import { Teacher } from "@/app/dataClasses";
import { teacherResponseToData, teacherToResponseData } from "@/app/supaApi/mappers/dataMappers";
import getSchoolTeachers from "@/app/supaApi/server/admin/teachers/getSchoolTeachers";
import updateTeacher, { TeacherPatch } from "@/app/supaApi/server/admin/teachers/updateTeacher";
import unlinkTeacher from "@/app/supaApi/server/admin/teachers/unlinkTeacher";
import { rotateLinkCode } from "@/app/supaApi/server/admin/parentLinks";

export async function clientGetSchoolTeachers(schoolId: number): Promise<Teacher[] | null> {
    const teachers = await getSchoolTeachers(schoolId);

    if (!teachers) return null;

    return teachers.map(teacherResponseToData);
}

export async function clientUpdateTeacher(teacherId: number, patch: TeacherPatch): Promise<boolean> {
    return updateTeacher(teacherId, patch);
}

export async function clientRevokeTeacher(teacherId: number): Promise<boolean> {
    const unlink = await unlinkTeacher(teacherId);
    // A fresh 50-bit code from admin_rotate_link_code (admin of the teacher's school, re-checked in SQL).
    // The old md5(Date.now()) generator was ~28 bits, predictable, and fails 20261014230700's CHECK.
    const changeCode = await rotateLinkCode("teacher", teacherId);

    return unlink && changeCode !== null;
}