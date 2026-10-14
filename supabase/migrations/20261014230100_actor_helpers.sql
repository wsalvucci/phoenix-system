-- Actor helpers used by the 2026-10-14 RPCs. Additive.
-- The "actor" is "user".id. The web server resolves it from the Supabase session and never takes it
-- from the browser. Each RPC re-checks the actor with these helpers (defence in depth on top of the
-- server action's own check). Service_role only: they answer authorization questions about any user,
-- so no API role may call them.

-- ---------------------------------------------------------------------------------------------
create or replace function public.is_admin_of_school(p_user_id bigint, p_school_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public."user" u
    join public.admin_school_pair asp on asp.admin_id = u.admin_id
    where u.id = p_user_id and asp.school_id = p_school_id
  );
$$;

-- Same rule as staffAccess.ts getCallerAccess: admin via admin_school_pair, teacher via
-- teacher.linked_user.
create or replace function public.is_staff_of_school(p_user_id bigint, p_school_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin_of_school(p_user_id, p_school_id)
      or exists (
        select 1 from public.teacher t
        where t.linked_user = p_user_id and t.school_id = p_school_id
      );
$$;

-- Own account (student."linkedUser", as the web app links it) or a linked parent (user_student_pair).
create or replace function public.can_view_student(p_user_id bigint, p_student_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.student s where s.id = p_student_id and s."linkedUser" = p_user_id)
      or exists (select 1 from public.user_student_pair usp where usp.user_id = p_user_id and usp.student_id = p_student_id);
$$;


revoke all on function public.is_admin_of_school(bigint, bigint) from public, anon, authenticated;
revoke all on function public.is_staff_of_school(bigint, bigint) from public, anon, authenticated;
revoke all on function public.can_view_student(bigint, bigint) from public, anon, authenticated;
grant execute on function public.is_admin_of_school(bigint, bigint) to service_role;
grant execute on function public.is_staff_of_school(bigint, bigint) to service_role;
grant execute on function public.can_view_student(bigint, bigint) to service_role;
