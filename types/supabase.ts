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
      display_device: {
        Row: {
          id: string
          label: string
          last_seen_at: string | null
          paired_at: string
          paired_by_user_id: number | null
          reconfirmed_at: string | null
          revoked_at: string | null
          revoked_by_user_id: number | null
          school_id: number
          token_hash: string
        }
        Insert: {
          id?: string
          label: string
          last_seen_at?: string | null
          paired_at?: string
          paired_by_user_id?: number | null
          reconfirmed_at?: string | null
          revoked_at?: string | null
          revoked_by_user_id?: number | null
          school_id: number
          token_hash: string
        }
        Update: {
          id?: string
          label?: string
          last_seen_at?: string | null
          paired_at?: string
          paired_by_user_id?: number | null
          reconfirmed_at?: string | null
          revoked_at?: string | null
          revoked_by_user_id?: number | null
          school_id?: number
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "display_device_paired_by_user_id_fkey"
            columns: ["paired_by_user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "display_device_revoked_by_user_id_fkey"
            columns: ["revoked_by_user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "display_device_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
        ]
      }
      display_pairing_request: {
        Row: {
          approved_at: string | null
          approved_by_user_id: number | null
          approved_label: string | null
          approved_school_id: number | null
          claimed_at: string | null
          created_at: string
          device_id: string | null
          device_secret_hash: string
          expires_at: string
          id: string
          user_code: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_user_id?: number | null
          approved_label?: string | null
          approved_school_id?: number | null
          claimed_at?: string | null
          created_at?: string
          device_id?: string | null
          device_secret_hash: string
          expires_at?: string
          id?: string
          user_code: string
        }
        Update: {
          approved_at?: string | null
          approved_by_user_id?: number | null
          approved_label?: string | null
          approved_school_id?: number | null
          claimed_at?: string | null
          created_at?: string
          device_id?: string | null
          device_secret_hash?: string
          expires_at?: string
          id?: string
          user_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "display_pairing_request_approved_by_user_id_fkey"
            columns: ["approved_by_user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "display_pairing_request_approved_school_id_fkey"
            columns: ["approved_school_id"]
            isOneToOne: false
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "display_pairing_request_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "display_device"
            referencedColumns: ["id"]
          },
        ]
      }
      leader_letter: {
        Row: {
          letter: string
          participated: boolean
          point_group_id: number
          school_id: number
          student_id: number
        }
        Insert: {
          letter: string
          participated: boolean
          point_group_id: number
          school_id: number
          student_id: number
        }
        Update: {
          letter?: string
          participated?: boolean
          point_group_id?: number
          school_id?: number
          student_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "leader_letter_point_group_id_fkey"
            columns: ["point_group_id"]
            isOneToOne: false
            referencedRelation: "point_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leader_letter_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "leader_letter_run"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "leader_letter_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
        ]
      }
      leader_letter_run: {
        Row: {
          point_group_ids: number[]
          school_id: number
          snapshot_date: string
          taken_at: string
          timeframe_id: number
        }
        Insert: {
          point_group_ids?: number[]
          school_id: number
          snapshot_date: string
          taken_at?: string
          timeframe_id: number
        }
        Update: {
          point_group_ids?: number[]
          school_id?: number
          snapshot_date?: string
          taken_at?: string
          timeframe_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "leader_letter_run_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "school"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leader_letter_run_timeframe_id_fkey"
            columns: ["timeframe_id"]
            isOneToOne: false
            referencedRelation: "school_timeframes"
            referencedColumns: ["id"]
          },
        ]
      }
      link_attempt: {
        Row: {
          attempted_at: string
          client_key: string | null
          id: number
          purpose: string
          user_id: number | null
        }
        Insert: {
          attempted_at?: string
          client_key?: string | null
          id?: number
          purpose: string
          user_id?: number | null
        }
        Update: {
          attempted_at?: string
          client_key?: string | null
          id?: number
          purpose?: string
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "link_attempt_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_link_revocation: {
        Row: {
          id: number
          linked_at: string | null
          parent_user_id: number | null
          revoked_at: string
          revoked_by_user_id: number | null
          student_id: number
        }
        Insert: {
          id?: number
          linked_at?: string | null
          parent_user_id?: number | null
          revoked_at?: string
          revoked_by_user_id?: number | null
          student_id: number
        }
        Update: {
          id?: number
          linked_at?: string | null
          parent_user_id?: number | null
          revoked_at?: string
          revoked_by_user_id?: number | null
          student_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "parent_link_revocation_parent_user_id_fkey"
            columns: ["parent_user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_link_revocation_revoked_by_user_id_fkey"
            columns: ["revoked_by_user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_link_revocation_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
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
      shared_point_withdrawal: {
        Row: {
          id: number
          seen_at: string | null
          student_id: number
          student_point_id: number
          withdrawn_at: string
        }
        Insert: {
          id?: number
          seen_at?: string | null
          student_id: number
          student_point_id: number
          withdrawn_at?: string
        }
        Update: {
          id?: number
          seen_at?: string | null
          student_id?: number
          student_point_id?: number
          withdrawn_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_point_withdrawal_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_point_withdrawal_student_point_id_fkey"
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
      admin_list_parent_links: {
        Args: { p_actor_user_id: number; p_student_id: number }
        Returns: {
          linked_at: string
          parent_email: string
          parent_name: string
          parent_user_id: number
        }[]
      }
      admin_revoke_parent_link: {
        Args: {
          p_actor_user_id: number
          p_parent_user_id: number
          p_student_id: number
        }
        Returns: boolean
      }
      admin_rotate_link_code: {
        Args: { p_actor_user_id: number; p_id: number; p_kind: string }
        Returns: string
      }
      auth_current_student: {
        Args: never
        Returns: {
          grade: number
          school_id: number
          student_id: number
        }[]
      }
      can_view_student: {
        Args: { p_student_id: number; p_user_id: number }
        Returns: boolean
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
      display_cut: {
        Args: {
          p_actor_user_id?: number
          p_cohort_id: number
          p_cohort_kind: string
          p_display_device_id?: string
          p_school_id: number
          p_timeframe_id: number
        }
        Returns: {
          display_rank: number
          first_name: string
          grade: number
          last_name: string
          total_points: number
        }[]
      }
      display_device_create: {
        Args: {
          p_actor_user_id: number
          p_label: string
          p_school_id: number
          p_token_hash: string
        }
        Returns: string
      }
      display_device_live: {
        Args: { p_device_id: string; p_school_id: number }
        Returns: boolean
      }
      display_device_reconfirm: {
        Args: { p_actor_user_id: number; p_device_id: string }
        Returns: boolean
      }
      display_device_resolve: {
        Args: { p_token_hash: string }
        Returns: {
          device_id: string
          label: string
          paired_by_name: string
          school_id: number
          school_name: string
        }[]
      }
      display_device_revoke: {
        Args: { p_actor_user_id: number; p_device_id: string }
        Returns: boolean
      }
      display_devices_for_school: {
        Args: { p_actor_user_id: number; p_school_id: number }
        Returns: {
          device_id: string
          label: string
          last_seen_at: string
          paired_at: string
          paired_by_name: string
          pairer_active: boolean
          revoked_at: string
        }[]
      }
      display_pairing_approve: {
        Args: {
          p_actor_user_id: number
          p_label: string
          p_school_id: number
          p_user_code: string
        }
        Returns: string
      }
      display_pairing_claim: {
        Args: { p_device_secret_hash: string; p_token_hash: string }
        Returns: {
          device_id: string
          school_id: number
        }[]
      }
      display_pairing_start: {
        Args: { p_device_secret_hash: string }
        Returns: {
          expires_at: string
          request_id: string
          user_code: string
        }[]
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
      generate_link_code: { Args: never; Returns: string }
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
      get_leader_group_letters: {
        Args: { p_actor_user_id: number }
        Returns: {
          group_id: number
          group_name: string
          letter: string
          member_first_name: string
          member_last_name: string
          member_ordinal: number
          point_group_color: string
          point_group_id: number
          point_group_name: string
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
      get_own_led_letters: {
        Args: { p_actor_user_id: number; p_student_id: number }
        Returns: {
          group_id: number
          group_name: string
          leaders: Json
          letters: Json
        }[]
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
      is_admin_of_school: {
        Args: { p_school_id: number; p_user_id: number }
        Returns: boolean
      }
      is_staff_of_school: {
        Args: { p_school_id: number; p_user_id: number }
        Returns: boolean
      }
      letter_for_share_below: { Args: { p: number }; Returns: string }
      link_attempt_blocked: {
        Args: { p_client_key: string; p_user_id: number }
        Returns: boolean
      }
      mobile_cohort_board: {
        Args: {
          p_cohort_id: number
          p_cutoff: string
          p_ends: string
          p_kind: string
          p_school_id: number
          p_starts: string
          p_viewer_student_id: number
        }
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
      mobile_own_rank: {
        Args: {
          p_cohort_id: number
          p_ends: string
          p_kind: string
          p_school_id: number
          p_starts: string
          p_student_id: number
        }
        Returns: {
          cohort_size: number
          own_rank: number
        }[]
      }
      normalize_link_code: { Args: { p_code: string }; Returns: string }
      own_parent_link_dates: {
        Args: { p_actor_user_id: number }
        Returns: {
          linked_on: string
        }[]
      }
      points_to_next_rank: {
        Args: {
          p_actor_user_id: number
          p_student_id: number
          p_timeframe_id: number
        }
        Returns: {
          cohort_id: number
          cohort_kind: string
          points_to_next: number
        }[]
      }
      preview_link_code: {
        Args: {
          p_actor_user_id: number
          p_client_key: string
          p_code: string
          p_purpose: string
          p_school_id: number
        }
        Returns: {
          first_name: string
          last_initial: string
          status: string
        }[]
      }
      publication_cut: { Args: { p_size: number }; Returns: number }
      publication_cut_policy: {
        Args: never
        Returns: {
          k_hidden: number
          min_cohort_for_aggregate: number
          n_absolute: number
          p_ratio: number
        }[]
      }
      random_crockford: { Args: { p_length: number }; Returns: string }
      redeem_link_code: {
        Args: {
          p_actor_user_id: number
          p_client_key: string
          p_code: string
          p_purpose: string
          p_school_id: number
        }
        Returns: string
      }
      refresh_leader_letters: { Args: { p_school_id: number }; Returns: number }
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
      take_share_withdrawal_notices: {
        Args: { p_actor_user_id: number }
        Returns: {
          event_date: string
          event_name: string
          withdrawn_at: string
        }[]
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
