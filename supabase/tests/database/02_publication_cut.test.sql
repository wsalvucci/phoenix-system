-- publication_cut, display_cut and the publication-cut table of docs/DATA_DISCLOSURE.md section 8.4.
-- Uses the seed for the real school and an in-transaction synthetic school for exact cohort sizes.
begin;
create extension if not exists pgtap with schema extensions;
select plan(42);

-- ---------------------------------------------------------------------------------------------
-- Helpers (session-local)
-- ---------------------------------------------------------------------------------------------
create function pg_temp.uid(n integer) returns bigint language sql as $$
  select id from public."user" where supabase_id = ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
$$;

-- A throwaway school whose students have exactly the given totals (one event, one group), plus an
-- admin actor. Returns (school_id, timeframe_id, actor_user_id).
create function pg_temp.synth(p_totals integer[], p_grade bigint default 6)
returns table (school_id bigint, timeframe_id bigint, actor_id bigint)
language plpgsql as $$
declare
  _s bigint; _tf bigint; _g bigint; _tpl bigint; _ev bigint; _admin bigint; _user bigint; _stu bigint; _uuid uuid; i integer;
begin
  insert into public.school (name) values ('Synthetic ' || gen_random_uuid()) returning id into _s;
  insert into public.school_timeframes (school_id, name, starts_at, ends_at, active)
    values (_s, 'T', now() - interval '10 days', now() + interval '10 days', true) returning id into _tf;
  insert into public.student_group (name, school_id, timeframe_id) values ('G', _s, _tf) returning id into _g;
  insert into public.point_template (name, template_type_id, point_group_id, student_group_id, conversion_rule_value, max_input_value)
    values ('T', 1, 1, _g, 1, 100) returning id into _tpl;
  insert into public.point_event (template_id, student_group_id, date, name, max_input, point_group_id)
    values (_tpl, _g, now() - interval '1 day', 'E', 100, null) returning id into _ev;
  insert into public.admin default values returning id into _admin;
  insert into public.admin_school_pair (admin_id, school_id) values (_admin, _s);
  _uuid := gen_random_uuid();
  insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, phone_change, phone_change_token, reauthentication_token)
    values ('00000000-0000-0000-0000-000000000000', _uuid, 'authenticated', 'authenticated', _uuid || '@example.test', now(), now(), '{}', '{}', '', '', '', '', '', '', '', '');
  update public."user" set admin_id = _admin where supabase_id = _uuid returning id into _user;
  for i in 1 .. coalesce(array_length(p_totals, 1), 0) loop
    insert into public.student (school_id, powerschool_id, first_name, last_name, grade)
      values (_s, 100000 + i, 'S' || lpad(i::text, 3, '0'), 'Synthetic', p_grade) returning id into _stu;
    insert into public.student_group_pair (student_id, student_group_id) values (_stu, _g);
    insert into public.student_point (student_id, point_event_id, point_value) values (_stu, _ev, p_totals[i]);
  end loop;
  return query select _s, _tf, _user;
end;
$$;

create function pg_temp.published(p_totals integer[]) returns integer language plpgsql as $$
declare r record; n integer;
begin
  select * into r from pg_temp.synth(p_totals);
  select count(*) into n from public.display_cut(r.school_id, r.timeframe_id, 'overall', null, r.actor_id);
  return n;
end;
$$;

create function pg_temp.flat(n integer, v integer default 10) returns integer[] language sql as $$
  select coalesce(array_agg(v + g), '{}') from generate_series(1, n) g
$$;

-- ---------------------------------------------------------------------------------------------
-- publication_cut: the section 8.4 table
-- ---------------------------------------------------------------------------------------------
select results_eq(
  $$ select publication_cut(s) from unnest(array[0, 1, 2, 3, 4, 6, 9, 12, 30, 31, 600]::bigint[]) with ordinality as t(s, o) order by o $$,
  $$ values (0), (0), (0), (0), (1), (1), (2), (3), (9), (10), (10) $$,
  'publication_cut matches the section 8.4 table for sizes 0,1,2,3,4,6,9,12,30,31,600'
);
select is(public.publication_cut(null), 0, 'publication_cut(null) fails closed to 0');
select is(public.publication_cut(-5), 0, 'publication_cut(negative) fails closed to 0');
select results_eq(
  $$ select n_absolute, p_ratio, k_hidden, min_cohort_for_aggregate from public.publication_cut_policy() $$,
  $$ values (10, 0.33::numeric, 3, 10) $$,
  'policy is N=10, P=0.33, K=3, floor 10'
);

