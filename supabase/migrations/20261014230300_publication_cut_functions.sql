-- Publication cut in SQL (DATA_DISCLOSURE.md §3, §8.7) and points-to-next-rank (§9.3, §10.2).
-- Additive: new functions and three indexes. No existing object changes.
-- Depends on 20261014230100_actor_helpers.sql and 20261014230200_display_devices.sql.
--
-- Contract (see docs/schema/BACKEND_PLAN.md section 3):
--   publication_cut_policy()  the four thresholds. Not caller-supplied, not runtime-mutable.
--   publication_cut(size)     min(N_ABSOLUTE, floor(P_RATIO * size), size - K_HIDDEN), floored at 0.
--                             Must agree with computeCut() in dashboardFilters.ts (§8.4 table).
--   display_cut(...)          the published rows for ONE cohort. At most `cut` rows, no count, no
--                             student id, tied band at the boundary dropped (shrink-only, §3.3 rule 4).
--   points_to_next_rank(...)  one gap per cohort for one student. No name, id or rank of anyone else.
--
-- Access: service_role only. The web server action authorizes the caller first (staff of the school,
-- or a display device bound to it, or the student / linked parent), then passes the actor. Each
-- function re-checks that actor independently, so a server-side bug cannot widen scope.
-- Why RLS cannot do this: a display device is not a Postgres role or JWT, and the cut is an aggregate
-- over rows the caller may not read one by one. RLS can hide rows. It cannot publish "the top k of a
-- set you may not see".
--
-- Cohort membership (the `size` term): students in the cohort with a total > 0 for the timeframe
-- (D19, CONFIRMED). The same cohort supplies every rank, every own denominator and every floor. A
-- student with a zero or negative total has no rank and is never published.
-- Point-group cohorts exist only for point_group.ranked = true (D18, CONFIRMED), on every surface.
-- Point totals are SUM(student_point.point_value) for point_event.date inside the timeframe, with the
-- category from point_event.point_group_id. This matches the mobile functions and the scorebook. The
-- current Node dashboard path instead re-applies the legacy template rule to point_value and uses
-- point_template.point_group_id. See BACKEND_PLAN.md decision P3.

-- ---------------------------------------------------------------------------------------------
-- Policy
-- ---------------------------------------------------------------------------------------------
create or replace function public.publication_cut_policy()
returns table (n_absolute integer, p_ratio numeric, k_hidden integer, min_cohort_for_aggregate integer)
language sql
immutable
set search_path = ''
as $$
  -- Provisional defaults (§3.4). Changing any value is a disclosure ruling. N_ABSOLUTE ceiling 20 (D9).
  select 10, 0.33::numeric, 3, 10;
$$;

create or replace function public.publication_cut(p_size bigint)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when p_size is null or p_size <= 0 then 0
    else greatest(0, least(
      p.n_absolute::bigint,
      floor(p.p_ratio * p_size)::bigint,
      p_size - p.k_hidden
    ))::integer
  end
  from public.publication_cut_policy() p;
$$;

