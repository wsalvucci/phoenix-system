-- Read-only checks for the product owner to run on PRODUCTION (Supabase dashboard > SQL editor).
-- Each block is a SELECT inside a READ ONLY transaction: it cannot change anything. Paste one block at a
-- time and send the result (counts, or the id columns only; no names) to backend.
-- Written 2026-11-09 for v2.1.0 and the agent/backend-wave3 migrations.


-- 1. Student teaching assistants who lost access in v2.1.0 -----------------------------------------
-- v2.1.0 checks a teaching assistant against the signed-in account's own student, which the web app
-- links through student."linkedUser". An account linked only the mobile way ("user".student_id) without
-- that link is no longer recognized as the assistant. Expected: zero rows. Each row is one assistant
-- seat that stopped working; the fix is to link the account on the web (or backend backfills
-- student."linkedUser" after the owner approves it).
begin transaction read only;
select ta.id          as teaching_assistant_id,
       ta.group_id,
       ta.full_access,
       s.id           as student_id,
       s.school_id,
       u.id           as mobile_linked_user_id,
       s."linkedUser" as web_linked_user_id
  from public.teaching_assistant ta
  join public.student s on s.id = ta.student_id
  join public."user" u on u.student_id = s.id
 where s."linkedUser" is distinct from u.id
 order by s.school_id, ta.group_id, s.id;
rollback;


-- 2. Duplicate profile rows (must be zero before 20261109120000_index_gaps.sql applies) ------------
begin transaction read only;
select supabase_id, count(*) as rows, array_agg(id order by id) as user_ids
  from public."user"
 group by supabase_id
having count(*) > 1;
rollback;


-- 3. Mixed-school pairs that already exist (20261109120100_same_school_pairs.sql only stops new ones) --
-- Expected: zero rows. Any row is a link between two schools created before the guard existed.
begin transaction read only;
select 'student_group_pair' as pair_table, x.student_id as a_id, x.student_group_id as b_id, s.school_id as a_school, g.school_id as b_school
  from public.student_group_pair x join public.student s on s.id = x.student_id join public.student_group g on g.id = x.student_group_id
 where g.school_id <> s.school_id
union all
select 'student_group_leaders', x.student_id, x.group_id, s.school_id, g.school_id
  from public.student_group_leaders x join public.student s on s.id = x.student_id join public.student_group g on g.id = x.group_id
 where g.school_id <> s.school_id
union all
select 'teaching_assistant', x.student_id, x.group_id, s.school_id, g.school_id
  from public.teaching_assistant x join public.student s on s.id = x.student_id join public.student_group g on g.id = x.group_id
 where g.school_id <> s.school_id
union all
select 'teacher_student_group_pair', x.teacher_id, x.group_id, t.school_id, g.school_id
  from public.teacher_student_group_pair x join public.teacher t on t.id = x.teacher_id join public.student_group g on g.id = x.group_id
 where g.school_id <> t.school_id
union all
select 'ranking_group_pair', x.ranking_group_id, x.student_group_id, r.school_id, g.school_id
  from public.ranking_group_pair x join public.ranking_group r on r.id = x.ranking_group_id join public.student_group g on g.id = x.student_group_id
 where g.school_id <> r.school_id
union all
select 'teacher_ranking_group_pair', x.teacher_id, x.ranking_group_id, t.school_id, r.school_id
  from public.teacher_ranking_group_pair x join public.teacher t on t.id = x.teacher_id join public.ranking_group r on r.id = x.ranking_group_id
 where r.school_id <> t.school_id
union all
select 'point_event', e.id, e.point_group_id, g.school_id, p.school_id
  from public.point_event e join public.student_group g on g.id = e.student_group_id join public.point_group p on p.id = e.point_group_id
 where p.school_id <> g.school_id
union all
select 'student_point', sp.student_id, sp.point_event_id, s.school_id, g.school_id
  from public.student_point sp join public.student s on s.id = sp.student_id
  join public.point_event e on e.id = sp.point_event_id join public.student_group g on g.id = e.student_group_id
 where g.school_id <> s.school_id
union all
select 'shared_point', x.student_point_id, x.shared_group_id, s.school_id, g.school_id
  from public.shared_point x join public.student_point sp on sp.id = x.student_point_id
  join public.student s on s.id = sp.student_id join public.student_group g on g.id = x.shared_group_id
 where g.school_id <> s.school_id;
rollback;


-- 4. Groups with no school (the same-school guard treats them as "unknown" and allows them) --------
begin transaction read only;
select count(*) as groups_without_school from public.student_group where school_id is null;
rollback;
