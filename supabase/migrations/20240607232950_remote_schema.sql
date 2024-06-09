alter table "public"."user" drop constraint "user_supabaseId_fkey";

alter table "public"."admin" drop constraint "admin_schoolId_fkey";

alter table "public"."class" drop constraint "class_schoolId_fkey";

alter table "public"."point_conversion_rule" drop constraint "point_conversion_rule_teacherId_fkey";

alter table "public"."point_group" drop constraint "point_group_parentId_fkey";

alter table "public"."point_template" drop constraint "point_template_classId_fkey";

alter table "public"."point_template" drop constraint "point_template_conversionRuleId_fkey";

alter table "public"."point_template" drop constraint "point_template_pointGroupId_fkey";

alter table "public"."point_template" drop constraint "point_template_templateTypeId_fkey";

alter table "public"."school_point_group_pair" drop constraint "school_point_group_pair_pointGroupId_fkey";

alter table "public"."school_point_group_pair" drop constraint "school_point_group_pair_schoolId_fkey";

alter table "public"."student" drop constraint "student_schoolId_fkey";

alter table "public"."student_class_pair" drop constraint "student_class_pair_classId_fkey";

alter table "public"."student_class_pair" drop constraint "student_class_pair_studentId_fkey";

alter table "public"."student_group" drop constraint "student_group_parentId_fkey";

alter table "public"."student_group_pair" drop constraint "student_group_pair_studentGroupId_fkey";

alter table "public"."student_group_pair" drop constraint "student_group_pair_studentId_fkey";

alter table "public"."student_point" drop constraint "student_point_studentId_fkey";

alter table "public"."student_point" drop constraint "student_point_templateId_fkey";

alter table "public"."teacher" drop constraint "teacher_schoolId_fkey";

alter table "public"."teacher_class_pair" drop constraint "teacher_class_pair_classId_fkey";

alter table "public"."teacher_class_pair" drop constraint "teacher_class_pair_teacherId_fkey";

alter table "public"."user" drop constraint "user_adminId_fkey";

alter table "public"."user" drop constraint "user_studentId_fkey";

alter table "public"."user" drop constraint "user_teacherId_fkey";

alter table "public"."school_point_group_pair" drop constraint "school_point_group_pair_pkey";

alter table "public"."student_class_pair" drop constraint "student_class_pair_pkey";

alter table "public"."student_group_pair" drop constraint "student_group_pair_pkey";

alter table "public"."teacher_class_pair" drop constraint "teacher_class_pair_pkey";

drop index if exists "public"."school_point_group_pair_pkey";

drop index if exists "public"."student_class_pair_pkey";

drop index if exists "public"."student_group_pair_pkey";

drop index if exists "public"."teacher_class_pair_pkey";

alter table "public"."admin" drop column "schoolId";

alter table "public"."admin" add column "school_id" bigint;

alter table "public"."class" drop column "schoolId";

alter table "public"."class" add column "school_id" bigint not null;

alter table "public"."point_conversion_rule" drop column "teacherId";

alter table "public"."point_conversion_rule" add column "teacher_id" bigint not null;

alter table "public"."point_group" drop column "parentId";

alter table "public"."point_group" add column "parent_id" bigint;

alter table "public"."point_template" drop column "classId";

alter table "public"."point_template" drop column "conversionRuleId";

alter table "public"."point_template" drop column "pointGroupId";

alter table "public"."point_template" drop column "templateTypeId";

alter table "public"."point_template" add column "class_id" bigint not null;

alter table "public"."point_template" add column "conversion_rule_id" bigint;

alter table "public"."point_template" add column "point_group_id" bigint;

alter table "public"."point_template" add column "template_type_id" bigint;

alter table "public"."school_point_group_pair" drop column "pointGroupId";

alter table "public"."school_point_group_pair" drop column "schoolId";

alter table "public"."school_point_group_pair" add column "point_group_id" bigint not null;

alter table "public"."school_point_group_pair" add column "school_id" bigint not null;

alter table "public"."student" drop column "linkCode";

alter table "public"."student" drop column "schoolId";

alter table "public"."student" add column "link_code" character varying not null;

alter table "public"."student" add column "school_id" bigint not null;

alter table "public"."student_class_pair" drop column "classId";

