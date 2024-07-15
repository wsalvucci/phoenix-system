"use server";
import { LinkedConversionRule } from "@/app/supaApi/mappers/dataTypes";
import supabaseServiceClient from "../../supabaseServiceClient";

export default async function getPointConversionRules(schoolId: number): Promise<LinkedConversionRule[]> {
    const supabase = await supabaseServiceClient();

    const { data: conversionRules, error: conversionRulesError } = await supabase
        .from('point_conversion_rule')
        .select("*, linkedConversionRuleType: point_conversion_rule_type (*)")

    if (conversionRulesError) {
        console.error('Error fetching point conversion rules', conversionRulesError)
        return []
    }

    if (conversionRules === null) return []

    return conversionRules as LinkedConversionRule[]
}