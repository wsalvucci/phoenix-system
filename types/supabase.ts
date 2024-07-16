export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      admin_school_pair: {
        Row: {
          admin_id: number
          created_at: string
          school_id: number
        }
        Insert: {
          admin_id: number
          created_at?: string
          school_id: number
        }
        Update: {
          admin_id?: number
          created_at?: string
          school_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "admin_school_pair_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_school_pair_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      class: {
        Row: {
          created_at: string
          id: number
          name: string
          school_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          school_id: number
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          school_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "class_schoolId_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      point_conversion_rule: {
        Row: {
          conversion_rule_type_id: number
          created_at: string
          formula: string | null
          id: number
          name: string
          target: number
          value: number | null
        }
        Insert: {
          conversion_rule_type_id: number
          created_at?: string
          formula?: string | null
          id?: number
          name: string
          target: number
          value?: number | null
        }
        Update: {
          conversion_rule_type_id?: number
          created_at?: string
          formula?: string | null
          id?: number
          name?: string
          target?: number
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "point_conversion_rule_conversion_rule_type_id_fkey"
            columns: ["conversion_rule_type_id"]
            isOneToOne: false
            referencedRelation: "point_conversion_rule_type"
            referencedColumns: ["id"]
          },
        ]
      }
      point_conversion_rule_type: {
        Row: {
          created_at: string
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      point_event: {
        Row: {
          created_at: string
          date: string | null
          id: number
          name: string | null
          student_group_id: number
          template_id: number
        }
        Insert: {
          created_at?: string
          date?: string | null
          id?: number
          name?: string | null
          student_group_id: number
          template_id: number
        }
        Update: {
          created_at?: string
          date?: string | null
          id?: number
          name?: string | null
          student_group_id?: number
          template_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "point_event_student_group_id_fkey"
            columns: ["student_group_id"]
            isOneToOne: false
            referencedRelation: "student_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_event_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "point_template"
            referencedColumns: ["id"]
          },
        ]
      }
      point_group: {
        Row: {
          color: string
          created_at: string
          id: number
          name: string
          parent_id: number | null
          ranked: boolean
          school_id: number
        }
        Insert: {
          color?: string
          created_at?: string
          id?: number
          name: string
          parent_id?: number | null
          ranked?: boolean
          school_id: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: number
          name?: string
          parent_id?: number | null
          ranked?: boolean
          school_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "point_group_parentId_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "point_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_group_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      point_template: {
        Row: {
          conversion_rule_id: number
          created_at: string
          id: number
          name: string
          point_group_id: number
          student_group_id: number
          template_type_id: number
        }
        Insert: {
          conversion_rule_id: number
          created_at?: string
          id?: number
          name: string
          point_group_id: number
          student_group_id: number
          template_type_id: number
        }
        Update: {
          conversion_rule_id?: number
          created_at?: string
          id?: number
          name?: string
          point_group_id?: number
          student_group_id?: number
          template_type_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "point_template_conversionRuleId_fkey"
            columns: ["conversion_rule_id"]
            isOneToOne: false
            referencedRelation: "point_conversion_rule"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_template_pointGroupId_fkey"
            columns: ["point_group_id"]
            isOneToOne: false
            referencedRelation: "point_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_template_student_group_id_fkey"
            columns: ["student_group_id"]
            isOneToOne: false
            referencedRelation: "student_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_template_templateTypeId_fkey"
            columns: ["template_type_id"]
            isOneToOne: false
            referencedRelation: "point_template_type"
            referencedColumns: ["id"]
          },
        ]
      }
      point_template_type: {
        Row: {
          created_at: string
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      ranking_group: {
        Row: {
          created_at: string
          id: number
          name: string
          school_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          school_id: number
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          school_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ranking_group_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      ranking_group_pair: {
        Row: {
          created_at: string
          ranking_group_id: number
          student_group_id: number
        }
        Insert: {
          created_at?: string
          ranking_group_id: number
          student_group_id: number
        }
        Update: {
          created_at?: string
          ranking_group_id?: number
          student_group_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ranking_group_pair_ranking_group_id_fkey"
            columns: ["ranking_group_id"]
            isOneToOne: false
            referencedRelation: "ranking_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ranking_group_pair_student_group_id_fkey"
            columns: ["student_group_id"]
            isOneToOne: false
            referencedRelation: "student_group"
            referencedColumns: ["id"]
          },
        ]
      }
      school: {
        Row: {
          created_at: string
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      school_point_group_pair: {
        Row: {
          created_at: string
          point_group_id: number
          school_id: number
        }
        Insert: {
          created_at?: string
          point_group_id: number
          school_id: number
        }
        Update: {
          created_at?: string
          point_group_id?: number
          school_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "school_point_group_pair_pointGroupId_fkey"
            columns: ["point_group_id"]
            isOneToOne: false
            referencedRelation: "point_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_point_group_pair_schoolId_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      student: {
        Row: {
          birthdate: string | null
          created_at: string
          first_name: string
          gender: string | null
          grade: number
          id: number
          last_name: string
          link_code: string
          linkedUser: number | null
          powerschool_id: number
          school_id: number
        }
        Insert: {
          birthdate?: string | null
          created_at?: string
          first_name: string
          gender?: string | null
          grade: number
          id?: number
          last_name: string
          link_code?: string
          linkedUser?: number | null
          powerschool_id: number
          school_id: number
        }
        Update: {
          birthdate?: string | null
          created_at?: string
          first_name?: string
          gender?: string | null
          grade?: number
          id?: number
          last_name?: string
          link_code?: string
          linkedUser?: number | null
          powerschool_id?: number
          school_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_linkedUser_fkey"
            columns: ["linkedUser"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_schoolId_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      student_class_pair: {
        Row: {
          class_id: number
          created_at: string
          student_id: number
        }
        Insert: {
          class_id: number
          created_at?: string
          student_id: number
        }
        Update: {
          class_id?: number
          created_at?: string
          student_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_class_pair_classId_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_class_pair_studentId_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
        ]
      }
      student_group: {
        Row: {
          created_at: string
          id: number
          name: string
          parent_id: number | null
          school_id: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          parent_id?: number | null
          school_id?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          parent_id?: number | null
          school_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_group_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "student_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_group_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      student_group_pair: {
        Row: {
          created_at: string
          student_group_id: number
          student_id: number
        }
        Insert: {
          created_at?: string
          student_group_id: number
          student_id: number
        }
        Update: {
          created_at?: string
          student_group_id?: number
          student_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_group_pair_studentGroupId_fkey"
            columns: ["student_group_id"]
            isOneToOne: false
            referencedRelation: "student_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_group_pair_studentId_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
        ]
      }
      student_group_type: {
        Row: {
          created_at: string
          id: number
          name: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          name?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          name?: string | null
        }
        Relationships: []
      }
      student_point: {
        Row: {
          created_at: string
          id: number
          input_score: number | null
          notes: string | null
          point_event_id: number
          point_value: number
          student_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          input_score?: number | null
          notes?: string | null
          point_event_id: number
          point_value: number
          student_id: number
        }
        Update: {
          created_at?: string
          id?: number
          input_score?: number | null
          notes?: string | null
          point_event_id?: number
          point_value?: number
          student_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_point_point_event_id_fkey"
            columns: ["point_event_id"]
            isOneToOne: false
            referencedRelation: "point_event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_point_studentId_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher: {
        Row: {
          created_at: string
          first_name: string
          id: number
          last_name: string
          link_code: string
          linked_user: number | null
          school_id: number
        }
        Insert: {
          created_at?: string
          first_name: string
          id?: number
          last_name: string
          link_code?: string
          linked_user?: number | null
          school_id: number
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: number
          last_name?: string
          link_code?: string
          linked_user?: number | null
          school_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "teacher_linked_user_fkey"
            columns: ["linked_user"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_schoolId_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_class_pair: {
        Row: {
          class_id: number
          created_at: string
          teacher_id: number
        }
        Insert: {
          class_id: number
          created_at?: string
          teacher_id: number
        }
        Update: {
          class_id?: number
          created_at?: string
          teacher_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "teacher_class_pair_classId_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "class"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_class_pair_teacherId_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_student_group_pair: {
        Row: {
          created_at: string
          group_id: number
          teacher_id: number
        }
        Insert: {
          created_at?: string
          group_id: number
          teacher_id: number
        }
        Update: {
          created_at?: string
          group_id?: number
          teacher_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "teacher_student_group_pair_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "student_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_student_group_pair_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher"
            referencedColumns: ["id"]
          },
        ]
      }
      user: {
        Row: {
          admin_id: number | null
          created_at: string
          first_name: string | null
          id: number
          last_name: string | null
          student_id: number | null
          supabase_id: string
          teacher_id: number | null
        }
        Insert: {
          admin_id?: number | null
          created_at?: string
          first_name?: string | null
          id?: number
          last_name?: string | null
          student_id?: number | null
          supabase_id: string
          teacher_id?: number | null
        }
        Update: {
          admin_id?: number | null
          created_at?: string
          first_name?: string | null
          id?: number
          last_name?: string | null
          student_id?: number | null
          supabase_id?: string
          teacher_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_adminId_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_supabaseid_fkey"
            columns: ["supabase_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_student_group: {
        Args: {
          provided_school_id: number
          provided_name: string
          provided_parent_id?: number
        }
        Returns: undefined
      }
      add_student_to_student_group: {
        Args: {
          provided_student_id: number
          provided_student_group_id: number
        }
        Returns: undefined
      }
      add_teacher_to_student_group: {
        Args: {
          provided_teacher_id: number
          provided_student_group_id: number
        }
        Returns: undefined
      }
      check_admin_access_to_school: {
        Args: {
          provided_school_id: number
        }
        Returns: undefined
      }
      check_admin_access_to_student: {
        Args: {
          provided_student_id: number
        }
        Returns: undefined
      }
      check_admin_access_to_student_group: {
        Args: {
          provided_student_group_id: number
        }
        Returns: undefined
      }
      check_admin_access_to_teacher: {
        Args: {
          provided_teacher_id: number
        }
        Returns: undefined
      }
      create_group: {
        Args: {
          school_id: number
          name: string
          parent_id: number
        }
        Returns: undefined
      }
      create_school_and_pair_admin: {
        Args: {
          admin_id: number
          school_name: string
        }
        Returns: undefined
      }
      get_own_admin_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          id: number
        }[]
      }
      get_own_teacher_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          first_name: string
          id: number
          last_name: string
          link_code: string
          linked_user: number | null
          school_id: number
        }[]
      }
      get_point_groups_as_admin: {
        Args: {
          school_id: number
        }
        Returns: {
          color: string
          created_at: string
          id: number
          name: string
          parent_id: number | null
          ranked: boolean
          school_id: number
        }[]
      }
      get_school: {
        Args: {
          school_id: number
        }
        Returns: {
          created_at: string
          id: number
          name: string
        }[]
      }
      get_school_student_as_admin: {
        Args: {
          provided_school_id: number
          provided_student_id: number
        }
        Returns: {
          birthdate: string | null
          created_at: string
          first_name: string
          gender: string | null
          grade: number
          id: number
          last_name: string
          link_code: string
          linkedUser: number | null
          powerschool_id: number
          school_id: number
        }[]
      }
      get_school_students_as_admin: {
        Args: {
          provided_school_id: number
        }
        Returns: {
          birthdate: string | null
          created_at: string
          first_name: string
          gender: string | null
          grade: number
          id: number
          last_name: string
          link_code: string
          linkedUser: number | null
          powerschool_id: number
          school_id: number
        }[]
      }
      get_school_teacher_as_admin: {
        Args: {
          provided_school_id: number
          provided_teacher_id: number
        }
        Returns: {
          teacher_id: number
          first_name: string
          last_name: string
          link_code: string
          user_id: number
        }[]
      }
      get_school_teachers_as_admin: {
        Args: {
          provided_school_id: number
        }
        Returns: {
          teacher_id: number
          first_name: string
          last_name: string
          link_code: string
          user_id: number
        }[]
      }
      get_schools_as_admin: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          id: number
          name: string
        }[]
      }
      get_student_group_as_admin: {
        Args: {
          provided_school_id: number
          provided_group_id: number
        }
        Returns: {
          id: number
          name: string
          parent_id: number
          child_groups: Database["public"]["Tables"]["student_group"]["Row"][]
          teachers: Database["public"]["Tables"]["teacher"]["Row"][]
          students: Database["public"]["Tables"]["student"]["Row"][]
        }[]
      }
      get_student_group_students_as_admin: {
        Args: {
          provided_school_id: number
          provided_student_group_id: number
        }
        Returns: {
          birthdate: string | null
          created_at: string
          first_name: string
          gender: string | null
          grade: number
          id: number
          last_name: string
          link_code: string
          linkedUser: number | null
          powerschool_id: number
          school_id: number
        }[]
      }
      get_student_groups_as_admin: {
        Args: {
          school_id: number
        }
        Returns: {
          created_at: string
          id: number
          name: string
          parent_id: number | null
          school_id: number | null
        }[]
      }
      get_user_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          admin_id: number | null
          created_at: string
          first_name: string | null
          id: number
          last_name: string | null
          student_id: number | null
          supabase_id: string
          teacher_id: number | null
        }[]
      }
      remove_student_from_student_group: {
        Args: {
          provided_student_id: number
          provided_student_group_id: number
        }
        Returns: undefined
      }
      remove_teacher_from_student_group: {
        Args: {
          provided_school_id: number
          provided_teacher_id: number
          provided_group_id: number
        }
        Returns: undefined
      }
      update_student_data: {
        Args: {
          provided_student_id: number
          provided_student_first_name: string
          provided_student_last_name: string
          provided_student_birthdate: string
          provided_student_grade: number
          provided_student_gender: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
