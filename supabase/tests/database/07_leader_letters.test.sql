-- Leader letters: thresholds and the L8 singling-out suppression
-- (docs/DATA_DISCLOSURE.md section 10.7 L8, D15; migration 20261014230600).
-- Seed: student 20 (account uid 6) leads Homeroom A (19 other members). The Kindness column is shown,
-- the Effort cohort is below the 30-student floor, so its column is hidden.
begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

create function pg_temp.uid(n integer) returns bigint language sql as $$
  select id from public."user" where supabase_id = ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
$$;

-- Letter thresholds (share of the cohort strictly below).
select results_eq(
  $$ select public.letter_for_share_below(p)::text from unnest(array[1, 0.93, 0.9299, 0.75, 0.7499, 0.57, 0.5699, 0.39, 0.3899, 0.20, 0.1999, 0]::numeric[]) with ordinality as t(p, o) order by o $$,
  $$ values ('S'), ('S'), ('A'), ('A'), ('B'), ('B'), ('C'), ('C'), ('D'), ('D'), ('E'), ('E') $$,
  'letter_for_share_below: S>=.93, A>=.75, B>=.57, C>=.39, D>=.20, else E'
);

-- Seed leader.
select is((select count(*) from public.get_leader_group_letters(pg_temp.uid(6))), 38::bigint, '19 members x 2 point-group columns');
select is((select count(distinct member_first_name) from public.get_leader_group_letters(pg_temp.uid(6))), 19::bigint, 'the leader is not listed among the members');
select is((select count(*) from public.get_leader_group_letters(pg_temp.uid(6)) where member_first_name = 'Uma'), 0::bigint, 'only the leader''s own group is returned');
select is((select count(*) from public.get_leader_group_letters(pg_temp.uid(6)) where point_group_name = 'Attendance'), 0::bigint, 'unranked point groups are not columns');
select is(
  (select count(*) from public.get_leader_group_letters(pg_temp.uid(6)) where point_group_name = 'Kindness' and letter in ('S', 'A', 'B', 'C', 'D', 'E')),
  19::bigint, 'Kindness letters are shown for every member');
select is(
  (select count(*) from public.get_leader_group_letters(pg_temp.uid(6)) where point_group_name = 'Effort' and letter is not null),
  0::bigint, 'Effort (cohort below 30) shows no letters');
-- Not a leader, not a student: nothing.
select is((select count(*) from public.get_leader_group_letters(pg_temp.uid(5))), 0::bigint, 'a student who leads nothing gets nothing');
select is((select count(*) from public.get_leader_group_letters(pg_temp.uid(1))), 0::bigint, 'an admin gets nothing');
select is((select count(*) from public.get_leader_group_letters(pg_temp.uid(9))), 0::bigint, 'a parent gets nothing');

-- Own letters: a member sees the leaders by first name and last initial, plus their own letter.
select results_eq(
  format($$ select group_name, leaders::text from public.get_own_led_letters(%s, 7) $$, pg_temp.uid(5)),
  $$ values ('Homeroom A', '[{"firstName": "Theo", "lastInitial": "E"}]') $$,
  'own letters name the leader as first name plus initial');
select is((select count(*) from public.get_own_led_letters(pg_temp.uid(9), 7)), 1::bigint, 'a linked parent sees the same');
select is((select count(*) from public.get_own_led_letters(pg_temp.uid(9), 8)), 0::bigint, 'a parent sees nothing for an unlinked child');

-- ---------------------------------------------------------------------------------------------
-- L8 on a synthetic school. 32 ranked students with totals 1..32 (rank i = total i):
--   ranks 1-7 are E, 8-13 are D, 14-18 C, 19-24 B, 25-30 A, 31-32 S.
-- ---------------------------------------------------------------------------------------------
create function pg_temp.led(p_member_ranks integer[], p_nonparticipants integer default 0)
returns table (n_rows bigint, n_shown bigint)
language plpgsql as $$
declare
  _s bigint; _tf bigint; _g bigint; _tpl bigint; _ev bigint; _pg bigint; _lg bigint; _uuid uuid; _user bigint;
  _stu bigint; _leader bigint; i integer; ids bigint[] := '{}';
