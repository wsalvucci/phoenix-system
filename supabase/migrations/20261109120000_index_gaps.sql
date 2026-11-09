-- Index gaps (NEXT_STEPS_v2 #17, BACKEND_PLAN §8). Additive: indexes only, no data or column change.
--
-- The one index that can fail is UNIQUE "user"(supabase_id). Before applying to production, the owner
-- runs this read-only check (SQL editor). It must return zero rows:
--
--     select supabase_id, count(*) as rows, array_agg(id order by id) as user_ids
--       from public."user"
--      group by supabase_id
--     having count(*) > 1;
--
-- If it returns rows, do NOT apply: each auth account has more than one profile row, and which one
-- the app reads today is arbitrary. Send the result to backend; merging them is a data change that
-- needs its own reviewed migration. The guard below makes this file fail as a whole (nothing created)
-- rather than half-apply if duplicates exist.
--
-- Local stack check (2026-11-09): 0 duplicate supabase_id values.
--
-- Plain CREATE INDEX (not CONCURRENTLY: migrations run in a transaction). Every table here is
-- school-sized (thousands of rows at most), so each build takes milliseconds.

do $$
begin
  if exists (select 1 from public."user" group by supabase_id having count(*) > 1) then
    raise exception 'public."user".supabase_id has duplicate values; run the check query in the header of 20261109120000_index_gaps.sql';
  end if;
end;
$$;

-- Every signed-in request: getCallerAccess / getOwnUserData (.eq("supabase_id", ...).single()),
-- get_user_data(), auth_current_student(), handle_new_user. Also makes "one profile row per auth
-- account" a database rule instead of an assumption.
create unique index if not exists user_supabase_id_key on public."user" (supabase_id);

-- Account links: staffAccess.getCallerAccess and is_staff_of_school (teacher.linked_user),
-- can_view_student and own-student lookups (student."linkedUser"), the link RPCs.
create index if not exists teacher_linked_user_idx on public.teacher (linked_user) where linked_user is not null;
create index if not exists student_linked_user_idx on public.student ("linkedUser") where "linkedUser" is not null;

-- School-scoped lists: admin teacher/group/category/term/competition lists, display_cut,
-- points_to_next_rank, leader letters, adminScope.ts ownership checks.
-- (student(school_id) is already served by student_school_id_grade_idx.)
create index if not exists teacher_school_id_idx on public.teacher (school_id);
create index if not exists student_group_school_id_idx on public.student_group (school_id);
create index if not exists point_group_school_id_idx on public.point_group (school_id);
create index if not exists school_timeframes_school_id_idx on public.school_timeframes (school_id);
create index if not exists ranking_group_school_id_idx on public.ranking_group (school_id);
create index if not exists admin_school_pair_school_id_idx on public.admin_school_pair (school_id);

-- Scorebook loads (events of one group in date order) and the duplicate_scorebook_events source scan.
create index if not exists point_event_student_group_id_date_idx on public.point_event (student_group_id, date);

-- Pair tables whose primary key leads with the other column (or that have no key at all).
create index if not exists student_group_pair_student_group_id_idx on public.student_group_pair (student_group_id);   -- group member lists
create index if not exists teacher_student_group_pair_group_id_idx on public.teacher_student_group_pair (group_id);   -- "teachers of this group"
create index if not exists teacher_ranking_group_pair_ranking_group_id_idx on public.teacher_ranking_group_pair (ranking_group_id);
create index if not exists ranking_group_pair_student_group_id_idx on public.ranking_group_pair (student_group_id);
create index if not exists user_student_pair_student_id_idx on public.user_student_pair (student_id);                -- can_view_student, admin parent-link list
create index if not exists student_group_leaders_student_id_idx on public.student_group_leaders (student_id);        -- "groups I lead"
create index if not exists student_group_leaders_group_id_idx on public.student_group_leaders (group_id);            -- "leaders of this group"
create index if not exists teaching_assistant_student_id_idx on public.teaching_assistant (student_id);              -- TA checks (own student id)
create index if not exists teaching_assistant_group_id_idx on public.teaching_assistant (group_id);                  -- TAs of a group
create index if not exists shared_point_shared_group_id_idx on public.shared_point (shared_group_id);                -- "Shared with me" feed
