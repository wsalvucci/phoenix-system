"use server";
import supabaseServiceClient from "../../supabaseServiceClient";
import { LinkedPointGroups } from "@/app/supaApi/mappers/dataTypes";

export async function recursivelyGetPointGroup(pointGroupId: number): Promise<LinkedPointGroups | null> {
    const groupData = await getPointGroup(pointGroupId);

    if (groupData === null) return null;

    const childGroups = groupData.childGroups;

    if (childGroups === null) return groupData;

    var newChildGroups: LinkedPointGroups[] = [];

    await Promise.all(childGroups.map(async childGroup => {
        const childGroupData = await recursivelyGetPointGroup(childGroup.id);

        if (childGroupData === null) return;

        newChildGroups.push(childGroupData);
    }))

    groupData.childGroups = newChildGroups;

    return groupData;
}

async function getPointGroup(pointGroupId: number): Promise<LinkedPointGroups | null> {
    const supabase = await supabaseServiceClient();

    const { data: pointGroupData, error: pointGroupError } = await supabase
        .from('point_group')
        .select("*, childGroups: point_group (id)")
        .eq('id', pointGroupId)
        .single()

    if (pointGroupError) {
        console.error('Error fetching point group', pointGroupError)
        return null
    }

    if (pointGroupData === null) return null;

    return pointGroupData as LinkedPointGroups ?? null;
}

export async function getAllPointGroups(schoolId: number): Promise<LinkedPointGroups[] | null> {
    const supabase = await supabaseServiceClient();

    const { data: parentPointGroups, error: parentPointGroupsError } = await supabase
        .from('point_group')
        .select("*, childGroups: point_group (*)")
        .eq('school_id', schoolId)
        .is('parent_id', null)

    if (parentPointGroupsError) {
        console.error('Error fetching point groups', parentPointGroupsError)
        return null
    }

    if (parentPointGroups === null) return null;

    var pointGroups: LinkedPointGroups[] = [];

    await Promise.all(parentPointGroups.map(async pointGroup => {
        const pointGroupData = await recursivelyGetPointGroup(pointGroup.id);

        if (pointGroupData === null) return;

        pointGroups.push(pointGroupData);
    }))

    return pointGroups as LinkedPointGroups[] ?? null;
}