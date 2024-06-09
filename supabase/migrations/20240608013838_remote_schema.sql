alter table "public"."admin" drop constraint "admin_schoolId_fkey";

create table "public"."admin_school_pair" (
    "created_at" timestamp with time zone not null default now(),
    "admin_id" bigint not null,
    "school_id" bigint not null
);


alter table "public"."admin_school_pair" enable row level security;

alter table "public"."admin" drop column "school_id";

CREATE UNIQUE INDEX admin_school_pair_pkey ON public.admin_school_pair USING btree (admin_id, school_id);

alter table "public"."admin_school_pair" add constraint "admin_school_pair_pkey" PRIMARY KEY using index "admin_school_pair_pkey";

alter table "public"."admin_school_pair" add constraint "admin_school_pair_admin_id_fkey" FOREIGN KEY (admin_id) REFERENCES admin(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."admin_school_pair" validate constraint "admin_school_pair_admin_id_fkey";

alter table "public"."admin_school_pair" add constraint "admin_school_pair_school_id_fkey" FOREIGN KEY (school_id) REFERENCES school(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."admin_school_pair" validate constraint "admin_school_pair_school_id_fkey";

grant delete on table "public"."admin_school_pair" to "anon";

grant insert on table "public"."admin_school_pair" to "anon";

grant references on table "public"."admin_school_pair" to "anon";

grant select on table "public"."admin_school_pair" to "anon";

grant trigger on table "public"."admin_school_pair" to "anon";

grant truncate on table "public"."admin_school_pair" to "anon";

grant update on table "public"."admin_school_pair" to "anon";

grant delete on table "public"."admin_school_pair" to "authenticated";

grant insert on table "public"."admin_school_pair" to "authenticated";

grant references on table "public"."admin_school_pair" to "authenticated";

grant select on table "public"."admin_school_pair" to "authenticated";

grant trigger on table "public"."admin_school_pair" to "authenticated";

grant truncate on table "public"."admin_school_pair" to "authenticated";

grant update on table "public"."admin_school_pair" to "authenticated";

grant delete on table "public"."admin_school_pair" to "service_role";

grant insert on table "public"."admin_school_pair" to "service_role";

grant references on table "public"."admin_school_pair" to "service_role";

grant select on table "public"."admin_school_pair" to "service_role";

grant trigger on table "public"."admin_school_pair" to "service_role";

grant truncate on table "public"."admin_school_pair" to "service_role";

grant update on table "public"."admin_school_pair" to "service_role";

create policy "Admins Can See Own Admin Data"
on "public"."admin"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM "user"
  WHERE (("user".supabase_id = auth.uid()) AND ("user".admin_id = "user".id)))));


create policy "Admins Can Update Their Data"
on "public"."admin"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM "user"
  WHERE (("user".supabase_id = auth.uid()) AND ("user".admin_id = "user".id)))));


create policy "Admins Can Create Their School Data"
on "public"."school"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM ("user"
     JOIN admin ON ((admin.id = "user".admin_id)))
  WHERE ("user".supabase_id = auth.uid()))));


create policy "Users View Own Data"
on "public"."user"
as permissive
for select
to public
using ((( SELECT auth.uid() AS uid) = supabase_id));



