-- Same-school guard (migration 20261109120100): no pair row may link two schools, and a paired row may
-- not move to another school. Seed: school 1 (students 1-40, groups 1-4, teachers 1-3, ranking group 1,
-- point groups 1-3), school 2 (students 41-45, group 5, point group 4).
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- Pair side: refused across schools.
select throws_ok($$ insert into public.student_group_pair (student_id, student_group_id) values (41, 1) $$,
  '23514', null, 'student of school 2 cannot join a school 1 group');
select throws_ok($$ insert into public.student_group_leaders (student_id, group_id) values (41, 1) $$,
  '23514', null, 'student of school 2 cannot lead a school 1 group');
select throws_ok($$ insert into public.teaching_assistant (student_id, group_id, full_access) values (41, 1, true) $$,
  '23514', null, 'student of school 2 cannot assist a school 1 group');
select throws_ok($$ insert into public.teacher_student_group_pair (teacher_id, group_id) values (1, 5) $$,
  '23514', null, 'teacher of school 1 cannot teach a school 2 group');
select throws_ok($$ insert into public.ranking_group_pair (ranking_group_id, student_group_id) values (1, 5) $$,
  '23514', null, 'school 1 competition cannot include a school 2 group');
insert into public.ranking_group (name, school_id) values ('T09 school 2 competition', 2);
select throws_ok($$ insert into public.teacher_ranking_group_pair (teacher_id, ranking_group_id)
                    select 1, r.id from public.ranking_group r where r.name = 'T09 school 2 competition' $$,
  '23514', null, 'teacher of school 1 cannot run a school 2 competition');
select throws_ok($$ update public.point_event set point_group_id = 4 where id = 1 $$,
  '23514', null, 'a school 1 event cannot be filed under a school 2 category');
select throws_ok($$ insert into public.student_point (student_id, point_event_id, point_value) values (41, 1, 5) $$,
  '23514', null, 'a school 2 student cannot be scored on a school 1 event');
select throws_ok($$ insert into public.shared_point (student_point_id, shared_group_id, pinned)
                    select id, 5, false from public.student_point where student_id = 7 limit 1 $$,
  '23514', null, 'a school 1 score cannot be shared into a school 2 group');
select throws_ok($$ update public.student_group_pair set student_group_id = 5 where student_id = 7 and student_group_id = 1 $$,
  '23514', null, 'moving a membership row to another school''s group is refused');

-- Pair side: same school still works, and ordinary edits are not checked.
select lives_ok($$ insert into public.student_group_pair (student_id, student_group_id) values (42, 5)
                   on conflict do nothing $$, 'same-school membership is allowed');
select lives_ok($$ insert into public.teaching_assistant (student_id, group_id, full_access) values (9, 1, false) $$,
  'same-school assistant is allowed');
select lives_ok($$ update public.student_point set point_value = point_value + 1 where student_id = 7 and point_event_id = 1 $$,
  'editing a score value is not affected');

-- NULL school is "unknown" and allowed (legacy groups).
update public.student_group set school_id = null where id = 4;
select lives_ok($$ insert into public.student_group_pair (student_id, student_group_id) values (41, 4) $$,
  'a group with no school does not block the insert');

-- Owner side: a paired row cannot move school.
select throws_ok($$ update public.student set school_id = 2 where id = 7 $$,
  '23514', null, 'a student in school 1 groups cannot move to school 2');
select throws_ok($$ update public.teacher set school_id = 2 where id = 1 $$,
  '23514', null, 'a teacher of school 1 groups cannot move to school 2');
select throws_ok($$ update public.student_group set school_id = 2 where id = 1 $$,
  '23514', null, 'a group with school 1 members cannot move to school 2');
select throws_ok($$ update public.ranking_group set school_id = 2 where id = 1 $$,
  '23514', null, 'a competition with school 1 groups cannot move to school 2');
select throws_ok($$ update public.point_group set school_id = 2 where id = 1 $$,
  '23514', null, 'a category with school 1 events cannot move to school 2');

-- Owner side: an unpaired row may move, and setting the same school is a no-op.
insert into public.student (school_id, powerschool_id, first_name, last_name, grade)
values (1, 990909, 'T09', 'Unpaired', 7);
update public.student set school_id = 2 where powerschool_id = 990909;
select is((select school_id from public.student where powerschool_id = 990909), 2::bigint,
  'an unpaired student may move');
select lives_ok($$ update public.student set school_id = school_id where id = 7 $$,
  'rewriting the same school is not a move');
select lives_ok($$ update public.student set first_name = first_name where id = 7 $$,
  'other student edits are not checked');

-- Functions are not callable by API roles.
select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname in ('refuse_cross_school_pair', 'refuse_school_move_while_paired')
      and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))),
  0::bigint, 'anon and authenticated cannot execute the guard functions');
select is(
  (select count(*) from pg_trigger t where t.tgname in ('same_school_pair', 'same_school_move') and not t.tgisinternal),
  14::bigint, 'nine pair-side and five owner-side triggers are installed');

select * from finish();
rollback;
