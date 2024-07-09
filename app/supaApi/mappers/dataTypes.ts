import { Database } from "@/types/supabase"

export type StudentGroupWithRelations = Database['public']['Tables']['student_group']['Row'] & {
    students: Database['public']['Tables']['student']['Row'][] | null,
    childGroups: StudentGroupWithRelations[] | null,
    teachers: LinkedTeacher[] | null
}

export type LinkedTeacher = Database['public']['Tables']['teacher']['Row'] & {
    linkedUser: Database['public']['Tables']['user']['Row'] | null
}

export type LinkedStudent = Database['public']['Tables']['student']['Row'] & {
    linkedUser: Database['public']['Tables']['user']['Row'] | null
}

export type LinkedRankingGroups = Database['public']['Tables']['ranking_group']['Row'] & {
    linkedGroups: Database['public']['Tables']['student_group']['Row'][] | null
}

export type LinkedPointGroups = Database['public']['Tables']['point_group']['Row'] & {
    childGroups: LinkedPointGroups[] | null
}

export type LinkedPointTemplate = Database['public']['Tables']['point_template']['Row'] & {
    linkedConversionRule: LinkedConversionRule,
    linkedTemplateType: Database['public']['Tables']['point_template_type']['Row'],
    linkedPointGroup: LinkedPointGroups,
    linkedStudentGroup: Database['public']['Tables']['student_group']['Row']
}

export type LinkedConversionRule = Database['public']['Tables']['point_conversion_rule']['Row'] & {
    linkedConversionRuleType: Database['public']['Tables']['point_conversion_rule_type']['Row']
}