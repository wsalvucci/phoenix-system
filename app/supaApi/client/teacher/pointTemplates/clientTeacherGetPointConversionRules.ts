import { ConversionRule } from "@/app/dataClasses";
import { linkedPointConversionRuleResponseToData } from "@/app/supaApi/mappers/dataMappers";
import getPointConversionRules from "@/app/supaApi/server/shared/pointTemplates/getPointConversionRules";
import getOwnTeacherData from "@/app/supaApi/server/teacher/getOwnTeacherData";

export default async function clientTeacherGetSchoolPointConversionRules(): Promise<ConversionRule[] | null> {
    const teacherData = await getOwnTeacherData()

    if (!teacherData) {
        return null
    }

    const conversionRules = await getPointConversionRules(teacherData.school_id);

    if (!conversionRules) {
        return null;
    }

    return conversionRules.map(linkedPointConversionRuleResponseToData)
}