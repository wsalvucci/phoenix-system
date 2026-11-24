-- duplicate_scorebook_events with point_event.date as timestamptz (migration 20261124120000).
-- Days, months and years shifts keep the time of day, run on the UTC wall clock whatever the session
-- TimeZone is, include events late on a timeframe's last day, and clamp to the end of short months.
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

-- A non-UTC session with a DST change on 2026-03-08 proves the result does not depend on TimeZone.
set local timezone = 'America/New_York';

insert into public.school_timeframes (id, school_id, name, starts_at, ends_at, active) values
  (9001, 1, 'Test Q1 2026', '2026-01-01T00:00:00Z', '2026-03-31T23:59:59Z', false),
  (9002, 1, 'Test Feb 2026', '2026-02-01T00:00:00Z', '2026-02-28T23:59:59Z', false),
  (9003, 1, 'Test Feb 2024', '2024-02-01T00:00:00Z', '2024-02-29T23:59:59Z', false);

-- One group per shift unit, so one call's copies never land in another call's source window.
insert into public.student_group (id, name, school_id, timeframe_id, archived) values
  (9101, 'Dup days', 1, 9001, false),
  (9102, 'Dup months', 1, 9001, false),
  (9103, 'Dup years', 1, 9003, false);
insert into public.teacher_student_group_pair (teacher_id, group_id) values (1, 9101), (1, 9102), (1, 9103);

insert into public.point_event (id, template_id, student_group_id, date, name, max_input, point_group_id) values
  (9201, 1, 9101, '2026-01-31T15:30:00Z', 'days last-day afternoon', 100, 1),
  (9202, 1, 9101, '2026-03-07T05:00:00Z', 'days across DST', 100, 1),
  (9203, 1, 9102, '2026-01-10T08:00:00Z', 'months plain', 100, 1),
  (9204, 1, 9102, '2026-01-31T15:30:00Z', 'months to Feb 28', 100, 1),
  (9205, 1, 9102, '2026-03-31T23:00:00Z', 'months last-day late', 100, 1),
  (9206, 1, 9103, '2024-02-29T12:00:00Z', 'years leap day', 100, 1),
  (9207, 1, 9103, '2024-02-01T00:00:00Z', 'years midnight', 100, 1);

create function pg_temp.dup(grp bigint, tf bigint, amount integer, unit text, dest bigint)
returns jsonb language sql as $$
  select public.duplicate_scorebook_events(
    1, grp, tf, amount, unit,
    (select array_agg(id order by id) from public.point_event where student_group_id = grp),
    dest)
$$;

create function pg_temp.copies(result jsonb) returns setof text language sql as $$
  select to_char(e.date at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS')
  from public.point_event e
  where e.id in (select jsonb_array_elements_text(result -> 'createdEventIds')::bigint)
  order by e.date
$$;

-- Days: previously failed with "operator does not exist: timestamp with time zone + integer".
create temp table r_days as select pg_temp.dup(9101, 9001, 3, 'days', 9002) as r;
select is((select (r ->> 'copiedCount')::int from r_days), 2,
  'days: both events copied, including one late on the last day of the timeframe');
select results_eq($$ select pg_temp.copies(r) from r_days $$,
  $$ values ('2026-02-03T15:30:00'), ('2026-03-10T05:00:00') $$,
  'days: shifted by whole UTC days with the time of day kept, across a DST change');
select is((select (r ->> 'outsideDestinationCount')::int from r_days), 1,
  'days: the March copy is outside the February destination');
select is((select jsonb_array_length(r -> 'adjustedDates') from r_days), 0,
  'days: never reports adjusted dates');

-- Months.
create temp table r_months as select pg_temp.dup(9102, 9001, 1, 'months', 9002) as r;
select is((select (r ->> 'copiedCount')::int from r_months), 3, 'months: all three events copied');
select results_eq($$ select pg_temp.copies(r) from r_months $$,
  $$ values ('2026-02-10T08:00:00'), ('2026-02-28T15:30:00'), ('2026-04-30T23:00:00') $$,
  'months: same time of day, clamped to the last day of shorter months');
select is((select jsonb_array_length(r -> 'adjustedDates') from r_months), 2,
  'months: Jan 31 and Mar 31 are reported as adjusted');
select is(
  (select (a ->> 'resultingDate')::timestamptz from r_months, jsonb_array_elements(r -> 'adjustedDates') a
   where (a ->> 'sourceEventId')::bigint = 9204),
  '2026-02-28T15:30:00Z'::timestamptz,
  'months: adjustedDates carries the full resulting timestamp');
select is((select (r ->> 'outsideDestinationCount')::int from r_months), 1,
  'months: only the April copy is outside the February destination');

-- Years, from a leap day.
create temp table r_years as select pg_temp.dup(9103, 9003, 1, 'years', null) as r;
select is((select (r ->> 'copiedCount')::int from r_years), 2, 'years: both events copied');
select results_eq($$ select pg_temp.copies(r) from r_years $$,
  $$ values ('2025-02-01T00:00:00'), ('2025-02-28T12:00:00') $$,
  'years: midnight stays midnight UTC, Feb 29 clamps to Feb 28');
select is((select jsonb_array_length(r -> 'adjustedDates') from r_years), 1,
  'years: the leap day is reported as adjusted');
select is((select (r ->> 'outsideDestinationCount')::int from r_years), 0,
  'years: no destination means nothing is counted outside it');

-- Grants from 20261014223115 are kept.
select ok(not has_function_privilege('authenticated',
  'public.duplicate_scorebook_events(bigint, bigint, bigint, integer, text, bigint[], bigint, bigint[], uuid)', 'execute'),
  'authenticated cannot execute');
select ok(has_function_privilege('service_role',
  'public.duplicate_scorebook_events(bigint, bigint, bigint, integer, text, bigint[], bigint, bigint[], uuid)', 'execute'),
  'service_role can execute');

select * from finish();
rollback;
