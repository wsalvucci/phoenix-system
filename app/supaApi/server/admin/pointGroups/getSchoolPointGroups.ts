"use server";

import { LinkedPointGroups } from "@/app/supaApi/mappers/dataTypes";
import checkAdminSchoolAccess from "../schools/checkAdminSchoolAccess";
import supabaseServiceClient from "../../supabaseServiceClient";
import getPointGroup from "./getPointGroup";

export async function recursivelyGetPointGroups(pointGroupId: number): Promise<LinkedPointGroups | null> {
    const groupData = await getPointGroup(pointGroupId);

    if (groupData === null) return null;

    const childGroups = groupData.childGroups;

    if (childGroups === null) return groupData;

    var newChildGroups: LinkedPointGroups[] = [];

    await Promise.all(childGroups.map(async childGroup => {
        const childGroupData = await recursivelyGetPointGroups(childGroup.id);

        if (childGroupData === null) return;

        newChildGroups.push(childGroupData);
    }))

    groupData.childGroups = newChildGroups;

    return groupData;
}

export async function getPointGroupsForSchool(schoolId: number): Promise<LinkedPointGroups[] | null> {
    const adminAccess = await checkAdminSchoolAccess(schoolId);

    if (!adminAccess) return null;

    const supabase = await supabaseServiceClient();

    const { data: parentPointGroups, error: parentPointGroupsError } =
        await supabase.from("point_group").select("*, childGroups: point_group (*)").eq("school_id", schoolId).is("parent_id", null);

    if (parentPointGroupsError) {
        console.error(parentPointGroupsError);
        return null;
    }

    if (parentPointGroups === null) return null;

    var pointGroups: LinkedPointGroups[] = [];

    await Promise.all(parentPointGroups.map(async pointGroup => {
        const pointGroupData = await recursivelyGetPointGroups(pointGroup.id);

        if (pointGroupData === null) return;

        pointGroups.push(pointGroupData);
    }))

    return pointGroups as LinkedPointGroups[] ?? null;
}