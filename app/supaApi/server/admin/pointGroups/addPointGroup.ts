"use server";

import { assertRowsInSchool, SchoolOwnedTable } from "../../adminScope";
import supabaseServiceClient from "../../supabaseServiceClient";
import checkAdminSchoolAccess from "../schools/checkAdminSchoolAccess";

async function sameSchool(table: SchoolOwnedTable, id: number, schoolId: number): Promise<boolean> {
    try {
        await assertRowsInSchool(table, [id], schoolId);
        return true;
    } catch {
        return false;
    }
}

export default async function addPointGroup(schoolId: number, name: string, parentId: number): Promise<boolean> {
    const adminAccess = await checkAdminSchoolAccess(schoolId);

    if (!adminAccess) return false;

    // The parent point group must belong to the same school
    if (parentId != null && !(await sameSchool("point_group", parentId, schoolId))) return false;

    const supabase = await supabaseServiceClient();

    const { error } = await supabase.from("point_group").insert([{ school_id: schoolId, name: name, parent_id: parentId }]);

    if (error) {
        console.error(error);
        return false;
    }

    return true;
}