-- ---------------------------------------------------------------------------------------------
-- display_cut shape: no count, no student id
-- ---------------------------------------------------------------------------------------------
select is(
  (select array_agg(a order by o) from (
     select a, o from unnest((select proargnames from pg_proc where proname = 'display_cut' and pronamespace = 'public'::regnamespace))
       with ordinality as t(a, o)) x where a not like 'p\_%'),
  array['display_rank', 'first_name', 'last_name', 'grade', 'total_points'],
  'display_cut returns only rank, names, grade and points: no id, no count'
);

-- ---------------------------------------------------------------------------------------------
-- Seed school, overall cohort (36 ranked students, cut 10, tie at 10/11 shrinks to 9)
-- ---------------------------------------------------------------------------------------------
select results_eq(
  format($$ select display_rank, first_name, total_points from public.display_cut(1, 1, 'overall', null, %s) $$, pg_temp.uid(1)),
  $$ values (1, 'Ada', 100::bigint), (2, 'Ben', 95::bigint), (3, 'Cora', 90::bigint), (4, 'Dev', 85::bigint),
            (5, 'Eli', 80::bigint), (5, 'Fay', 80::bigint), (7, 'Gus', 70::bigint), (8, 'Hana', 65::bigint),
            (9, 'Ivy', 60::bigint) $$,
  'overall: ties share a rank, the tied band at the boundary (Jude, Kai at 55) is dropped, past-term points are ignored'
);
select is(
  (select count(*) from public.display_cut(1, 1, 'overall', null, pg_temp.uid(1))
    where first_name in ('Mona', 'Nico', 'Leo', 'Kira') ),
  0::bigint,
  'overall: zero and net-zero students are never published'
);
select is(
  (select count(*) from public.display_cut(1, 1, 'overall', null, pg_temp.uid(3))), 9::bigint,
  'overall: a teacher of the school gets the same cut'
);

-- Authorization: "not allowed" looks the same as "nothing".
select is((select count(*) from public.display_cut(1, 1, 'overall', null, null, null)), 0::bigint, 'no actor and no device: no rows');
select is((select count(*) from public.display_cut(1, 1, 'overall', null, pg_temp.uid(2))), 0::bigint, 'admin of another school: no rows');
select is((select count(*) from public.display_cut(1, 1, 'overall', null, pg_temp.uid(5))), 0::bigint, 'a student account: no rows');
select is((select count(*) from public.display_cut(1, 1, 'overall', null, pg_temp.uid(9))), 0::bigint, 'a parent account: no rows');
select is((select count(*) from public.display_cut(1, 1, 'overall', null, pg_temp.uid(10))), 0::bigint, 'an unlinked account: no rows');
select is((select count(*) from public.display_cut(1, 1, 'overall', null, 999999)), 0::bigint, 'an unknown actor id: no rows');
select is((select count(*) from public.display_cut(2, 3, 'overall', null, pg_temp.uid(1))), 0::bigint, 'admin of school 1 asking for school 2: no rows');
select is((select count(*) from public.display_cut(1, 3, 'overall', null, pg_temp.uid(1))), 0::bigint, 'a timeframe of another school: no rows');
select throws_ok(
  format($$ select * from public.display_cut(1, 1, 'galaxy', null, %s) $$, pg_temp.uid(1)),
  '22023', 'Unknown cohort kind', 'unknown cohort kind raises'
);

