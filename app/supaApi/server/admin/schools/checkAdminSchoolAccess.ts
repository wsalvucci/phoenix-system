"use server";
import getAdminSchoolPairs from "./getAdminSchoolPairs";

export default async function checkAdminSchoolAccess(schoolId: number): Promise<boolean> {
    const adminPairs = await getAdminSchoolPairs();

    if (adminPairs === null) return false;

    return adminPairs.some(pair => pair.school_id === schoolId);
}