-- Function and table grants (docs/DATA_DISCLOSURE.md, migration 20261014223115).
-- anon may execute nothing in public. authenticated may execute exactly the allowed list below.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

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

select todo_start('KNOWN GAP for backend: Supabase default privileges give anon write grants on public tables; RLS is the only guard');
select is(
  (select count(*) from information_schema.tables
    where table_schema = 'public'
      and (has_table_privilege('anon', table_schema || '.' || table_name, 'insert')
        or has_table_privilege('anon', table_schema || '.' || table_name, 'update')
        or has_table_privilege('anon', table_schema || '.' || table_name, 'delete'))
      and table_name in ('student_point', 'point_event', 'user', 'student')),
  0::bigint,
  'anon holds no write grant on core tables'
);
select todo_end();

select ok(
  not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef and (p.proconfig is null or not exists (
      select 1 from unnest(p.proconfig) c where c like 'search_path=%'))),
  'every SECURITY DEFINER function pins search_path'
);

select * from finish();
rollback;
