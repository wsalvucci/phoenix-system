-- Function and table grants (docs/DATA_DISCLOSURE.md, migration 20261014223115).
-- anon may execute nothing in public. authenticated may execute exactly the allowed list below.
-- Table writes: migration 20261014230655 (D21).
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' and has_function_privilege('anon', p.oid, 'execute')),
  0::bigint,
  'anon can execute no function in schema public'
);

select is(
  (select coalesce(string_agg(p.proname, ',' order by p.proname), '')
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and has_function_privilege('authenticated', p.oid, 'execute')),
  'get_active_timeframe,get_all_timeframes,get_available_leaderboard_scopes,get_category_breakdown,'
  || 'get_dashboard_totals,get_grade_leaderboard,get_my_groups,get_my_visibility_snapshot,'
  || 'get_point_group_leaderboard,get_point_history,get_ranking_group_leaderboard,'
  || 'get_school_leaderboard,get_student_group_leaderboard',
  'authenticated can execute exactly the 13 student-facing RPCs'
);

select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' and not has_function_privilege('service_role', p.oid, 'execute')),
  0::bigint,
  'service_role can execute every public function'
);

select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('display_cut', 'points_to_next_rank', 'redeem_link_code',
      'preview_link_code', 'get_leader_group_letters', 'get_own_led_letters', 'get_led_group_member_points',
      'refresh_leader_letters', 'display_pairing_start', 'display_pairing_claim', 'display_device_resolve')
      and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))),
  0::bigint,
  'the cut, link-code, letter and display RPCs are service_role only'
);

select is(
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name in ('display_device', 'display_pairing_request', 'link_attempt',
      'parent_link_revocation', 'leader_letter', 'leader_letter_run', 'shared_point_withdrawal', 'scorebook_event_copy_operation')
      and (has_table_privilege('anon', table_schema || '.' || table_name, 'select')
        or has_table_privilege('authenticated', table_schema || '.' || table_name, 'select'))),
  0::bigint,
  'server-only tables have no select grant for anon or authenticated'
);

select is(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0::bigint,
  'row level security is enabled on every public table'
);

-- D21 (docs/schema/BACKEND_PLAN.md section 12), migration 20261014230655: no API role writes a table.
select is(
  (select coalesce(string_agg(r.rolname || ' ' || c.relname, ',' order by 1), '')
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
     cross join (values ('anon'), ('authenticated')) as r(rolname)
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
      and (has_table_privilege(r.rolname, c.oid, 'insert') or has_table_privilege(r.rolname, c.oid, 'update')
        or has_table_privilege(r.rolname, c.oid, 'delete') or has_table_privilege(r.rolname, c.oid, 'truncate')
        or has_table_privilege(r.rolname, c.oid, 'references') or has_table_privilege(r.rolname, c.oid, 'trigger')
        or has_any_column_privilege(r.rolname, c.oid, 'insert') or has_any_column_privilege(r.rolname, c.oid, 'update'))),
  '',
  'anon and authenticated hold no write privilege on any public table'
);

select ok(
  not (has_table_privilege('anon', 'public.student_point', 'insert') or has_table_privilege('anon', 'public.point_event', 'update')
    or has_table_privilege('anon', 'public.user', 'update') or has_table_privilege('anon', 'public.student', 'delete')
    or has_table_privilege('authenticated', 'public.student_point', 'insert') or has_table_privilege('authenticated', 'public.point_event', 'update')
    or has_table_privilege('authenticated', 'public.user', 'update') or has_table_privilege('authenticated', 'public.student', 'delete')),
  'core tables student_point, point_event, user, student are not writable by anon or authenticated'
);

select is(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'S'
      and (has_sequence_privilege('anon', c.oid, 'usage') or has_sequence_privilege('anon', c.oid, 'update')
        or has_sequence_privilege('authenticated', c.oid, 'usage') or has_sequence_privilege('authenticated', c.oid, 'update'))),
  0::bigint,
  'anon and authenticated cannot use or advance any public sequence'
);

select is(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and not (has_table_privilege('service_role', c.oid, 'select') and has_table_privilege('service_role', c.oid, 'insert')
        and has_table_privilege('service_role', c.oid, 'update') and has_table_privilege('service_role', c.oid, 'delete'))),
  0::bigint,
  'service_role keeps select, insert, update and delete on every public table'
);

-- A table a later migration creates (as postgres) is born without API-role write grants.
create table public.__grants_probe (id bigint generated always as identity primary key, v int);
select ok(
  not (has_table_privilege('anon', 'public.__grants_probe', 'insert') or has_table_privilege('authenticated', 'public.__grants_probe', 'insert')
    or has_table_privilege('authenticated', 'public.__grants_probe', 'update') or has_table_privilege('authenticated', 'public.__grants_probe', 'delete')
    or has_sequence_privilege('authenticated', pg_get_serial_sequence('public.__grants_probe', 'id'), 'usage')),
  'default privileges: a new public table and its sequence get no write grant for anon or authenticated'
);

-- D21: RLS is a deny-all backstop. These are the only policies, and none can match for an API role
-- because each one subqueries public.user, which has no policy. Adding a policy is an architecture
-- change: update BACKEND_PLAN section 12 and this list together.
select is(
  (select string_agg(tablename || ':' || policyname, ',' order by tablename, policyname) from pg_policies where schemaname = 'public'),
  'class:Admins Can Manage Classes in Their School,'
  || 'point_group:Admins Can Manage Point Groups in Their School,'
  || 'ranking_group:Admins Can Manage Ranking Groups in Their School,'
  || 'student:Admins Can Manage Students in Their Schools,'
  || 'student_class_pair:Admins Can Manage Student Class Pairs in Their Schools,'
  || 'student_group_pair:Admins Can Manage Student Group Pairs in Their School,'
  || 'student_group_pair:Teachers Can See Students in Their Groups,'
  || 'teacher_student_group_pair:Admins Can Manage Teacher Student Group Pairs in School,'
  || 'teacher_student_group_pair:Teachers Can See Group Pairs They''re Assigned',
  'the policy set is exactly the 9 inert legacy policies (D21 deny-all)'
);

select is(
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'user'),
  0::bigint,
  'public.user has no policy, so every legacy policy that subqueries it matches nothing'
);

select ok(
  not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef and (p.proconfig is null or not exists (
      select 1 from unnest(p.proconfig) c where c like 'search_path=%'))),
  'every SECURITY DEFINER function pins search_path'
);

select * from finish();
rollback;
