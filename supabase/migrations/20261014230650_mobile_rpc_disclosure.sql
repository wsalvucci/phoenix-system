-- Phoenix Student Mobile RPCs brought under DATA_DISCLOSURE.md D14 (§10.12), D18 and D19 (§10.15).
--
-- Depends on: 20261014230300_publication_cut_functions.sql (publication_cut, publication_cut_policy).
-- get_led_group_member_points is handled by 20261014223157 and is not touched here.
-- get_active_timeframe, get_all_timeframes and get_my_groups are ALLOW as live and are not touched.
--
-- Every function keeps its exact signature and RETURNS TABLE shape. Denied values come back as NULL.
-- CREATE OR REPLACE keeps the existing grants; they are restated at the end. search_path is set to ''
-- here because CREATE OR REPLACE discards the "public, pg_temp" that file 1 pinned.
--
-- Rules applied (§10.12):
--   G1  Every p_timeframe_id, p_point_group_id, p_ranking_group_id and p_grade must resolve inside the
--       caller's school, else 0 rows. timeframe_bounds() (any school) is no longer used by these.
--   G2  Every peer list is publication_cut(size) per cohort, size = students in that cohort with a
--       total above 0 (D19), shrink-only ties: a row is published iff rank + tied_band - 1 <= cut.
--       visibility_config() no longer limits rows; leaderboard_top_* report n_absolute (a ceiling)
--       and rank_lookahead is 0. The two named neighbours above the caller are gone (D2).
--   G3  The caller's own row appears at its real rank, with its own points_change and rank_change,
--       but only when the caller is in the cohort (total > 0). An unranked caller gets no row (D19:
--       "not ranked yet", never last).
--   G4  Peer student_id is NULL. Peer points_change and rank_change are NULL (D10).
--   G5  Zero-point and negative-total students are never in a peer list (D19).
--   Group averages and every ranking-group figure need MIN_COHORT_FOR_AGGREGATE (10) members, counted
--   over every member, zeros included, because that is what the average is taken over (§10.15).
--   top_student_points is always NULL. Per-event rank and participant count need >= K_HIDDEN + 1 (4)
--   participants (§10.12 policy gap, proposed ruling in force).
--   Point-group cohorts require point_group.ranked (D18).
--
-- Correctness fix carried with this file (it changes numbers the app shows): the live bodies of
-- get_grade_leaderboard, get_dashboard_totals (rank only), get_my_visibility_snapshot (overall and
-- grade rank), get_student_group_leaderboard and get_ranking_group_leaderboard LEFT JOINed point_event
-- with the timeframe in the ON clause and then summed student_point.point_value regardless, so they
-- ranked and averaged on ALL-TIME points. Every total here is the timeframe total, as the school and
-- point-group leaderboards already were.
--
-- No table, column or row changes. Two new internal helpers, service_role only.

-- ---------------------------------------------------------------------------------------------
-- Helpers. SECURITY INVOKER: they run as the owner of the SECURITY DEFINER caller. No API role may
-- call them, because they take a student id and a school id from the caller.
-- ---------------------------------------------------------------------------------------------