alter table "public"."student_class_pair" drop column "studentId";

alter table "public"."student_class_pair" add column "class_id" bigint not null;

alter table "public"."student_class_pair" add column "student_id" bigint not null;

alter table "public"."student_group" drop column "parentId";

alter table "public"."student_group" add column "parent_id" bigint;

alter table "public"."student_group_pair" drop column "studentGroupId";

alter table "public"."student_group_pair" drop column "studentId";

alter table "public"."student_group_pair" add column "student_group_id" bigint not null;

alter table "public"."student_group_pair" add column "student_id" bigint not null;

alter table "public"."student_point" drop column "inputScore";

alter table "public"."student_point" drop column "pointValue";

alter table "public"."student_point" drop column "studentId";

alter table "public"."student_point" drop column "templateId";

alter table "public"."student_point" add column "input_score" bigint;

alter table "public"."student_point" add column "point_value" bigint not null;

alter table "public"."student_point" add column "student_id" bigint not null;

alter table "public"."student_point" add column "template_id" bigint;

alter table "public"."teacher" drop column "linkCode";

alter table "public"."teacher" drop column "schoolId";

alter table "public"."teacher" add column "link_code" character varying not null;

alter table "public"."teacher" add column "school_id" bigint not null;

alter table "public"."teacher_class_pair" drop column "classId";

alter table "public"."teacher_class_pair" drop column "teacherId";

alter table "public"."teacher_class_pair" add column "class_id" bigint not null;

alter table "public"."teacher_class_pair" add column "teacher_id" bigint not null;

alter table "public"."user" drop column "adminId";

alter table "public"."user" drop column "firstName";

alter table "public"."user" drop column "lastName";

alter table "public"."user" drop column "studentId";

alter table "public"."user" drop column "supabaseId";

alter table "public"."user" drop column "teacherId";

alter table "public"."user" add column "admin_id" bigint;

alter table "public"."user" add column "first_name" character varying;

alter table "public"."user" add column "last_name" character varying;

alter table "public"."user" add column "student_id" bigint;

alter table "public"."user" add column "supabase_id" uuid not null;

alter table "public"."user" add column "teacher_id" bigint;

CREATE UNIQUE INDEX school_point_group_pair_pkey ON public.school_point_group_pair USING btree (school_id, point_group_id);

CREATE UNIQUE INDEX student_class_pair_pkey ON public.student_class_pair USING btree (student_id, class_id);

CREATE UNIQUE INDEX student_group_pair_pkey ON public.student_group_pair USING btree (student_id, student_group_id);

CREATE UNIQUE INDEX teacher_class_pair_pkey ON public.teacher_class_pair USING btree (teacher_id, class_id);

alter table "public"."school_point_group_pair" add constraint "school_point_group_pair_pkey" PRIMARY KEY using index "school_point_group_pair_pkey";

alter table "public"."student_class_pair" add constraint "student_class_pair_pkey" PRIMARY KEY using index "student_class_pair_pkey";

alter table "public"."student_group_pair" add constraint "student_group_pair_pkey" PRIMARY KEY using index "student_group_pair_pkey";

alter table "public"."teacher_class_pair" add constraint "teacher_class_pair_pkey" PRIMARY KEY using index "teacher_class_pair_pkey";

