-- Private score signal (migration 20261109120200) and index gaps (20261109120000).
-- Seed accounts: uid 1 admin of school 1, 2 admin of school 2, 3 teacher of school 1, 5 student,
-- 9 parent. Group 5 is school 2's.
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

create function pg_temp.as_account(n integer) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', '00000000-0000-4000-8000-' || lpad(n::text, 12, '0'), 'role', 'authenticated')::text, true);
$$;
create function pg_temp.signals(t text) returns bigint language sql as $$
  select count(*) from realtime.messages where topic = t and private and event = 'sync'
$$;

-- ---------------------------------------------------------------------------------------------
-- Who may receive.
select pg_temp.as_account(1);
select ok(private.can_receive_school_topic('school:1:scores'), 'admin of school 1 receives school 1');
select ok(not private.can_receive_school_topic('school:2:scores'), 'admin of school 1 does not receive school 2');
select ok(not private.can_receive_school_topic('student-points-channel'), 'the old public topic is not a private grant');
select ok(not private.can_receive_school_topic('school:1:scores:x'), 'a topic with a suffix is refused');
select ok(not private.can_receive_school_topic('school:01x:scores'), 'a malformed school id is refused');
select pg_temp.as_account(2);
select ok(private.can_receive_school_topic('school:2:scores'), 'admin of school 2 receives school 2');
select ok(not private.can_receive_school_topic('school:1:scores'), 'admin of school 2 does not receive school 1');
select pg_temp.as_account(3);
select ok(private.can_receive_school_topic('school:1:scores'), 'teacher of school 1 receives school 1');
select pg_temp.as_account(5);
select ok(not private.can_receive_school_topic('school:1:scores'), 'a student does not receive');
select pg_temp.as_account(9);
select ok(not private.can_receive_school_topic('school:1:scores'), 'a parent does not receive');
select set_config('request.jwt.claims', '', true);
select ok(not private.can_receive_school_topic('school:1:scores'), 'no session does not receive');

-- ---------------------------------------------------------------------------------------------
-- What sends. realtime.send needs today's realtime.messages partition, which the Realtime service
-- creates; the local stack runs it.
delete from realtime.messages where topic like 'school:%:scores';
update public.student_point set point_value = point_value + 1 where student_id = 7 and point_event_id = 1;
select is(pg_temp.signals('school:1:scores'), 1::bigint, 'a score edit sends one private signal to its school');
select is(pg_temp.signals('school:2:scores'), 0::bigint, 'and none to another school');
update public.student_point set point_value = point_value + 1 where point_event_id = 1;
select is(pg_temp.signals('school:1:scores'), 2::bigint, 'a many-row statement sends one signal, not one per row');
delete from public.student_point where student_id = 42;
select is(pg_temp.signals('school:2:scores'), 1::bigint, 'a school 2 delete signals school 2');
insert into public.student_point (student_id, point_event_id, point_value)
select 42, e.id, 3 from public.point_event e where e.student_group_id = 5 limit 1;
select is(pg_temp.signals('school:2:scores'), 2::bigint, 'an insert signals');
update public.point_event set name = name where id = 1;
select is(pg_temp.signals('school:1:scores'), 3::bigint, 'an event update signals');
select is((select count(*) from realtime.messages where topic like 'school:%:scores' and payload - 'id' <> '{}'::jsonb),
  0::bigint, 'the payload carries nothing but the message id');

-- ---------------------------------------------------------------------------------------------
-- RLS on realtime.messages, evaluated the way Realtime does it (as authenticated, topic set).
set local role authenticated;
select pg_temp.as_account(1);
select set_config('realtime.topic', 'school:1:scores', true);
select ok((select count(*) from realtime.messages where topic = 'school:1:scores') > 0, 'admin of school 1 may read its topic');
select throws_ok($$ insert into realtime.messages (topic, extension, event, payload, private)
                    values ('school:1:scores', 'broadcast', 'sync', '{}', true) $$,
  '42501', null, 'a signed-in staff member cannot send on the private topic');
select pg_temp.as_account(2);
select is((select count(*) from realtime.messages where topic = 'school:1:scores'), 0::bigint, 'admin of school 2 reads nothing on school 1');
reset role;
set local role anon;
select set_config('realtime.topic', 'school:1:scores', true);
select is((select count(*) from realtime.messages where topic = 'school:1:scores'), 0::bigint, 'anon reads nothing');
reset role;

select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and has_function_privilege('anon', p.oid, 'execute')),
  0::bigint, 'anon executes nothing in schema private');

-- ---------------------------------------------------------------------------------------------
-- Index gaps.
select ok((select indisunique from pg_index where indexrelid = 'public.user_supabase_id_key'::regclass),
  'user.supabase_id is unique');
select is(
  (select count(*) from pg_indexes where schemaname = 'public' and indexname in (
    'teacher_linked_user_idx', 'student_linked_user_idx', 'teacher_school_id_idx', 'student_group_school_id_idx',
    'point_group_school_id_idx', 'school_timeframes_school_id_idx', 'ranking_group_school_id_idx',
    'admin_school_pair_school_id_idx', 'point_event_student_group_id_date_idx',
    'student_group_pair_student_group_id_idx', 'teacher_student_group_pair_group_id_idx',
    'teacher_ranking_group_pair_ranking_group_id_idx', 'ranking_group_pair_student_group_id_idx',
    'user_student_pair_student_id_idx', 'student_group_leaders_student_id_idx', 'student_group_leaders_group_id_idx',
    'teaching_assistant_student_id_idx', 'teaching_assistant_group_id_idx', 'shared_point_shared_group_id_idx')),
  19::bigint, 'all 19 supporting indexes exist');

select * from finish();
rollback;
