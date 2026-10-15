// NOTE: deliberately NOT a "use server" module. Everything exported here is a
// plain server-side helper; making it a server-actions file would turn each
// export into an independently POST-able endpoint.
import getOwnUserData from "./getOwnUserData";
import supabaseServiceClient from "./supabaseServiceClient";

export type CallerAccess = {
    /** user.id of the authenticated caller */
    userId: number;
    /** student.id when the caller is a student account, otherwise null */
    studentId: number | null;
    /** Schools the caller is staff (admin or teacher) in. Empty for non-staff. */
    staffSchoolIds: number[];
};

/**
 * Resolves the caller from the session and derives every school they are staff in.
 * Admins: all rows in admin_school_pair. Teachers: teacher.school_id.
 * Returns null when there is no authenticated Phoenix user.
 * Never takes caller-supplied identity or school input.
 */
export async function getCallerAccess(): Promise<CallerAccess | null> {
    const user = await getOwnUserData();
    if (user === null) return null;

    const supabase = await supabaseServiceClient();
    const schoolIds = new Set<number>();

    if (user.admin_id !== null && user.admin_id !== undefined) {
        const { data: adminSchools, error } = await supabase
            .from("admin_school_pair")
            .select("school_id")
            .eq("admin_id", user.admin_id);
        if (error) {
            console.error(error);
            return null;
        }
        (adminSchools ?? []).forEach((pair) => schoolIds.add(pair.school_id));
    }

    // Same teacher lookup as getOwnTeacherData (teacher.linked_user = user.id).
    const { data: teachers, error: teacherError } = await supabase
        .from("teacher")
        .select("school_id")
        .eq("linked_user", user.id);
    if (teacherError) {
        console.error(teacherError);
        return null;
    }
    (teachers ?? []).forEach((teacher) => schoolIds.add(teacher.school_id));

    return {
        userId: user.id,
        studentId: user.student_id ?? null,
        staffSchoolIds: Array.from(schoolIds),
    };
}

/** True only if the session caller is an admin or teacher of this exact school. Fails closed. */
export async function isStaffOfSchool(schoolId: number): Promise<boolean> {
    if (!Number.isInteger(schoolId)) return false;
    const access = await getCallerAccess();
    if (access === null) return false;
    return access.staffSchoolIds.includes(schoolId);
}

/** True if the session caller is an admin or teacher of at least one school. */
export async function isStaff(): Promise<boolean> {
    const access = await getCallerAccess();
    return access !== null && access.staffSchoolIds.length > 0;
}