begin
  insert into public.school (name) values ('Synthetic ' || gen_random_uuid()) returning id into _s;
  insert into public.point_group (name, school_id, ranked) values ('PG', _s, true) returning id into _pg;
  insert into public.school_timeframes (school_id, name, starts_at, ends_at, active)
    values (_s, 'T', now() - interval '10 days', now() + interval '10 days', true) returning id into _tf;
  insert into public.student_group (name, school_id, timeframe_id) values ('Cohort', _s, _tf) returning id into _g;
  insert into public.student_group (name, school_id, timeframe_id) values ('Led', _s, _tf) returning id into _lg;
  insert into public.point_template (name, template_type_id, point_group_id, student_group_id, conversion_rule_value, max_input_value)
    values ('T', 1, _pg, _g, 1, 100) returning id into _tpl;
  insert into public.point_event (template_id, student_group_id, date, name, max_input, point_group_id)
    values (_tpl, _g, now() - interval '2 days', 'E', 100, _pg) returning id into _ev;
  for i in 1 .. 32 loop
    insert into public.student (school_id, powerschool_id, first_name, last_name, grade)
      values (_s, 300000 + i, 'R' || lpad(i::text, 2, '0'), 'Synthetic', 6) returning id into _stu;
    ids := ids || _stu;
    insert into public.student_point (student_id, point_event_id, point_value) values (_stu, _ev, i);
  end loop;
  foreach i in array p_member_ranks loop
    insert into public.student_group_pair (student_id, student_group_id) values (ids[i], _lg);
  end loop;
  for i in 1 .. p_nonparticipants loop
    insert into public.student (school_id, powerschool_id, first_name, last_name, grade)
      values (_s, 400000 + i, 'N' || lpad(i::text, 2, '0'), 'Synthetic', 6) returning id into _stu;
    insert into public.student_group_pair (student_id, student_group_id) values (_stu, _lg);
  end loop;
  insert into public.student (school_id, powerschool_id, first_name, last_name, grade)
    values (_s, 500000, 'Lead', 'Synthetic', 6) returning id into _leader;
  insert into public.student_group_pair (student_id, student_group_id) values (_leader, _lg);
  insert into public.student_group_leaders (student_id, group_id) values (_leader, _lg);
  _uuid := gen_random_uuid();
  insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, phone_change, phone_change_token, reauthentication_token)
    values ('00000000-0000-0000-0000-000000000000', _uuid, 'authenticated', 'authenticated', _uuid || '@example.test', now(), now(), '{}', '{}', '', '', '', '', '', '', '', '');
  select id into _user from public."user" where supabase_id = _uuid;
  update public.student set "linkedUser" = _user where id = _leader;
  return query
    select count(*), count(*) filter (where letter is not null)
    from public.get_leader_group_letters(_user);
end;
$$;

select results_eq($$ select * from pg_temp.led(array[14, 15, 16, 17, 18, 19]) $$, $$ values (6::bigint, 6::bigint) $$,
  '6 members, none D or E: the column is shown');
select results_eq($$ select * from pg_temp.led(array[14, 15, 16, 17, 18]) $$, $$ values (5::bigint, 0::bigint) $$,
  'L8(a): 5 members is below the floor of 6, hidden');
select results_eq($$ select * from pg_temp.led(array[14, 15, 16, 17, 18, 1]) $$, $$ values (6::bigint, 0::bigint) $$,
  'L8(b): exactly one E hides the column');
select results_eq($$ select * from pg_temp.led(array[14, 15, 16, 17, 1, 2]) $$, $$ values (6::bigint, 0::bigint) $$,
  'L8(b): exactly two E hide the column');
select results_eq($$ select * from pg_temp.led(array[14, 15, 16, 1, 2, 3]) $$, $$ values (6::bigint, 6::bigint) $$,
  'L8(b): three E are a crowd, the column is shown');
select results_eq($$ select * from pg_temp.led(array[14, 15, 16, 17, 18, 8]) $$, $$ values (6::bigint, 0::bigint) $$,
  'L8(b): exactly one D hides the column');
select results_eq($$ select * from pg_temp.led(array[14, 15, 16, 8, 9, 10]) $$, $$ values (6::bigint, 6::bigint) $$,
  'L8(b): three D are shown');
select results_eq($$ select * from pg_temp.led(array[14, 15, 16], 3) $$, $$ values (6::bigint, 0::bigint) $$,
  'L8(c): 3 of 6 participated is not more than half, hidden (the 3 non-participants are E)');
select results_eq($$ select * from pg_temp.led(array[14, 15, 16, 17, 18], 1) $$, $$ values (6::bigint, 0::bigint) $$,
  'a lone non-participant is a lone E, hidden by L8(b)');
select results_eq($$ select * from pg_temp.led(array[14, 15, 16, 17], 3) $$, $$ values (7::bigint, 7::bigint) $$,
  '4 of 7 participated and 3 E: shown');

select * from finish();
rollback;
