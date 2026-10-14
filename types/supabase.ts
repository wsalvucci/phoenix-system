export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.2"
  }
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
          student_group_id: number | null
          target: number
          value: number | null
        }
        Insert: {
          conversion_rule_type_id: number
          created_at?: string
          formula?: string | null
          id?: number
          name: string
          student_group_id?: number | null
          target: number
          value?: number | null
        }
        Update: {
          conversion_rule_type_id?: number
          created_at?: string
          formula?: string | null
          id?: number
          name?: string
          student_group_id?: number | null
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
          {
            foreignKeyName: "point_conversion_rule_student_group_id_fkey"
            columns: ["student_group_id"]
            isOneToOne: false
            referencedRelation: "student_group"
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
          conversion_formula: string | null
          created_at: string
          date: string | null
          id: number
          max_input: number
          name: string | null
          point_group_id: number | null
          student_group_id: number
          template_id: number
        }
        Insert: {
          conversion_formula?: string | null
          created_at?: string
          date?: string | null
          id?: number
          max_input?: number
          name?: string | null
          point_group_id?: number | null
          student_group_id: number
          template_id: number
        }
        Update: {
          conversion_formula?: string | null
          created_at?: string
          date?: string | null
          id?: number
          max_input?: number
          name?: string | null
          point_group_id?: number | null
          student_group_id?: number
          template_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "point_event_point_group_id_fkey"
            columns: ["point_group_id"]
            isOneToOne: false
            referencedRelation: "point_group"
            referencedColumns: ["id"]
          },
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
          conversion_formula: string | null
          conversion_rule_type: number | null
          conversion_rule_value: number
          created_at: string
          id: number
          max_input_value: number
          name: string
          point_group_id: number
          student_group_id: number
          template_type_id: number
        }
        Insert: {
          conversion_formula?: string | null
          conversion_rule_type?: number | null
          conversion_rule_value: number
          created_at?: string
          id?: number
          max_input_value: number
          name: string
          point_group_id: number
          student_group_id: number
          template_type_id: number
        }
        Update: {
          conversion_formula?: string | null
          conversion_rule_type?: number | null
          conversion_rule_value?: number
          created_at?: string
          id?: number
          max_input_value?: number
          name?: string
          point_group_id?: number
          student_group_id?: number
          template_type_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "point_template_conversion_rule_type_fkey"
            columns: ["conversion_rule_type"]
            isOneToOne: false
            referencedRelation: "point_conversion_rule_type"
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
          timeframe_id: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          school_id: number
          timeframe_id?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          school_id?: number
          timeframe_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ranking_group_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ranking_group_timeframe_id_fkey"
            columns: ["timeframe_id"]
            isOneToOne: false
            referencedRelation: "school_timeframes"
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
      ranking_group_point_event: {
        Row: {
          created_at: string
          date: string
          id: number
          name: string | null
          ranking_group_id: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: number
          name?: string | null
          ranking_group_id: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: number
          name?: string | null
          ranking_group_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ranking_group_point_event_ranking_group_id_fkey"
            columns: ["ranking_group_id"]
            isOneToOne: false
            referencedRelation: "ranking_group"
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
      school_admins: {
        Row: {
          created_at: string
          id: number
          link_code: string
          linked_supa_id: string
          school_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          link_code?: string
          linked_supa_id: string
          school_id: number
        }
        Update: {
          created_at?: string
          id?: number
          link_code?: string
          linked_supa_id?: string
          school_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "school_admins_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      school_timeframes: {
        Row: {
          active: boolean
          created_at: string
          ends_at: string
          id: number
          name: string
          school_id: number
          starts_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          ends_at: string
          id?: number
          name: string
          school_id: number
          starts_at: string
        }
        Update: {
          active?: boolean
          created_at?: string
          ends_at?: string
          id?: number
          name?: string
          school_id?: number
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_timeframes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      scorebook_event_copy_operation: {
        Row: {
          adjusted_dates: Json
          created_at: string
          created_event_ids: number[]
          destination_timeframe_id: number | null
          excluded_event_ids: number[]
          id: number
          outside_destination_count: number
          request_id: string
          shift_amount: number
          shift_unit: string
          source_event_ids: number[]
          source_timeframe_id: number
          student_group_id: number
          teacher_id: number
        }
        Insert: {
          adjusted_dates?: Json
          created_at?: string
          created_event_ids: number[]
          destination_timeframe_id?: number | null
          excluded_event_ids?: number[]
          id?: number
          outside_destination_count?: number
          request_id: string
          shift_amount: number
          shift_unit: string
          source_event_ids: number[]
          source_timeframe_id: number
          student_group_id: number
          teacher_id: number
        }
        Update: {
          adjusted_dates?: Json
          created_at?: string
          created_event_ids?: number[]
          destination_timeframe_id?: number | null
          excluded_event_ids?: number[]
          id?: number
          outside_destination_count?: number
          request_id?: string
          shift_amount?: number
          shift_unit?: string
          source_event_ids?: number[]
          source_timeframe_id?: number
          student_group_id?: number
          teacher_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "scorebook_event_copy_operation_destination_timeframe_id_fkey"
            columns: ["destination_timeframe_id"]
            isOneToOne: false
            referencedRelation: "school_timeframes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorebook_event_copy_operation_source_timeframe_id_fkey"
            columns: ["source_timeframe_id"]
            isOneToOne: false
            referencedRelation: "school_timeframes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorebook_event_copy_operation_student_group_id_fkey"
            columns: ["student_group_id"]
            isOneToOne: false
            referencedRelation: "student_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorebook_event_copy_operation_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_point: {
        Row: {
          created_at: string
          id: number
          pinned: boolean
          shared_group_id: number
          student_point_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          pinned?: boolean
          shared_group_id: number
          student_point_id: number
        }
        Update: {
          created_at?: string
          id?: number
          pinned?: boolean
          shared_group_id?: number
          student_point_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "shared_point_shared_group_id_fkey"
            columns: ["shared_group_id"]
            isOneToOne: false
            referencedRelation: "student_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_point_student_point_id_fkey"
            columns: ["student_point_id"]
            isOneToOne: false
            referencedRelation: "student_point"
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
          archived: boolean
          created_at: string
          id: number
          name: string
          parent_id: number | null
          points_per_student: number | null
          school_id: number | null
          timeframe_id: number | null
        }
        Insert: {
          archived?: boolean
          created_at?: string
          id?: number
          name: string
          parent_id?: number | null
          points_per_student?: number | null
          school_id?: number | null
          timeframe_id?: number | null
        }
        Update: {
          archived?: boolean
          created_at?: string
          id?: number
          name?: string
          parent_id?: number | null
          points_per_student?: number | null
          school_id?: number | null
          timeframe_id?: number | null
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
          {
            foreignKeyName: "student_group_timeframe_id_fkey"
            columns: ["timeframe_id"]
            isOneToOne: false
            referencedRelation: "school_timeframes"
            referencedColumns: ["id"]
          },
        ]
      }
      student_group_leaders: {
        Row: {
          group_id: number
          student_id: number
        }
        Insert: {
          group_id: number
          student_id: number
        }
        Update: {
          group_id?: number
          student_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_group_leaders_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "student_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_group_leaders_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
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
      student_group_point: {
        Row: {
          created_at: string
          id: number
          ranking_group_point_event_id: number
          student_group_id: number
          value: number
        }
        Insert: {
          created_at?: string
          id?: number
          ranking_group_point_event_id: number
          student_group_id: number
          value?: number
        }
        Update: {
          created_at?: string
          id?: number
          ranking_group_point_event_id?: number
          student_group_id?: number
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_group_point_ranking_group_point_event_id_fkey"
            columns: ["ranking_group_point_event_id"]
            isOneToOne: false
            referencedRelation: "ranking_group_point_event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_group_point_student_group_id_fkey1"
            columns: ["student_group_id"]
            isOneToOne: false
            referencedRelation: "student_group"
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
      teacher_ranking_group_pair: {
        Row: {
          created_at: string
          ranking_group_id: number
          teacher_id: number
        }
        Insert: {
          created_at?: string
          ranking_group_id: number
          teacher_id: number
        }
        Update: {
          created_at?: string
          ranking_group_id?: number
          teacher_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "teacher_ranking_group_pair_ranking_group_id_fkey"
            columns: ["ranking_group_id"]
            isOneToOne: false
            referencedRelation: "ranking_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_ranking_group_pair_teacher_id_fkey"
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
      teaching_assistant: {
        Row: {
          full_access: boolean | null
          group_id: number
          id: number
          student_id: number
        }
        Insert: {
          full_access?: boolean | null
          group_id: number
          id?: number
          student_id: number
        }
        Update: {
          full_access?: boolean | null
          group_id?: number
          id?: number
          student_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "teaching_assistant_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "student_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_assistant_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
        ]
      }
      teaching_assistant_point_event: {
        Row: {
          assistant_id: number
          point_event_id: number
        }
        Insert: {
          assistant_id: number
          point_event_id: number
        }
        Update: {
          assistant_id?: number
          point_event_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "teaching_assistant_point_event_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "teaching_assistant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_assistant_point_event_point_event_id_fkey"
            columns: ["point_event_id"]
            isOneToOne: false
            referencedRelation: "point_event"
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
        ]
      }
      user_student_pair: {
        Row: {
          created_at: string
          student_id: number
          user_id: number
        }
        Insert: {
          created_at?: string
          student_id: number
          user_id: number
        }
        Update: {
          created_at?: string
          student_id?: number
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_student_pair_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_student_pair_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
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
          provided_name: string
          provided_parent_id?: number
          provided_school_id: number
        }
        Returns: undefined
      }
      add_student_to_student_group: {
        Args: { provided_student_group_id: number; provided_student_id: number }
        Returns: undefined
      }
      add_teacher_to_student_group: {
        Args: { provided_student_group_id: number; provided_teacher_id: number }
        Returns: undefined
      }
      auth_current_student: {
        Args: never
        Returns: {
          grade: number
          school_id: number
          student_id: number
        }[]
      }
      check_admin_access_to_school: {
        Args: { provided_school_id: number }
        Returns: undefined
      }
      check_admin_access_to_student: {
        Args: { provided_student_id: number }
        Returns: undefined
      }
      check_admin_access_to_student_group: {
        Args: { provided_student_group_id: number }
        Returns: undefined
      }
      check_admin_access_to_teacher: {
        Args: { provided_teacher_id: number }
        Returns: undefined
      }
      create_group: {
        Args: { name: string; parent_id: number; school_id: number }
        Returns: undefined
      }
      create_school_and_pair_admin: {
        Args: { admin_id: number; school_name: string }
        Returns: undefined
      }
      duplicate_scorebook_events: {
        Args: {
          provided_destination_timeframe_id?: number
          provided_excluded_event_ids?: number[]
          provided_expected_source_event_ids: number[]
          provided_request_id?: string
          provided_shift_amount: number
          provided_shift_unit: string
          provided_source_timeframe_id: number
          provided_student_group_id: number
          provided_teacher_id: number
        }
        Returns: Json
      }
      edit_scorebook_point_event: {
        Args: {
          provided_conversion_formula: string
          provided_date: string
          provided_max_input: number
          provided_name: string
          provided_point_event_id: number
          provided_point_group_id: number
          provided_student_group_id: number
          provided_student_points: Json
        }
        Returns: undefined
      }
      get_active_timeframe: {
        Args: never
        Returns: {
          active: boolean
          ends_at: string
          id: number
          name: string
          school_id: number
          starts_at: string
        }[]
      }
      get_all_timeframes: {
        Args: never
        Returns: {
          active: boolean
          ends_at: string
          id: number
          name: string
          starts_at: string
        }[]
      }
      get_available_leaderboard_scopes: {
        Args: { p_timeframe_id: number }
        Returns: {
          scope_id: number
          scope_name: string
          scope_type: string
        }[]
      }
      get_category_breakdown: {
        Args: { p_timeframe_id: number }
        Returns: {
          color: string
          point_group_id: number
          point_group_name: string
          total_points: number
        }[]
      }
      get_dashboard_totals: {
        Args: { p_timeframe_id: number }
        Returns: {
          first_name: string
          last_name: string
          school_name: string
          school_rank: number
          student_id: number
          total_points: number
          total_students: number
        }[]
      }
      get_grade_leaderboard: {
        Args: { p_grade: number; p_timeframe_id: number }
        Returns: {
          first_name: string
          is_current_student: boolean
          last_name: string
          rank: number
          student_id: number
          total_points: number
        }[]
      }
      get_led_group_member_points: {
        Args: { p_group_id: number; p_timeframe_id: number }
        Returns: {
          category_breakdown: Json
          first_name: string
          last_name: string
          student_id: number
          total_points: number
        }[]
      }
      get_my_groups: {
        Args: { p_timeframe_id: number }
        Returns: {
          group_id: number
          group_name: string
          is_leader: boolean
          member_count: number
          points_per_student: number
          ranking_group_id: number
          ranking_group_name: string
        }[]
      }
      get_my_visibility_snapshot: {
        Args: { p_timeframe_id: number }
        Returns: {
          category_ranks: Json
          change_window_days: number
          grade: number
          grade_rank: number
          leaderboard_top_overall: number
          leaderboard_top_per_category: number
          leaderboard_top_per_grade: number
          led_group_ids: number[]
          overall_rank: number
          rank_lookahead: number
          student_id: number
          timeframe_id: number
        }[]
      }
      get_own_admin_data: {
        Args: never
        Returns: {
          created_at: string
          id: number
        }[]
        SetofOptions: {
          from: "*"
          to: "admin"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_own_teacher_data: {
        Args: never
        Returns: {
          created_at: string
          first_name: string
          id: number
          last_name: string
          link_code: string
          linked_user: number | null
          school_id: number
        }[]
        SetofOptions: {
          from: "*"
          to: "teacher"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_point_group_leaderboard: {
        Args: { p_point_group_id: number; p_timeframe_id: number }
        Returns: {
          first_name: string
          is_current_student: boolean
          last_name: string
          points_change: number
          rank: number
          rank_change: number
          student_id: number
          total_points: number
        }[]
      }
      get_point_groups_as_admin: {
        Args: { school_id: number }
        Returns: {
          color: string
          created_at: string
          id: number
          name: string
          parent_id: number | null
          ranked: boolean
          school_id: number
        }[]
        SetofOptions: {
          from: "*"
          to: "point_group"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_point_history: {
        Args: { p_page: number; p_page_size: number; p_timeframe_id: number }
        Returns: {
          event_date: string
          event_name: string
          event_participant_count: number
          event_rank: number
          id: number
          point_group_color: string
          point_group_name: string
          point_value: number
        }[]
      }
      get_ranking_group_leaderboard: {
        Args: { p_ranking_group_id: number; p_timeframe_id: number }
        Returns: {
          avg_student_points: number
          group_id: number
          group_name: string
          group_points: number
          is_current_student_group: boolean
          rank: number
          top_student_points: number
          total_score: number
        }[]
      }
      get_school: {
        Args: { school_id: number }
        Returns: {
          created_at: string
          id: number
          name: string
        }[]
        SetofOptions: {
          from: "*"
          to: "school"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_school_leaderboard: {
        Args: { p_timeframe_id: number }
        Returns: {
          first_name: string
          is_current_student: boolean
          last_name: string
          points_change: number
          rank: number
          rank_change: number
          student_id: number
          total_points: number
        }[]
      }
      get_school_student_as_admin: {
        Args: { provided_school_id: number; provided_student_id: number }
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
        SetofOptions: {
          from: "*"
          to: "student"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_school_students_as_admin: {
        Args: { provided_school_id: number }
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
        SetofOptions: {
          from: "*"
          to: "student"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_school_teacher_as_admin: {
        Args: { provided_school_id: number; provided_teacher_id: number }
        Returns: {
          first_name: string
          last_name: string
          link_code: string
          teacher_id: number
          user_id: number
        }[]
      }
      get_school_teachers_as_admin: {
        Args: { provided_school_id: number }
        Returns: {
          first_name: string
          last_name: string
          link_code: string
          teacher_id: number
          user_id: number
        }[]
      }
      get_schools_as_admin: {
        Args: never
        Returns: {
          created_at: string
          id: number
          name: string
        }[]
        SetofOptions: {
          from: "*"
          to: "school"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_student_group_as_admin: {
        Args: { provided_group_id: number; provided_school_id: number }
        Returns: {
          child_groups: Database["public"]["Tables"]["student_group"]["Row"][]
          id: number
          name: string
          parent_id: number
          students: Database["public"]["Tables"]["student"]["Row"][]
          teachers: Database["public"]["Tables"]["teacher"]["Row"][]
        }[]
      }
      get_student_group_leaderboard: {
        Args: { p_group_id: number; p_timeframe_id: number }
        Returns: {
          avg_points: number
          group_id: number
          group_name: string
          is_leader: boolean
          is_member: boolean
          member_count: number
        }[]
      }
      get_student_group_students_as_admin: {
        Args: { provided_school_id: number; provided_student_group_id: number }
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
        SetofOptions: {
          from: "*"
          to: "student"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_student_groups_as_admin: {
        Args: { school_id: number }
        Returns: {
          archived: boolean
          created_at: string
          id: number
          name: string
          parent_id: number | null
          points_per_student: number | null
          school_id: number | null
          timeframe_id: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "student_group"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_user_data: {
        Args: never
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
        SetofOptions: {
          from: "*"
          to: "user"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      remove_student_from_student_group: {
        Args: { provided_student_group_id: number; provided_student_id: number }
        Returns: undefined
      }
      remove_teacher_from_student_group: {
        Args: {
          provided_group_id: number
          provided_school_id: number
          provided_teacher_id: number
        }
        Returns: undefined
      }
      timeframe_bounds: {
        Args: { p_timeframe_id: number }
        Returns: {
          ends_at: string
          id: number
          starts_at: string
        }[]
      }
      update_student_data: {
        Args: {
          provided_student_birthdate: string
          provided_student_first_name: string
          provided_student_gender: string
          provided_student_grade: number
          provided_student_id: number
          provided_student_last_name: string
        }
        Returns: undefined
      }
      visibility_change_cutoff: {
        Args: { p_days: number; p_ends_at: string; p_starts_at: string }
        Returns: string
      }
      visibility_config: {
        Args: never
        Returns: {
          change_window_days: number
          leaderboard_top_overall: number
          leaderboard_top_per_category: number
          leaderboard_top_per_grade: number
          rank_lookahead: number
        }[]
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
