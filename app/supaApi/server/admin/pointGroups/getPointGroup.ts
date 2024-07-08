"use server";

import { LinkedPointGroups } from "@/app/supaApi/mappers/dataTypes";
import checkAdminAccessToPointGroup from "./checkAdminAccessToPointGroup";
import supabaseServiceClient from "../../supabaseServiceClient";

export default async function getPointGroup(pointGroupId: number): Promise<LinkedPointGroups | null> {
    const adminAccess = await checkAdminAccessToPointGroup(pointGroupId);

    if (!adminAccess) return null;

    const supabase = await supabaseServiceClient();

    const { data: pointGroup, error: pointGroupError } =
        await supabase.from("point_group").select("*, childGroups: point_group (id)").eq("id", pointGroupId).single();

    if (pointGroupError) {
        console.error(pointGroupError);
        return null;
    }

    return pointGroup as LinkedPointGroups ?? null;
}