-- One cohort's published board for one viewer: rows above the cut, plus the viewer's own row if the
-- viewer is ranked. p_kind in ('overall', 'grade', 'point_group'); p_cohort_id is the grade number or
-- point_group.id (ignored for 'overall'). The caller has already validated school, timeframe and
-- cohort. p_cutoff splits "previous" points for the viewer's own change figures.
create or replace function public.mobile_cohort_board(
  p_viewer_student_id bigint,
  p_school_id bigint,
  p_starts timestamptz,
  p_ends timestamptz,
  p_cutoff timestamptz,
  p_kind text,
  p_cohort_id bigint
)
returns table (
  rank bigint, student_id bigint, first_name text, last_name text, total_points bigint,
  points_change bigint, rank_change bigint, is_current_student boolean
)
language sql
stable
set search_path = ''
as $$
  with pts as (
    select s.id as sid, s.first_name::text as fname, s.last_name::text as lname,
      sum(sp.point_value)::bigint as total_pts,
      coalesce(sum(sp.point_value) filter (where pe.date < p_cutoff), 0)::bigint as prev_pts
    from public.student s
    join public.student_point sp on sp.student_id = s.id
    join public.point_event pe on pe.id = sp.point_event_id
    where s.school_id = p_school_id
      and pe.date >= p_starts and pe.date <= p_ends
      and (p_kind <> 'grade' or s.grade = p_cohort_id)
      and (p_kind <> 'point_group' or pe.point_group_id = p_cohort_id)
    group by s.id, s.first_name, s.last_name
  ),
  ranked as (
    select p.*,
      rank() over (order by p.total_pts desc)::bigint as rnk,
      count(*) over (partition by p.total_pts)::bigint as band,
      count(*) over ()::bigint as cohort_size
    from pts p
    where p.total_pts > 0
  ),
  prev_ranked as (
    select p.sid, rank() over (order by p.prev_pts desc)::bigint as prev_rnk
    from pts p
    where p.prev_pts > 0
  )
  select
    r.rnk,
    case when r.sid = p_viewer_student_id then r.sid end,
    r.fname,
    r.lname,
    r.total_pts,
    case when r.sid = p_viewer_student_id then r.total_pts - r.prev_pts end,
    case when r.sid = p_viewer_student_id then pr.prev_rnk - r.rnk end,
    (r.sid = p_viewer_student_id)
  from ranked r
  left join prev_ranked pr on pr.sid = r.sid
  where r.rnk + r.band - 1 <= public.publication_cut(r.cohort_size)
     or r.sid = p_viewer_student_id
  order by r.rnk, r.lname, r.fname;
$$;

-- One student's own rank and the D19 cohort size (own denominator, D5). 0 rows when the student's
-- total in that cohort is 0 or below.
create or replace function public.mobile_own_rank(
  p_student_id bigint,
  p_school_id bigint,
  p_starts timestamptz,
  p_ends timestamptz,
  p_kind text,
  p_cohort_id bigint
)
returns table (own_rank bigint, cohort_size bigint)
language sql
stable
set search_path = ''
as $$
  with totals as (
    select s.id as sid, sum(sp.point_value) as total
    from public.student s
    join public.student_point sp on sp.student_id = s.id
    join public.point_event pe on pe.id = sp.point_event_id
    where s.school_id = p_school_id
      and pe.date >= p_starts and pe.date <= p_ends
      and (p_kind <> 'grade' or s.grade = p_cohort_id)
      and (p_kind <> 'point_group' or pe.point_group_id = p_cohort_id)
    group by s.id
    having sum(sp.point_value) > 0
  ),
  ranked as (
    select t.sid,
      rank() over (order by t.total desc)::bigint as rnk,
      count(*) over ()::bigint as n
    from totals t
  )
  select r.rnk, r.n from ranked r where r.sid = p_student_id;
$$;

