import { Database } from "@/types/supabase";

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