-- ---------------------------------------------------------------------------------------------
-- display_cut: one cohort, already cut. p_cohort_kind in ('overall','grade','point_group',
-- 'student_group'). p_cohort_id is the grade number, point_group.id or student_group.id (null for
-- 'overall'). Exactly one of p_actor_user_id (staff) / p_display_device_id must authorize it.
-- Returns 0 rows when the actor is not entitled, the timeframe or cohort is not in the school, or the
-- cut is 0. "Nothing" and "not allowed" look the same.
-- ---------------------------------------------------------------------------------------------
create or replace function public.display_cut(
  p_school_id bigint,
  p_timeframe_id bigint,
  p_cohort_kind text,
  p_cohort_id bigint,
  p_actor_user_id bigint default null,
  p_display_device_id uuid default null
)
returns table (display_rank integer, first_name text, last_name text, grade bigint, total_points bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  _starts timestamptz;
  _ends timestamptz;
  _authorized boolean := false;
begin
  if p_cohort_kind not in ('overall', 'grade', 'point_group', 'student_group') then
    raise exception 'Unknown cohort kind' using errcode = '22023';
  end if;

  if p_actor_user_id is not null then
    _authorized := public.is_staff_of_school(p_actor_user_id, p_school_id);
  elsif p_display_device_id is not null then
    -- Unrevoked AND its pairer still staff of the school (D17 condition 1).
    _authorized := public.display_device_live(p_display_device_id, p_school_id);
  end if;
  if not _authorized then
    return;
  end if;

  select t.starts_at, t.ends_at into _starts, _ends
  from public.school_timeframes t
  where t.id = p_timeframe_id and t.school_id = p_school_id;
  if _starts is null then
    return;
  end if;

  if p_cohort_kind = 'point_group' and not exists (
    select 1 from public.point_group pg
    where pg.id = p_cohort_id and pg.school_id = p_school_id and pg.ranked
  ) then
    return;
  end if;

  if p_cohort_kind = 'student_group' and not exists (
    select 1 from public.student_group sg
    where sg.id = p_cohort_id and sg.school_id = p_school_id and not sg.archived
      and (sg.timeframe_id is null or sg.timeframe_id = p_timeframe_id)
  ) then
    return;
  end if;

  return query
  with members as (
    select s.id, s.first_name, s.last_name, s.grade
    from public.student s
    where s.school_id = p_school_id
      and (p_cohort_kind <> 'grade' or s.grade = p_cohort_id)
      and (p_cohort_kind <> 'student_group' or exists (
        select 1 from public.student_group_pair sgp
        where sgp.student_id = s.id and sgp.student_group_id = p_cohort_id
      ))
  ),
  totals as (
    select m.id, m.first_name, m.last_name, m.grade, sum(sp.point_value)::bigint as total
    from members m
    join public.student_point sp on sp.student_id = m.id
    join public.point_event pe on pe.id = sp.point_event_id
    where pe.date >= _starts and pe.date <= _ends
      and (p_cohort_kind <> 'point_group' or pe.point_group_id = p_cohort_id)
    group by m.id, m.first_name, m.last_name, m.grade
    having sum(sp.point_value) > 0
  ),
  ranked as (
    select t.*,
      rank() over (order by t.total desc)::integer as rnk,
      count(*) over (partition by t.total)::integer as band,
      count(*) over ()::bigint as cohort_size
    from totals t
  )
  select r.rnk, r.first_name, r.last_name, r.grade, r.total
  from ranked r
  -- Shrink-only ties: a row is published only if its whole tied band ends inside the cut.
  where r.rnk + r.band - 1 <= public.publication_cut(r.cohort_size)
  order by r.rnk, r.last_name, r.first_name;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- points_to_next_rank: for one student, the points needed to reach the next distinct total above
-- them, per cohort. Overall always. Grade, point group and student group only when that cohort has
-- at least MIN_COHORT_FOR_AGGREGATE ranked participants (§10.2). A cohort is omitted when the student
-- is already first (nobody strictly above), and when the student's own total in it is 0 or below: such a
-- student is "not ranked yet" (D19) and has no next rank. The actor must be the student's own account or
-- a linked parent.
-- ---------------------------------------------------------------------------------------------
create or replace function public.points_to_next_rank(
  p_actor_user_id bigint,
  p_student_id bigint,
  p_timeframe_id bigint
)
returns table (cohort_kind text, cohort_id bigint, points_to_next bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  _school_id bigint;
  _grade bigint;
  _starts timestamptz;
  _ends timestamptz;
  _floor integer;
begin
  if not public.can_view_student(p_actor_user_id, p_student_id) then
    return;
  end if;

  select s.school_id, s.grade into _school_id, _grade from public.student s where s.id = p_student_id;
  select t.starts_at, t.ends_at into _starts, _ends
  from public.school_timeframes t
  where t.id = p_timeframe_id and t.school_id = _school_id;
  if _starts is null then
    return;
  end if;
  select p.min_cohort_for_aggregate into _floor from public.publication_cut_policy() p;

  return query
  with pts as (
    select sp.student_id, pe.point_group_id, sum(sp.point_value)::bigint as total
    from public.student_point sp
    join public.point_event pe on pe.id = sp.point_event_id
    join public.student s on s.id = sp.student_id and s.school_id = _school_id
    where pe.date >= _starts and pe.date <= _ends
    group by sp.student_id, pe.point_group_id
  ),
  overall as (
    select s.id as sid, s.grade, coalesce(sum(p.total), 0)::bigint as total
    from public.student s
    left join pts p on p.student_id = s.id
    where s.school_id = _school_id
    group by s.id, s.grade
  ),
  cohorts as (
    select 'overall'::text as kind, null::bigint as cid, o.sid, o.total from overall o
    union all
    select 'grade', _grade, o.sid, o.total from overall o where o.grade = _grade
    union all
    select 'point_group', pg.id, s.id, coalesce(p.total, 0)
    from public.point_group pg
    join public.student s on s.school_id = _school_id
    left join pts p on p.student_id = s.id and p.point_group_id = pg.id
    where pg.school_id = _school_id and pg.ranked
    union all
    select 'student_group', sg.id, o.sid, o.total
    from public.student_group_pair mine
    join public.student_group sg on sg.id = mine.student_group_id
      and sg.school_id = _school_id
      and not sg.archived
      and (sg.timeframe_id is null or sg.timeframe_id = p_timeframe_id)
    join public.student_group_pair sgp on sgp.student_group_id = sg.id
    join overall o on o.sid = sgp.student_id
    where mine.student_id = p_student_id
  ),
  summary as (
    select c.kind, c.cid,
      max(c.total) filter (where c.sid = p_student_id) as mine,
      count(*) filter (where c.total > 0) as participants
    from cohorts c
    group by c.kind, c.cid
  )
  select sm.kind, sm.cid,
    (select min(c.total) from cohorts c
      where c.kind = sm.kind and c.cid is not distinct from sm.cid and c.total > sm.mine) - sm.mine
  from summary sm
  where sm.mine is not null
    and sm.mine > 0
    and (sm.kind = 'overall' or sm.participants >= _floor)
    and exists (select 1 from cohorts c
      where c.kind = sm.kind and c.cid is not distinct from sm.cid and c.total > sm.mine)
  order by sm.kind, sm.cid;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Grants: service_role only (Supabase default privileges also grant anon/authenticated, so revoke).
-- ---------------------------------------------------------------------------------------------
revoke all on function public.publication_cut_policy() from public, anon, authenticated;
revoke all on function public.publication_cut(bigint) from public, anon, authenticated;
revoke all on function public.display_cut(bigint, bigint, text, bigint, bigint, uuid) from public, anon, authenticated;
revoke all on function public.points_to_next_rank(bigint, bigint, bigint) from public, anon, authenticated;
grant execute on function public.publication_cut_policy() to service_role;
grant execute on function public.publication_cut(bigint) to service_role;
grant execute on function public.display_cut(bigint, bigint, text, bigint, bigint, uuid) to service_role;
grant execute on function public.points_to_next_rank(bigint, bigint, bigint) to service_role;

-- ---------------------------------------------------------------------------------------------
-- Indexes for the queries above (baseline README finding 8).
-- display_cut / points_to_next_rank: student_point joined to point_event by point_event_id. The
--   existing unique index leads with student_id, so a scan from point_event has no index (~23k rows).
-- display_cut point_group cohort: point_event filtered by point_group_id and a date range.
-- every function here: student filtered by school_id (and grade for the grade cohort).
-- ---------------------------------------------------------------------------------------------
create index if not exists student_point_point_event_id_idx on public.student_point (point_event_id);
create index if not exists point_event_point_group_id_date_idx on public.point_event (point_group_id, date);
create index if not exists student_school_id_grade_idx on public.student (school_id, grade);
