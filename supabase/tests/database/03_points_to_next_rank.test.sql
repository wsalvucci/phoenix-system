-- points_to_next_rank: gaps only, cohort floors, actor rules (docs/DATA_DISCLOSURE.md section 10.2, D19).
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

create function pg_temp.uid(n integer) returns bigint language sql as $$
  select id from public."user" where supabase_id = ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
$$;

-- A throwaway school with one group and p_totals[i] points for student i. Student 1 is "owned" by the
-- returned user (student."linkedUser"). Returns (school, timeframe, owner user, owner student).
create function pg_temp.synth(p_totals integer[])
returns table (school_id bigint, timeframe_id bigint, owner_user bigint, owner_student bigint)
language plpgsql as $$
declare
  _s bigint; _tf bigint; _g bigint; _tpl bigint; _ev bigint; _user bigint; _stu bigint; _first bigint; _uuid uuid; i integer;
begin
  insert into public.school (name) values ('Synthetic ' || gen_random_uuid()) returning id into _s;
  insert into public.school_timeframes (school_id, name, starts_at, ends_at, active)
    values (_s, 'T', now() - interval '10 days', now() + interval '10 days', true) returning id into _tf;
  insert into public.student_group (name, school_id, timeframe_id) values ('G', _s, _tf) returning id into _g;
  insert into public.point_template (name, template_type_id, point_group_id, student_group_id, conversion_rule_value, max_input_value)
    values ('T', 1, 1, _g, 1, 100) returning id into _tpl;
  insert into public.point_event (template_id, student_group_id, date, name, max_input, point_group_id)
    values (_tpl, _g, now() - interval '1 day', 'E', 100, null) returning id into _ev;
  _uuid := gen_random_uuid();
  insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, phone_change, phone_change_token, reauthentication_token)
    values ('00000000-0000-0000-0000-000000000000', _uuid, 'authenticated', 'authenticated', _uuid || '@example.test', now(), now(), '{}', '{}', '', '', '', '', '', '', '', '');
  select id into _user from public."user" where supabase_id = _uuid;
  for i in 1 .. array_length(p_totals, 1) loop
    insert into public.student (school_id, powerschool_id, first_name, last_name, grade)
      values (_s, 200000 + i, 'S' || lpad(i::text, 3, '0'), 'Synthetic', 6) returning id into _stu;
    if i = 1 then _first := _stu; end if;
    insert into public.student_group_pair (student_id, student_group_id) values (_stu, _g);
    insert into public.student_point (student_id, point_event_id, point_value) values (_stu, _ev, p_totals[i]);
  end loop;
  update public.student set "linkedUser" = _user where id = _first;
  return query select _s, _tf, _user, _first;
end;
$$;

create function pg_temp.kinds(p_totals integer[]) returns text language plpgsql as $$
declare r record; out text;
begin
  select * into r from pg_temp.synth(p_totals);
  select coalesce(string_agg(cohort_kind, ',' order by cohort_kind), '') into out
    from public.points_to_next_rank(r.owner_user, r.owner_student, r.timeframe_id);
  return out;
end;
$$;

-- Seed: student 7 (account uid 5, parent uid 9).
select results_eq(
  format($$ select cohort_kind, cohort_id, points_to_next from public.points_to_next_rank(%s, 7, 1) $$, pg_temp.uid(5)),
  $$ values ('grade', 7::bigint, 15::bigint), ('overall', null::bigint, 10::bigint), ('point_group', 1::bigint, 2::bigint),
            ('point_group', 2::bigint, 3::bigint), ('student_group', 1::bigint, 10::bigint) $$,
  'student 7: one gap per cohort, numbers only'
);
select is(
  (select count(*) from public.points_to_next_rank(pg_temp.uid(9), 7, 1)), 5::bigint,
  'a linked parent sees the same five gaps'
);
select is((select count(*) from public.points_to_next_rank(pg_temp.uid(9), 8, 1)), 0::bigint, 'a parent gets nothing for an unlinked child');
select is((select count(*) from public.points_to_next_rank(pg_temp.uid(3), 7, 1)), 0::bigint, 'a teacher is not an eligible actor');
select is((select count(*) from public.points_to_next_rank(pg_temp.uid(1), 7, 1)), 0::bigint, 'an admin is not an eligible actor');
select is((select count(*) from public.points_to_next_rank(pg_temp.uid(2), 7, 1)), 0::bigint, 'an admin of another school gets nothing');
select is((select count(*) from public.points_to_next_rank(pg_temp.uid(5), 8, 1)), 0::bigint, 'a student cannot ask about another student');
select is((select count(*) from public.points_to_next_rank(pg_temp.uid(5), 7, 3)), 0::bigint, 'a timeframe of another school gives nothing');
select is(
  (select count(*) from public.points_to_next_rank(pg_temp.uid(8), 38, 1) where cohort_kind in ('overall', 'grade', 'student_group')),
  0::bigint, 'a student whose overall total nets to 0 has no overall, grade or group rank, so no gap there'
);

-- Floors: grade and group cohorts need 10 ranked participants. Student 1 has the lowest total.
select is(pg_temp.kinds(array[5, 20, 30, 40, 50, 60, 70, 80, 90]), 'overall', '9 participants: overall only');
select is(pg_temp.kinds(array[5, 20, 30, 40, 50, 60, 70, 80, 90, 100]), 'grade,overall,student_group', '10 participants: grade and student group appear');
select is(pg_temp.kinds(array[100, 20, 30, 40, 50, 60, 70, 80, 90, 10]), '', 'the top student has no next rank in any cohort');

select * from finish();
rollback;