alter table "public"."user" add constraint "user_supabaseid_fkey" FOREIGN KEY (supabase_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."user" validate constraint "user_supabaseid_fkey";

alter table "public"."admin" add constraint "admin_schoolId_fkey" FOREIGN KEY (school_id) REFERENCES school(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."admin" validate constraint "admin_schoolId_fkey";

alter table "public"."class" add constraint "class_schoolId_fkey" FOREIGN KEY (school_id) REFERENCES school(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."class" validate constraint "class_schoolId_fkey";

alter table "public"."point_conversion_rule" add constraint "point_conversion_rule_teacherId_fkey" FOREIGN KEY (teacher_id) REFERENCES teacher(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."point_conversion_rule" validate constraint "point_conversion_rule_teacherId_fkey";

alter table "public"."point_group" add constraint "point_group_parentId_fkey" FOREIGN KEY (parent_id) REFERENCES point_group(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."point_group" validate constraint "point_group_parentId_fkey";

alter table "public"."point_template" add constraint "point_template_classId_fkey" FOREIGN KEY (class_id) REFERENCES class(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."point_template" validate constraint "point_template_classId_fkey";

alter table "public"."point_template" add constraint "point_template_conversionRuleId_fkey" FOREIGN KEY (conversion_rule_id) REFERENCES point_conversion_rule(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."point_template" validate constraint "point_template_conversionRuleId_fkey";

alter table "public"."point_template" add constraint "point_template_pointGroupId_fkey" FOREIGN KEY (point_group_id) REFERENCES point_group(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."point_template" validate constraint "point_template_pointGroupId_fkey";

alter table "public"."point_template" add constraint "point_template_templateTypeId_fkey" FOREIGN KEY (template_type_id) REFERENCES point_template_type(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."point_template" validate constraint "point_template_templateTypeId_fkey";

alter table "public"."school_point_group_pair" add constraint "school_point_group_pair_pointGroupId_fkey" FOREIGN KEY (point_group_id) REFERENCES point_group(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."school_point_group_pair" validate constraint "school_point_group_pair_pointGroupId_fkey";

alter table "public"."school_point_group_pair" add constraint "school_point_group_pair_schoolId_fkey" FOREIGN KEY (school_id) REFERENCES school(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."school_point_group_pair" validate constraint "school_point_group_pair_schoolId_fkey";

alter table "public"."student" add constraint "student_schoolId_fkey" FOREIGN KEY (school_id) REFERENCES school(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."student" validate constraint "student_schoolId_fkey";

alter table "public"."student_class_pair" add constraint "student_class_pair_classId_fkey" FOREIGN KEY (class_id) REFERENCES class(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."student_class_pair" validate constraint "student_class_pair_classId_fkey";

alter table "public"."student_class_pair" add constraint "student_class_pair_studentId_fkey" FOREIGN KEY (student_id) REFERENCES student(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."student_class_pair" validate constraint "student_class_pair_studentId_fkey";

alter table "public"."student_group" add constraint "student_group_parentId_fkey" FOREIGN KEY (parent_id) REFERENCES student_group(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."student_group" validate constraint "student_group_parentId_fkey";

alter table "public"."student_group_pair" add constraint "student_group_pair_studentGroupId_fkey" FOREIGN KEY (student_group_id) REFERENCES student_group(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."student_group_pair" validate constraint "student_group_pair_studentGroupId_fkey";

alter table "public"."student_group_pair" add constraint "student_group_pair_studentId_fkey" FOREIGN KEY (student_id) REFERENCES student(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."student_group_pair" validate constraint "student_group_pair_studentId_fkey";

alter table "public"."student_point" add constraint "student_point_studentId_fkey" FOREIGN KEY (student_id) REFERENCES student(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."student_point" validate constraint "student_point_studentId_fkey";

alter table "public"."student_point" add constraint "student_point_templateId_fkey" FOREIGN KEY (template_id) REFERENCES point_template(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."student_point" validate constraint "student_point_templateId_fkey";

alter table "public"."teacher" add constraint "teacher_schoolId_fkey" FOREIGN KEY (school_id) REFERENCES school(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."teacher" validate constraint "teacher_schoolId_fkey";

alter table "public"."teacher_class_pair" add constraint "teacher_class_pair_classId_fkey" FOREIGN KEY (class_id) REFERENCES class(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."teacher_class_pair" validate constraint "teacher_class_pair_classId_fkey";

alter table "public"."teacher_class_pair" add constraint "teacher_class_pair_teacherId_fkey" FOREIGN KEY (teacher_id) REFERENCES teacher(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."teacher_class_pair" validate constraint "teacher_class_pair_teacherId_fkey";

alter table "public"."user" add constraint "user_adminId_fkey" FOREIGN KEY (admin_id) REFERENCES admin(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."user" validate constraint "user_adminId_fkey";

alter table "public"."user" add constraint "user_studentId_fkey" FOREIGN KEY (student_id) REFERENCES student(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."user" validate constraint "user_studentId_fkey";

alter table "public"."user" add constraint "user_teacherId_fkey" FOREIGN KEY (teacher_id) REFERENCES teacher(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."user" validate constraint "user_teacherId_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.user (supabase_id)
  values (new.id);
  return new;
end;
$function$
;


