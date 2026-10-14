-- URGENT security fix: function EXECUTE grants, search_path, two broken admin functions,
-- one broken policy.
--
-- Safe to apply on its own, ahead of every other 2026-10-14 migration. It changes no table, column
-- or row. The only policy it touches is on public.student_class_pair, which is a legacy table with 0
-- rows.
--
-- Why the live grants are wrong: Postgres grants EXECUTE on every new function to PUBLIC, and
-- Supabase adds anon, authenticated and service_role through default privileges. The mobile app's
-- migrations ran "REVOKE ... FROM anon", but anon is a member of PUBLIC, so anon kept EXECUTE. Every
-- grant below therefore revokes from PUBLIC as well as from the named roles.
--
-- Who calls what (grepped 2026-10-14 in phoenix-system and every sibling repository):
--   * Web app (phoenix-system): only duplicate_scorebook_events and edit_scorebook_point_event,
--     both through supabaseServiceClient (service_role). Both are already service_role only.
--   * Phoenix Student Mobile (Kotlin, anon key plus the student's JWT, so the authenticated role):
--     14 student-facing RPCs, listed in section 4. Each resolves the caller with auth.uid() and keeps
--     EXECUTE for authenticated.
--   * No caller anywhere for create_school_and_pair_admin, the *_as_admin family, add_*/remove_*,
--     create_group, update_student_data, get_school, get_own_*, or the internal helpers. All of
--     these become service_role only. SECURITY DEFINER functions that call the helpers run as the
--     function owner, so the internal calls keep working.

-- ---------------------------------------------------------------------------------------------
-- 1. create_school_and_pair_admin: anyone holding the anon key could create a school and attach it
--    to any admin id. Rewritten to require that the caller IS that admin, and (section 4) made
--    service_role only. It has no caller, so it is now unreachable. Dropping it is proposed in
--    docs/schema/BACKEND_PLAN.md and is not done here.
-- ---------------------------------------------------------------------------------------------
create or replace function public.create_school_and_pair_admin(admin_id integer, school_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_school_id bigint;
begin
  if not exists (
    select 1
    from public."user" u
    where u.supabase_id = auth.uid()
      and u.admin_id = create_school_and_pair_admin.admin_id
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if school_name is null or btrim(school_name) = '' then
    raise exception 'Invalid school_name: must not be null or empty';
  end if;

  insert into public.school (name) values (btrim(school_name)) returning id into new_school_id;
  insert into public.admin_school_pair (admin_id, school_id)
  values (create_school_and_pair_admin.admin_id, new_school_id);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 2. Parameter shadowing. In "point_group.school_id = school_id" the unqualified name resolved to
--    the column, so the filter was always true and every group in all of the admin's schools came
--    back. The parameter is now qualified with the function name. The signature is unchanged.
-- ---------------------------------------------------------------------------------------------
create or replace function public.get_point_groups_as_admin(school_id integer)
returns setof public.point_group
language sql
security definer
set search_path = ''
as $$
  select pg.*
  from public.point_group pg
  where pg.school_id = get_point_groups_as_admin.school_id
    and pg.school_id in (select s.id from public.get_schools_as_admin() s)
$$;

create or replace function public.get_student_groups_as_admin(school_id integer)
returns setof public.student_group
language sql
security definer
set search_path = ''
as $$
  select sg.*
  from public.student_group sg
  where sg.school_id = get_student_groups_as_admin.school_id
    and sg.school_id in (select s.id from public.get_schools_as_admin() s)
$$;

-- get_school had the same shape. It happened to be correct, because school has no school_id
-- column, but it gets the same qualification so a future column cannot silently break it.
create or replace function public.get_school(school_id integer)
returns setof public.school
language sql
security definer
set search_path = ''
as $$
  select sc.*
  from public.school sc
  where sc.id = get_school.school_id
    and sc.id in (select s.id from public.get_schools_as_admin() s)
$$;

-- ---------------------------------------------------------------------------------------------
-- 3. Pin search_path on every function that does not already set it. The live bodies use
--    unqualified names, so they get "public, pg_temp" (the pattern the Postgres docs recommend for
--    SECURITY DEFINER), not ''. Listing pg_temp last stops a temporary object from shadowing a
--    public one. Functions created or rewritten with search_path = '' are not listed here.
-- ---------------------------------------------------------------------------------------------
alter function public.add_student_group(bigint, text, bigint) set search_path = public, pg_temp;
alter function public.add_student_to_student_group(bigint, bigint) set search_path = public, pg_temp;
alter function public.add_teacher_to_student_group(integer, integer) set search_path = public, pg_temp;
alter function public.auth_current_student() set search_path = public, pg_temp;
alter function public.check_admin_access_to_school(bigint) set search_path = public, pg_temp;
alter function public.check_admin_access_to_student(bigint) set search_path = public, pg_temp;
alter function public.check_admin_access_to_student_group(bigint) set search_path = public, pg_temp;
alter function public.check_admin_access_to_teacher(integer) set search_path = public, pg_temp;
alter function public.create_group(integer, text, integer) set search_path = public, pg_temp;
alter function public.get_active_timeframe() set search_path = public, pg_temp;
alter function public.get_all_timeframes() set search_path = public, pg_temp;
alter function public.get_available_leaderboard_scopes(bigint) set search_path = public, pg_temp;
alter function public.get_category_breakdown(bigint) set search_path = public, pg_temp;
alter function public.get_dashboard_totals(bigint) set search_path = public, pg_temp;
alter function public.get_grade_leaderboard(bigint, bigint) set search_path = public, pg_temp;
alter function public.get_led_group_member_points(bigint, bigint) set search_path = public, pg_temp;
alter function public.get_my_groups(bigint) set search_path = public, pg_temp;
alter function public.get_my_visibility_snapshot(bigint) set search_path = public, pg_temp;
alter function public.get_own_admin_data() set search_path = public, pg_temp;
alter function public.get_own_teacher_data() set search_path = public, pg_temp;
alter function public.get_point_group_leaderboard(bigint, bigint) set search_path = public, pg_temp;
alter function public.get_point_history(bigint, integer, integer) set search_path = public, pg_temp;
alter function public.get_ranking_group_leaderboard(bigint, bigint) set search_path = public, pg_temp;
alter function public.get_school_leaderboard(bigint) set search_path = public, pg_temp;
alter function public.get_school_student_as_admin(integer, integer) set search_path = public, pg_temp;
alter function public.get_school_students_as_admin(integer) set search_path = public, pg_temp;
alter function public.get_school_teacher_as_admin(integer, integer) set search_path = public, pg_temp;
alter function public.get_school_teachers_as_admin(integer) set search_path = public, pg_temp;
alter function public.get_schools_as_admin() set search_path = public, pg_temp;
alter function public.get_student_group_as_admin(integer, integer) set search_path = public, pg_temp;
alter function public.get_student_group_leaderboard(bigint, bigint) set search_path = public, pg_temp;
alter function public.get_student_group_students_as_admin(integer, integer) set search_path = public, pg_temp;
alter function public.get_user_data() set search_path = public, pg_temp;
alter function public.remove_student_from_student_group(bigint, bigint) set search_path = public, pg_temp;
alter function public.remove_teacher_from_student_group(integer, integer, integer) set search_path = public, pg_temp;
alter function public.timeframe_bounds(bigint) set search_path = public, pg_temp;
alter function public.update_student_data(bigint, text, text, date, bigint, text) set search_path = public, pg_temp;
-- Not SECURITY DEFINER, but flagged by the same linter rule. Pure functions, so '' is safe.
alter function public.visibility_change_cutoff(timestamptz, timestamptz, integer) set search_path = '';
alter function public.visibility_config() set search_path = '';

-- ---------------------------------------------------------------------------------------------
-- 4. EXECUTE grants. First take EXECUTE away from PUBLIC, anon and authenticated on every public
--    function. Then grant back exactly what is needed.
-- ---------------------------------------------------------------------------------------------
revoke all on function public.add_student_group(bigint, text, bigint) from public, anon, authenticated;
revoke all on function public.add_student_to_student_group(bigint, bigint) from public, anon, authenticated;
revoke all on function public.add_teacher_to_student_group(integer, integer) from public, anon, authenticated;
revoke all on function public.auth_current_student() from public, anon, authenticated;
revoke all on function public.check_admin_access_to_school(bigint) from public, anon, authenticated;
revoke all on function public.check_admin_access_to_student(bigint) from public, anon, authenticated;
revoke all on function public.check_admin_access_to_student_group(bigint) from public, anon, authenticated;
revoke all on function public.check_admin_access_to_teacher(integer) from public, anon, authenticated;
revoke all on function public.create_group(integer, text, integer) from public, anon, authenticated;
revoke all on function public.create_school_and_pair_admin(integer, text) from public, anon, authenticated;
revoke all on function public.duplicate_scorebook_events(bigint, bigint, bigint, integer, text, bigint[], bigint, bigint[], uuid) from public, anon, authenticated;
revoke all on function public.edit_scorebook_point_event(bigint, bigint, timestamptz, text, bigint, text, bigint, jsonb) from public, anon, authenticated;
revoke all on function public.get_active_timeframe() from public, anon, authenticated;
revoke all on function public.get_all_timeframes() from public, anon, authenticated;
revoke all on function public.get_available_leaderboard_scopes(bigint) from public, anon, authenticated;
revoke all on function public.get_category_breakdown(bigint) from public, anon, authenticated;
revoke all on function public.get_dashboard_totals(bigint) from public, anon, authenticated;
revoke all on function public.get_grade_leaderboard(bigint, bigint) from public, anon, authenticated;
revoke all on function public.get_led_group_member_points(bigint, bigint) from public, anon, authenticated;
revoke all on function public.get_my_groups(bigint) from public, anon, authenticated;
revoke all on function public.get_my_visibility_snapshot(bigint) from public, anon, authenticated;
revoke all on function public.get_own_admin_data() from public, anon, authenticated;
revoke all on function public.get_own_teacher_data() from public, anon, authenticated;
revoke all on function public.get_point_group_leaderboard(bigint, bigint) from public, anon, authenticated;
revoke all on function public.get_point_groups_as_admin(integer) from public, anon, authenticated;
revoke all on function public.get_point_history(bigint, integer, integer) from public, anon, authenticated;
revoke all on function public.get_ranking_group_leaderboard(bigint, bigint) from public, anon, authenticated;
revoke all on function public.get_school(integer) from public, anon, authenticated;
revoke all on function public.get_school_leaderboard(bigint) from public, anon, authenticated;
revoke all on function public.get_school_student_as_admin(integer, integer) from public, anon, authenticated;
revoke all on function public.get_school_students_as_admin(integer) from public, anon, authenticated;
revoke all on function public.get_school_teacher_as_admin(integer, integer) from public, anon, authenticated;
revoke all on function public.get_school_teachers_as_admin(integer) from public, anon, authenticated;
revoke all on function public.get_schools_as_admin() from public, anon, authenticated;
revoke all on function public.get_student_group_as_admin(integer, integer) from public, anon, authenticated;
revoke all on function public.get_student_group_leaderboard(bigint, bigint) from public, anon, authenticated;
revoke all on function public.get_student_group_students_as_admin(integer, integer) from public, anon, authenticated;
revoke all on function public.get_student_groups_as_admin(integer) from public, anon, authenticated;
revoke all on function public.get_user_data() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.remove_student_from_student_group(bigint, bigint) from public, anon, authenticated;
revoke all on function public.remove_teacher_from_student_group(integer, integer, integer) from public, anon, authenticated;
revoke all on function public.timeframe_bounds(bigint) from public, anon, authenticated;
revoke all on function public.update_student_data(bigint, text, text, date, bigint, text) from public, anon, authenticated;
revoke all on function public.visibility_change_cutoff(timestamptz, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.visibility_config() from public, anon, authenticated;

-- service_role keeps everything. It is the role the web app's server code uses, and it already
-- bypasses RLS.
grant execute on all functions in schema public to service_role;

-- Live callers in Phoenix Student Mobile, signed in as a student (authenticated). Each function
-- resolves the student from auth.uid() through auth_current_student() or "user".supabase_id and
-- returns nothing for a non-student. NOTE: the payloads of several of these are open disclosure
-- findings (docs/schema/BACKEND_PLAN.md section 1.4). Grants are kept so the mobile app keeps
-- working until the product owner rules.
grant execute on function public.get_active_timeframe() to authenticated;
grant execute on function public.get_all_timeframes() to authenticated;
grant execute on function public.get_available_leaderboard_scopes(bigint) to authenticated;
grant execute on function public.get_category_breakdown(bigint) to authenticated;
grant execute on function public.get_dashboard_totals(bigint) to authenticated;
grant execute on function public.get_grade_leaderboard(bigint, bigint) to authenticated;
grant execute on function public.get_led_group_member_points(bigint, bigint) to authenticated;
grant execute on function public.get_my_groups(bigint) to authenticated;
grant execute on function public.get_my_visibility_snapshot(bigint) to authenticated;
grant execute on function public.get_point_group_leaderboard(bigint, bigint) to authenticated;
grant execute on function public.get_point_history(bigint, integer, integer) to authenticated;
grant execute on function public.get_ranking_group_leaderboard(bigint, bigint) to authenticated;
grant execute on function public.get_school_leaderboard(bigint) to authenticated;
grant execute on function public.get_student_group_leaderboard(bigint, bigint) to authenticated;

-- handle_new_user is a trigger on auth.users. Postgres checks EXECUTE when the trigger is created,
-- not when it fires, so no API role needs it. The auth service's role is granted it explicitly
-- anyway, so that sign-up cannot depend on that detail.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.handle_new_user() to supabase_auth_admin;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 5. student_class_pair policy. The live policy never referenced the row's own columns, so it
--    passed for any admin of any school. The replacement requires that the row's class AND the
--    row's student both belong to a school the caller administers, and adds WITH CHECK so a write
--    cannot plant a cross-school row. It is scoped TO authenticated instead of public. The table
--    has 0 rows and no caller, so this narrows access and changes nothing visible.
-- ---------------------------------------------------------------------------------------------
drop policy if exists "Admins Can Manage Student Class Pairs in Their Schools" on public.student_class_pair;

create policy "Admins Can Manage Student Class Pairs in Their Schools"
  on public.student_class_pair
  as permissive
  for all
  to authenticated
  using (
    exists (
      select 1
      from public."user" u
      join public.admin_school_pair asp on asp.admin_id = u.admin_id
      join public.class c on c.school_id = asp.school_id and c.id = student_class_pair.class_id
      join public.student s on s.school_id = asp.school_id and s.id = student_class_pair.student_id
      where u.supabase_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public."user" u
      join public.admin_school_pair asp on asp.admin_id = u.admin_id
      join public.class c on c.school_id = asp.school_id and c.id = student_class_pair.class_id
      join public.student s on s.school_id = asp.school_id and s.id = student_class_pair.student_id
      where u.supabase_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------------------------
-- 6. Self-check. Abort the whole migration (it runs in one transaction) if anything above did not
--    take effect, or if production has a function this file did not list.
-- ---------------------------------------------------------------------------------------------
do $$
declare
  _bad text;
begin
  select string_agg(p.oid::regprocedure::text, ', ' order by 1)
  into _bad
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prokind = 'f'
    and has_function_privilege('anon', p.oid, 'execute');
  if _bad is not null then
    raise exception 'anon can still execute: %', _bad;
  end if;

  select string_agg(p.oid::regprocedure::text, ', ' order by 1)
  into _bad
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prokind = 'f'
    and not exists (
      select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) as c(setting)
      where c.setting like 'search_path=%'
    );
  if _bad is not null then
    raise exception 'search_path is not pinned on: %', _bad;
  end if;

  select string_agg(p.oid::regprocedure::text, ', ' order by 1)
  into _bad
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prokind = 'f'
    and has_function_privilege('authenticated', p.oid, 'execute')
    and p.proname not in (
      'get_active_timeframe', 'get_all_timeframes', 'get_available_leaderboard_scopes',
      'get_category_breakdown', 'get_dashboard_totals', 'get_grade_leaderboard',
      'get_led_group_member_points', 'get_my_groups', 'get_my_visibility_snapshot',
      'get_point_group_leaderboard', 'get_point_history', 'get_ranking_group_leaderboard',
      'get_school_leaderboard', 'get_student_group_leaderboard'
    );
  if _bad is not null then
    raise exception 'authenticated can execute a function it should not: %', _bad;
  end if;
end;
$$;
