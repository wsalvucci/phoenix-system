"use server";
import { LinkedPointTemplate } from "@/app/supaApi/mappers/dataTypes";
import { checkTeacherAccessToStudentGroup } from "../studentGroups/checkTeacherAccessToStudentGroup";
import supabaseServiceClient from "../../supabaseServiceClient";

export default async function getPointTemplatesForStudentGroup(studentGroupId: number): Promise<LinkedPointTemplate[]> {
    const teacherAccess = await checkTeacherAccessToStudentGroup(studentGroupId);

    if (!teacherAccess) return [];

    const supabase = await supabaseServiceClient();

    const { data: pointTemplatesData, error: pointTemplatesError } =
        await supabase
            .from("point_template")
            .select("*, linkedConversionRule: point_conversion_rule (*, linkedConversionRuleType: point_conversion_rule_type (*)), linkedTemplateType: point_template_type (*), linkedPointGroup: point_group (*), linkedStudentGroup: student_group (*)")
            .eq("student_group_id", studentGroupId);

    if (pointTemplatesError) {
        console.error(pointTemplatesError);
        return [];
    }

    if (!pointTemplatesData) return [];

    return pointTemplatesData as LinkedPointTemplate[];
}