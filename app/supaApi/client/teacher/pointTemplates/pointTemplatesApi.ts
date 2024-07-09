import { PointTemplate } from "@/app/dataClasses";
import { pointTemplateResponseToData } from "@/app/supaApi/mappers/dataMappers";
import getPointTemplatesForStudentGroup from "@/app/supaApi/server/teacher/pointTemplates/getPointTemplatesForStudentGroup";

export async function clientGetPointTemplatesForStudentGroup(studentGroupId: number): Promise<PointTemplate[]> {
    const templateData = await getPointTemplatesForStudentGroup(studentGroupId);

    if (!templateData) return [];

    return templateData.map(pointTemplateResponseToData);
}