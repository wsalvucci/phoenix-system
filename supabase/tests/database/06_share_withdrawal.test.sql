-- Share withdrawal: editing a shared score un-shares it and leaves a one-time notice
-- (migration 20261014230400). Seed: student 7 (account uid 5) shared two scores into Homeroom A.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

create function pg_temp.uid(n integer) returns bigint language sql as $$
  select id from public."user" where supabase_id = ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
$$;

select is((select count(*) from public.shared_point), 2::bigint, 'seed starts with two shares');

-- Changing only the input score or notes does not withdraw.
update public.student_point set input_score = 1, notes = 'n' where student_id = 7 and point_event_id = 1;
select is((select count(*) from public.shared_point), 2::bigint, 'editing notes or input_score keeps the share');
update public.student_point set point_value = point_value where student_id = 7 and point_event_id = 1;
select is((select count(*) from public.shared_point_withdrawal), 0::bigint, 'writing the same value is not a change');

-- Another student's score is not shared, so changing it withdraws nothing.
update public.student_point set point_value = point_value + 1 where student_id = 8 and point_event_id = 1;
select is((select count(*) from public.shared_point_withdrawal), 0::bigint, 'changing an unshared score records nothing');

-- Changing the shared score withdraws it.
update public.student_point set point_value = point_value + 1 where student_id = 7 and point_event_id = 1;
select is((select count(*) from public.shared_point), 1::bigint, 'the changed score is no longer shared');
select is((select count(*) from public.shared_point_withdrawal where student_id = 7), 1::bigint, 'a withdrawal notice is recorded for the owner');

-- Another account never sees the notice.
select is((select count(*) from public.take_share_withdrawal_notices(pg_temp.uid(9))), 0::bigint, 'a parent does not receive the student notice');
select is((select count(*) from public.take_share_withdrawal_notices(pg_temp.uid(3))), 0::bigint, 'a teacher does not receive the student notice');

-- The owner takes it exactly once.
select results_eq(
  format($$ select event_name from public.take_share_withdrawal_notices(%s) $$, pg_temp.uid(5)),
  $$ values ('Kindness A week 1') $$, 'the owner gets the event name');
select is((select count(*) from public.take_share_withdrawal_notices(pg_temp.uid(5))), 0::bigint, 'the notice is consumed on first read');

-- A second changed share produces a second, separate notice.
update public.student_point set point_value = point_value - 1 where student_id = 7 and point_event_id = 3;
select is((select count(*) from public.shared_point), 0::bigint, 'the second shared score is withdrawn too');
select is((select count(*) from public.take_share_withdrawal_notices(pg_temp.uid(5))), 1::bigint, 'and produces a new notice');

select * from finish();
rollback;