-- Grade cohorts: independent cut per cohort.
select results_eq(
  format($$ select display_rank, first_name from public.display_cut(1, 1, 'grade', 6, %s) $$, pg_temp.uid(1)),
  $$ values (1, 'Fay'), (2, 'Ivy'), (3, 'Lena') $$,
  'grade 6: its own cut of 3, not the overall cut of 10'
);
select results_eq(
  format($$ select first_name from public.display_cut(1, 1, 'grade', 9, %s) $$, pg_temp.uid(1)),
  $$ values ('Cora') $$,
  'grade 9 (cohort of 4): exactly one name, floor(0.33*4)=1'
);
select is((select count(*) from public.display_cut(1, 1, 'grade', 5, pg_temp.uid(1))), 0::bigint, 'a grade with no students: no rows');

-- Point groups: ranked only.
select cmp_ok((select count(*) from public.display_cut(1, 1, 'point_group', 1, pg_temp.uid(1))), '>', 0::bigint, 'ranked point group publishes rows');
select is((select count(*) from public.display_cut(1, 1, 'point_group', 3, pg_temp.uid(1))), 0::bigint, 'unranked point group: no rows');
select is((select count(*) from public.display_cut(1, 1, 'point_group', 4, pg_temp.uid(1))), 0::bigint, 'point group of another school: no rows');
select is(
  (select count(*) from public.display_cut(1, 1, 'point_group', 2, pg_temp.uid(1))), 5::bigint,
  'Effort has 18 participants, cut = min(10, 5, 15) = 5'
);

-- Student groups: archived and foreign groups are refused.
select cmp_ok((select count(*) from public.display_cut(1, 1, 'student_group', 1, pg_temp.uid(1))), '>', 0::bigint, 'active student group publishes rows');
select is((select count(*) from public.display_cut(1, 1, 'student_group', 4, pg_temp.uid(1))), 0::bigint, 'archived student group: no rows');
select is((select count(*) from public.display_cut(1, 1, 'student_group', 5, pg_temp.uid(1))), 0::bigint, 'student group of another school: no rows');

-- Past term: one student with 500 points is a cohort of 1, cut 0.
select is((select count(*) from public.display_cut(1, 2, 'overall', null, pg_temp.uid(1))), 0::bigint, 'past term, cohort of 1: no rows');

-- ---------------------------------------------------------------------------------------------
-- Synthetic cohort sizes: the published count follows publication_cut
-- ---------------------------------------------------------------------------------------------
select is(pg_temp.published(pg_temp.flat(0)), 0, 'size 0 publishes 0');
select is(pg_temp.published(pg_temp.flat(3)), 0, 'size 3 publishes 0');
select is(pg_temp.published(pg_temp.flat(4)), 1, 'size 4 publishes 1');
select is(pg_temp.published(pg_temp.flat(6)), 1, 'size 6 publishes 1');
select is(pg_temp.published(pg_temp.flat(9)), 2, 'size 9 publishes 2 (the "top 10 in a grade of 9" bug)');
select is(pg_temp.published(pg_temp.flat(12)), 3, 'size 12 publishes 3');
select is(pg_temp.published(pg_temp.flat(30)), 9, 'size 30 publishes 9');
select is(pg_temp.published(pg_temp.flat(31)), 10, 'size 31 publishes 10');
select is(pg_temp.published(pg_temp.flat(120)), 10, 'size 120 publishes 10, not 39');

-- Ties shrink, never extend (section 3.3 rule 4).
select is(pg_temp.published(array[100, 90, 80, 80, 70, 60, 50, 40, 30, 20, 15, 10]), 2,
  'size 12, cut 3, tie across positions 3 and 4: the tied band is dropped, 2 published');
select is(pg_temp.published(array[100, 100, 100, 70, 60, 50, 40, 30, 20, 15, 12, 10]), 3,
  'size 12, cut 3, a three-way tie that ends exactly at the cut is published whole');
select is(pg_temp.published(array[100, 100, 100, 100, 70, 60, 50, 40, 30, 20, 15, 10]), 0,
  'size 12, cut 3, a four-way tie at the top: nothing is published');
select is(pg_temp.published(array[10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10]), 0, 'everyone tied: nothing is published');
select is(pg_temp.published(array[50, 40, 30, 20, 0, 0, 0, -5]), 1, 'zero and negative totals do not count toward cohort size (4 ranked: cut 1)');

select * from finish();
rollback;