-- ---------------------------------------------------------------------------------------------
-- get_school_leaderboard
-- ---------------------------------------------------------------------------------------------
create or replace function public.get_school_leaderboard(p_timeframe_id bigint)
returns table (
  rank bigint, student_id bigint, first_name text, last_name text, total_points bigint,
  points_change bigint, rank_change bigint, is_current_student boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_student_id bigint;
  v_school_id  bigint;
  v_starts     timestamptz;
  v_ends       timestamptz;
  v_days       integer;
begin
  select cs.student_id, cs.school_id into v_student_id, v_school_id
  from public.auth_current_student() cs;
  if v_student_id is null then return; end if;

  select t.starts_at, t.ends_at into v_starts, v_ends
  from public.school_timeframes t
  where t.id = p_timeframe_id and t.school_id = v_school_id;
  if v_starts is null then return; end if;

  select vc.change_window_days into v_days from public.visibility_config() vc;

  return query
  select b.rank, b.student_id, b.first_name, b.last_name, b.total_points,
    b.points_change, b.rank_change, b.is_current_student
  from public.mobile_cohort_board(
    v_student_id, v_school_id, v_starts, v_ends,
    public.visibility_change_cutoff(v_starts, v_ends, v_days), 'overall', null
  ) b;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- get_grade_leaderboard: any grade of the caller's school, each with its own cut.
-- ---------------------------------------------------------------------------------------------
create or replace function public.get_grade_leaderboard(p_grade bigint, p_timeframe_id bigint)
returns table (
  rank bigint, student_id bigint, first_name text, last_name text, total_points bigint,
  is_current_student boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_student_id bigint;
  v_school_id  bigint;
  v_starts     timestamptz;
  v_ends       timestamptz;
begin
  select cs.student_id, cs.school_id into v_student_id, v_school_id
  from public.auth_current_student() cs;
  if v_student_id is null or p_grade is null then return; end if;

  select t.starts_at, t.ends_at into v_starts, v_ends
  from public.school_timeframes t
  where t.id = p_timeframe_id and t.school_id = v_school_id;
  if v_starts is null then return; end if;

  -- The change cutoff is irrelevant here (no change columns); pass the start.
  return query
  select b.rank, b.student_id, b.first_name, b.last_name, b.total_points, b.is_current_student
  from public.mobile_cohort_board(
    v_student_id, v_school_id, v_starts, v_ends, v_starts, 'grade', p_grade
  ) b;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- get_point_group_leaderboard: point group must be in the caller's school and ranked (D18).
-- ---------------------------------------------------------------------------------------------
create or replace function public.get_point_group_leaderboard(p_point_group_id bigint, p_timeframe_id bigint)
returns table (
  rank bigint, student_id bigint, first_name text, last_name text, total_points bigint,
  points_change bigint, rank_change bigint, is_current_student boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_student_id bigint;
  v_school_id  bigint;
  v_starts     timestamptz;
  v_ends       timestamptz;
  v_days       integer;
begin
  select cs.student_id, cs.school_id into v_student_id, v_school_id
  from public.auth_current_student() cs;
  if v_student_id is null then return; end if;

  if not exists (
    select 1 from public.point_group pg
    where pg.id = p_point_group_id and pg.school_id = v_school_id and pg.ranked
  ) then
    return;
  end if;

  select t.starts_at, t.ends_at into v_starts, v_ends
  from public.school_timeframes t
  where t.id = p_timeframe_id and t.school_id = v_school_id;
  if v_starts is null then return; end if;

  select vc.change_window_days into v_days from public.visibility_config() vc;

  return query
  select b.rank, b.student_id, b.first_name, b.last_name, b.total_points,
    b.points_change, b.rank_change, b.is_current_student
  from public.mobile_cohort_board(
    v_student_id, v_school_id, v_starts, v_ends,
    public.visibility_change_cutoff(v_starts, v_ends, v_days), 'point_group', p_point_group_id
  ) b;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- get_dashboard_totals: own data. school_rank and total_students over the D19 cohort; both NULL for
-- a caller whose timeframe total is 0 or below.
-- ---------------------------------------------------------------------------------------------
create or replace function public.get_dashboard_totals(p_timeframe_id bigint)
returns table (
  student_id bigint, total_points bigint, school_rank bigint, total_students bigint,
  first_name text, last_name text, school_name text
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_student_id  bigint;
  v_school_id   bigint;
  v_first_name  text;
  v_last_name   text;
  v_school_name text;
  v_starts      timestamptz;
  v_ends        timestamptz;
  v_total       bigint;
  v_rank        bigint;
  v_size        bigint;
begin
  select u.student_id, s.school_id, s.first_name, s.last_name, sc.name
  into v_student_id, v_school_id, v_first_name, v_last_name, v_school_name
  from public."user" u
  join public.student s on s.id = u.student_id
  join public.school sc on sc.id = s.school_id
  where u.supabase_id = auth.uid();
  if v_student_id is null then return; end if;

  select t.starts_at, t.ends_at into v_starts, v_ends
  from public.school_timeframes t
  where t.id = p_timeframe_id and t.school_id = v_school_id;
  if v_starts is null then return; end if;

  select coalesce(sum(sp.point_value), 0)::bigint into v_total
  from public.student_point sp
  join public.point_event pe on pe.id = sp.point_event_id
  where sp.student_id = v_student_id
    and pe.date >= v_starts and pe.date <= v_ends;

  select r.own_rank, r.cohort_size into v_rank, v_size
  from public.mobile_own_rank(v_student_id, v_school_id, v_starts, v_ends, 'overall', null) r;

  return query
  select v_student_id, v_total, v_rank, v_size, v_first_name, v_last_name, v_school_name::text;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- get_my_visibility_snapshot: own ranks over D19 cohorts (NULL when unranked); category_ranks lists
-- only ranked point groups where the caller is ranked. leaderboard_top_* = n_absolute (a ceiling, not
-- a count), rank_lookahead = 0.
-- ---------------------------------------------------------------------------------------------
create or replace function public.get_my_visibility_snapshot(p_timeframe_id bigint)
returns table (
  timeframe_id bigint, leaderboard_top_overall integer, leaderboard_top_per_category integer,
  leaderboard_top_per_grade integer, rank_lookahead integer, change_window_days integer,
  led_group_ids bigint[], student_id bigint, grade bigint, overall_rank bigint, grade_rank bigint,
  category_ranks jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_student_id     bigint;
  v_school_id      bigint;
  v_grade          bigint;
  v_starts         timestamptz;
  v_ends           timestamptz;
  v_top            integer;
  v_days           integer;
  v_overall_rank   bigint;
  v_grade_rank     bigint;
  v_led_groups     bigint[];
  v_category_ranks jsonb;
begin
  select cs.student_id, cs.school_id, cs.grade into v_student_id, v_school_id, v_grade
  from public.auth_current_student() cs;
  if v_student_id is null then return; end if;

  select t.starts_at, t.ends_at into v_starts, v_ends
  from public.school_timeframes t
  where t.id = p_timeframe_id and t.school_id = v_school_id;
  if v_starts is null then return; end if;

  select p.n_absolute into v_top from public.publication_cut_policy() p;
  select vc.change_window_days into v_days from public.visibility_config() vc;

  select r.own_rank into v_overall_rank
  from public.mobile_own_rank(v_student_id, v_school_id, v_starts, v_ends, 'overall', null) r;

  if v_grade is not null then
    select r.own_rank into v_grade_rank
    from public.mobile_own_rank(v_student_id, v_school_id, v_starts, v_ends, 'grade', v_grade) r;
  end if;

  select coalesce(array_agg(distinct sgl.group_id order by sgl.group_id), array[]::bigint[])
  into v_led_groups
  from public.student_group_leaders sgl
  join public.student_group sg on sg.id = sgl.group_id
    and not sg.archived
    and sg.school_id = v_school_id
  where sgl.student_id = v_student_id
    and (sg.timeframe_id is null or sg.timeframe_id = p_timeframe_id);

  select coalesce(jsonb_agg(
    jsonb_build_object('point_group_id', pg.id, 'point_group_name', pg.name, 'rank', r.own_rank)
    order by pg.name
  ), '[]'::jsonb)
  into v_category_ranks
  from public.point_group pg
  cross join lateral public.mobile_own_rank(v_student_id, v_school_id, v_starts, v_ends, 'point_group', pg.id) r
  where pg.school_id = v_school_id and pg.ranked;

  return query select
    p_timeframe_id, v_top, v_top, v_top, 0, v_days, v_led_groups, v_student_id, v_grade,
    v_overall_rank, v_grade_rank, v_category_ranks;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- get_category_breakdown: own per-point-group totals (ranked or not; own data, §10.15). G1 added.
-- ---------------------------------------------------------------------------------------------
create or replace function public.get_category_breakdown(p_timeframe_id bigint)
returns table (point_group_id bigint, point_group_name text, color text, total_points bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with current_student as (
    select s.id as student_id, s.school_id
    from public."user" u
    join public.student s on s.id = u.student_id
    where u.supabase_id = auth.uid()
  ),
  tf as (
    select t.starts_at, t.ends_at
    from public.school_timeframes t
    join current_student cs on cs.school_id = t.school_id
    where t.id = p_timeframe_id
  )
  select pg.id, pg.name::text, pg.color, sum(sp.point_value)::bigint
  from current_student cs
  cross join tf
  join public.student_point sp on sp.student_id = cs.student_id
  join public.point_event pe on pe.id = sp.point_event_id
    and pe.date >= tf.starts_at
    and pe.date <= tf.ends_at
    and pe.point_group_id is not null
  join public.point_group pg on pg.id = pe.point_group_id and pg.school_id = cs.school_id
  group by pg.id, pg.name, pg.color
  order by sum(sp.point_value) desc;
$$;

-- ---------------------------------------------------------------------------------------------
-- get_point_history: own events. G1 added. event_rank and event_participant_count are NULL unless the
-- event has at least K_HIDDEN + 1 (4) participants. Ties share the better rank (RANK()).
-- ---------------------------------------------------------------------------------------------
create or replace function public.get_point_history(p_timeframe_id bigint, p_page integer, p_page_size integer)
returns table (
  id bigint, event_name text, point_group_name text, point_group_color text, point_value bigint,
  event_date timestamptz, event_rank bigint, event_participant_count bigint
)
language sql
security definer
set search_path = ''
as $$
  with current_student as (
    select s.id as student_id, s.school_id
    from public."user" u
    join public.student s on s.id = u.student_id
    where u.supabase_id = auth.uid()
  ),
  tf as (
    select t.starts_at, t.ends_at
    from public.school_timeframes t
    join current_student cs on cs.school_id = t.school_id
    where t.id = p_timeframe_id
  ),
  min_participants as (
    select (p.k_hidden + 1)::bigint as n from public.publication_cut_policy() p
  ),
  my_event_ids as (
    select distinct sp.point_event_id
    from current_student cs
    cross join tf
    join public.student_point sp on sp.student_id = cs.student_id
    join public.point_event pe on pe.id = sp.point_event_id
      and pe.date >= tf.starts_at
      and pe.date <= tf.ends_at
  ),
  event_ranks as (
    select
      sp2.id as student_point_id,
      rank() over (partition by sp2.point_event_id order by sp2.point_value desc)::bigint as event_rank,
      count(*) over (partition by sp2.point_event_id)::bigint as participant_count
    from public.student_point sp2
    where sp2.point_event_id in (select m.point_event_id from my_event_ids m)
  )
  select
    sp.id,
    coalesce(pe.name, pt.name),
    pg.name::text,
    pg.color,
    sp.point_value,
    pe.date,
    case when er.participant_count >= mp.n then er.event_rank end,
    case when er.participant_count >= mp.n then er.participant_count end
  from current_student cs
  cross join tf
  cross join min_participants mp
  join public.student_point sp on sp.student_id = cs.student_id
  join public.point_event pe on pe.id = sp.point_event_id
    and pe.date >= tf.starts_at
    and pe.date <= tf.ends_at
  left join public.point_group pg on pg.id = pe.point_group_id
  left join public.point_template pt on pt.id = pe.template_id
  join event_ranks er on er.student_point_id = sp.id
  order by pe.date desc, sp.id desc
  limit p_page_size
  offset (p_page - 1) * p_page_size;
$$;

-- ---------------------------------------------------------------------------------------------
-- get_student_group_leaderboard: own group. avg_points NULL below MIN_COHORT_FOR_AGGREGATE members
-- (hard rule 5). The average is over every member's timeframe total, zeros included, and the floor
-- counts those same members.
-- ---------------------------------------------------------------------------------------------
create or replace function public.get_student_group_leaderboard(p_group_id bigint, p_timeframe_id bigint)
returns table (
  group_id bigint, group_name text, member_count bigint, avg_points numeric,
  is_leader boolean, is_member boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_student_id bigint;
  v_school_id  bigint;
  v_starts     timestamptz;
  v_ends       timestamptz;
  v_is_member  boolean;
  v_is_leader  boolean;
  v_floor      integer;
begin
  select cs.student_id, cs.school_id into v_student_id, v_school_id
  from public.auth_current_student() cs;
  if v_student_id is null then return; end if;

  select t.starts_at, t.ends_at into v_starts, v_ends
  from public.school_timeframes t
  where t.id = p_timeframe_id and t.school_id = v_school_id;
  if v_starts is null then return; end if;

  select exists (
    select 1 from public.student_group_pair sgp
    where sgp.student_group_id = p_group_id and sgp.student_id = v_student_id
  ) into v_is_member;
  select exists (
    select 1 from public.student_group_leaders sgl
    where sgl.group_id = p_group_id and sgl.student_id = v_student_id
  ) into v_is_leader;
  if not v_is_member and not v_is_leader then return; end if;

  select p.min_cohort_for_aggregate into v_floor from public.publication_cut_policy() p;

  return query
  with members as (
    select sgp.student_id as sid
    from public.student_group_pair sgp
    where sgp.student_group_id = p_group_id
  ),
  member_pts as (
    select m.sid,
      coalesce((
        select sum(sp.point_value)
        from public.student_point sp
        join public.point_event pe on pe.id = sp.point_event_id
        where sp.student_id = m.sid and pe.date >= v_starts and pe.date <= v_ends
      ), 0)::bigint as pts
    from members m
  ),
  agg as (
    select count(*)::bigint as n, coalesce(avg(mp.pts), 0) as avg_pts from member_pts mp
  )
  select sg.id::bigint, sg.name::text, a.n,
    case when a.n >= v_floor then a.avg_pts end,
    v_is_leader, v_is_member
  from public.student_group sg
  cross join agg a
  where sg.id = p_group_id
    and sg.school_id = v_school_id
    and not sg.archived
    and (sg.timeframe_id is null or sg.timeframe_id = p_timeframe_id);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- get_ranking_group_leaderboard: the ranking group must be in the caller's school, bound to this
-- timeframe, and the caller must belong to one of its groups. A group with fewer than
-- MIN_COHORT_FOR_AGGREGATE members gets its name only: NULL rank and NULL figures, and it is left out
-- when the others are ranked. top_student_points is always NULL.
-- ---------------------------------------------------------------------------------------------
create or replace function public.get_ranking_group_leaderboard(p_ranking_group_id bigint, p_timeframe_id bigint)
returns table (
  rank bigint, group_id bigint, group_name text, avg_student_points numeric, group_points bigint,
  top_student_points bigint, total_score numeric, is_current_student_group boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_student_id bigint;
  v_school_id  bigint;
  v_starts     timestamptz;
  v_ends       timestamptz;
  v_floor      integer;
begin
  select cs.student_id, cs.school_id into v_student_id, v_school_id
  from public.auth_current_student() cs;
  if v_student_id is null then return; end if;

  if not exists (
    select 1 from public.ranking_group rg
    where rg.id = p_ranking_group_id
      and rg.school_id = v_school_id
      and rg.timeframe_id = p_timeframe_id
  ) then
    return;
  end if;

  select t.starts_at, t.ends_at into v_starts, v_ends
  from public.school_timeframes t
  where t.id = p_timeframe_id and t.school_id = v_school_id;
  if v_starts is null then return; end if;

  if not exists (
    select 1
    from public.ranking_group_pair rgp
    join public.student_group_pair sgp
      on sgp.student_group_id = rgp.student_group_id and sgp.student_id = v_student_id
    where rgp.ranking_group_id = p_ranking_group_id
  ) then
    return;
  end if;

  select p.min_cohort_for_aggregate into v_floor from public.publication_cut_policy() p;

  return query
  with member_groups as (
    select sg.id as sgid, sg.name::text as gname
    from public.ranking_group_pair rgp
    join public.student_group sg on sg.id = rgp.student_group_id and sg.school_id = v_school_id
    where rgp.ranking_group_id = p_ranking_group_id
  ),
  student_pts as (
    select sgp.student_group_id as sgid, sgp.student_id as sid,
      coalesce((
        select sum(sp.point_value)
        from public.student_point sp
        join public.point_event pe on pe.id = sp.point_event_id
        where sp.student_id = sgp.student_id and pe.date >= v_starts and pe.date <= v_ends
      ), 0)::bigint as student_total
    from public.student_group_pair sgp
    join member_groups mg on mg.sgid = sgp.student_group_id
  ),
  group_stats as (
    select st.sgid, count(*)::bigint as n, avg(st.student_total) as avg_pts
    from student_pts st
    group by st.sgid
  ),
  group_exclusive_pts as (
    select gp.student_group_id as sgid, coalesce(sum(gp.value), 0)::bigint as group_pts
    from public.student_group_point gp
    join public.ranking_group_point_event rgpe
      on rgpe.id = gp.ranking_group_point_event_id
      and rgpe.ranking_group_id = p_ranking_group_id
      and rgpe.date >= v_starts
      and rgpe.date <= v_ends
    group by gp.student_group_id
  ),
  scores as (
    select mg.sgid, mg.gname,
      coalesce(gs.n, 0) >= v_floor as eligible,
      coalesce(gs.avg_pts, 0) as avg_pts,
      coalesce(gep.group_pts, 0)::bigint as gpts,
      coalesce(gs.avg_pts, 0) + coalesce(gep.group_pts, 0) as score,
      exists (
        select 1 from public.student_group_pair x
        where x.student_group_id = mg.sgid and x.student_id = v_student_id
      ) as is_mine
    from member_groups mg
    left join group_stats gs on gs.sgid = mg.sgid
    left join group_exclusive_pts gep on gep.sgid = mg.sgid
  ),
  ranked as (
    select sc.sgid, rank() over (order by sc.score desc)::bigint as rnk
    from scores sc
    where sc.eligible
  )
  select r.rnk, sc.sgid, sc.gname,
    case when sc.eligible then sc.avg_pts end,
    case when sc.eligible then sc.gpts end,
    null::bigint,
    case when sc.eligible then sc.score end,
    sc.is_mine
  from scores sc
  left join ranked r on r.sgid = sc.sgid
  order by r.rnk nulls last, sc.gname, sc.sgid;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- get_available_leaderboard_scopes: a scope is listed only if its leaderboard would publish
-- something. school / grade / point_group: that cohort's publication_cut > 0 (point_group also
-- ranked). student_group: in the caller's school, member, not archived, and >= the aggregate floor
-- (otherwise the average is NULL and the board has no figures). ranking_group: in the caller's school,
-- bound to the timeframe, the caller a member, and at least one of its groups at or above the floor.
-- Nothing is listed for a timeframe outside the caller's school (G1).
-- ---------------------------------------------------------------------------------------------
create or replace function public.get_available_leaderboard_scopes(p_timeframe_id bigint)
returns table (scope_type text, scope_id bigint, scope_name text)
language sql
stable
security definer
set search_path = ''
as $$
  with current_student as (
    select cs.student_id, cs.school_id from public.auth_current_student() cs limit 1
  ),
  tf as (
    select t.starts_at, t.ends_at
    from public.school_timeframes t
    join current_student cs on cs.school_id = t.school_id
    where t.id = p_timeframe_id
  ),
  pol_cfg as (
    select p.min_cohort_for_aggregate as floor_n from public.publication_cut_policy() p
  ),
  per_group as (
    select s.id as sid, s.grade, pe.point_group_id as pgid, sum(sp.point_value) as total
    from current_student cs
    cross join tf
    join public.student s on s.school_id = cs.school_id
    join public.student_point sp on sp.student_id = s.id
    join public.point_event pe on pe.id = sp.point_event_id
      and pe.date >= tf.starts_at and pe.date <= tf.ends_at
    group by s.id, s.grade, pe.point_group_id
  ),
  overall as (
    select pg.sid, pg.grade, sum(pg.total) as total from per_group pg group by pg.sid, pg.grade
  )
  select 'school'::text, cs.school_id, sc.name::text
  from current_student cs
  join public.school sc on sc.id = cs.school_id
  where public.publication_cut((select count(*) from overall o where o.total > 0)) > 0

  union all

  select 'grade'::text, o.grade, ('Grade ' || o.grade)::text
  from overall o
  where o.total > 0 and o.grade is not null
  group by o.grade
  having public.publication_cut(count(*)) > 0

  union all

  select 'point_group'::text, pg.id, pg.name::text
  from current_student cs
  join public.point_group pg on pg.school_id = cs.school_id and pg.ranked
  where public.publication_cut((
    select count(*) from per_group x where x.pgid = pg.id and x.total > 0
  )) > 0

  union all

  select 'student_group'::text, sg.id, sg.name::text
  from current_student cs
  cross join pol_cfg pol
  join public.student_group_pair sgp on sgp.student_id = cs.student_id
  join public.student_group sg on sg.id = sgp.student_group_id
    and sg.school_id = cs.school_id
    and not sg.archived
    and (sg.timeframe_id is null or sg.timeframe_id = p_timeframe_id)
  where exists (select 1 from tf)
    and (select count(*) from public.student_group_pair m where m.student_group_id = sg.id) >= pol.floor_n

  union all

  select distinct 'ranking_group'::text, rg.id, rg.name::text
  from current_student cs
  cross join pol_cfg pol
  join public.student_group_pair sgp on sgp.student_id = cs.student_id
  join public.ranking_group_pair rgp on rgp.student_group_id = sgp.student_group_id
  join public.ranking_group rg on rg.id = rgp.ranking_group_id
    and rg.school_id = cs.school_id
    and rg.timeframe_id = p_timeframe_id
  where exists (select 1 from tf)
    and exists (
      select 1
      from public.ranking_group_pair rgp2
      join public.student_group sg2 on sg2.id = rgp2.student_group_id and sg2.school_id = cs.school_id
      where rgp2.ranking_group_id = rg.id
        and (select count(*) from public.student_group_pair m where m.student_group_id = sg2.id) >= pol.floor_n
    );
$$;

-- ---------------------------------------------------------------------------------------------
-- Grants. The 10 amended mobile functions keep EXECUTE for authenticated (restated; CREATE OR REPLACE
-- already preserves it). The helpers are service_role only.
-- ---------------------------------------------------------------------------------------------
revoke all on function public.mobile_cohort_board(bigint, bigint, timestamptz, timestamptz, timestamptz, text, bigint) from public, anon, authenticated;
revoke all on function public.mobile_own_rank(bigint, bigint, timestamptz, timestamptz, text, bigint) from public, anon, authenticated;
grant execute on function public.mobile_cohort_board(bigint, bigint, timestamptz, timestamptz, timestamptz, text, bigint) to service_role;
grant execute on function public.mobile_own_rank(bigint, bigint, timestamptz, timestamptz, text, bigint) to service_role;

revoke all on function public.get_school_leaderboard(bigint) from public, anon;
revoke all on function public.get_grade_leaderboard(bigint, bigint) from public, anon;
revoke all on function public.get_point_group_leaderboard(bigint, bigint) from public, anon;
revoke all on function public.get_dashboard_totals(bigint) from public, anon;
revoke all on function public.get_my_visibility_snapshot(bigint) from public, anon;
revoke all on function public.get_category_breakdown(bigint) from public, anon;
revoke all on function public.get_point_history(bigint, integer, integer) from public, anon;
revoke all on function public.get_student_group_leaderboard(bigint, bigint) from public, anon;
revoke all on function public.get_ranking_group_leaderboard(bigint, bigint) from public, anon;
revoke all on function public.get_available_leaderboard_scopes(bigint) from public, anon;

grant execute on function public.get_school_leaderboard(bigint) to authenticated, service_role;
grant execute on function public.get_grade_leaderboard(bigint, bigint) to authenticated, service_role;
grant execute on function public.get_point_group_leaderboard(bigint, bigint) to authenticated, service_role;
grant execute on function public.get_dashboard_totals(bigint) to authenticated, service_role;
grant execute on function public.get_my_visibility_snapshot(bigint) to authenticated, service_role;
grant execute on function public.get_category_breakdown(bigint) to authenticated, service_role;
grant execute on function public.get_point_history(bigint, integer, integer) to authenticated, service_role;
grant execute on function public.get_student_group_leaderboard(bigint, bigint) to authenticated, service_role;
grant execute on function public.get_ranking_group_leaderboard(bigint, bigint) to authenticated, service_role;
grant execute on function public.get_available_leaderboard_scopes(bigint) to authenticated, service_role;
