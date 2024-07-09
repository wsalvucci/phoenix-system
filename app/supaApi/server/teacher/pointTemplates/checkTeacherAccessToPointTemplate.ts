"use server";
import supabaseServiceClient from "../../supabaseServiceClient";
import getOwnStudentGroups from "../studentGroups/getOwnStudentGroups";

export default async function checkTeacherAccessToPointTemplate(pointTemplateId: number): Promise<boolean> {
    const groups = await getOwnStudentGroups();

    if (!groups) return false;

    const supabase = await supabaseServiceClient();

    const { data: pointTemplateData, error: pointTemplateError } = await supabase.from("point_template").select("*").eq("id", pointTemplateId).single();

    if (pointTemplateError) {
        console.error(pointTemplateError);
        return false;
    }

    if (!pointTemplateData) return false;

    return groups.some(group => group.id === pointTemplateData.student_group_id);

}