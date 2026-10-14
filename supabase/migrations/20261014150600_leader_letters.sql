-- "Groups You Lead" per-point-group letters (DATA_DISCLOSURE.md D13, §10.7 L1-L12). Additive.
--
-- Scale and bands (owner's answer and authority's final bands, 2026-10-14):
--   p = (students in the school's point-group cohort with a strictly LOWER total) / (cohort size)
--   S >= 0.93, A >= 0.75, B >= 0.57, C >= 0.39, D >= 0.20, E < 0.20. Ties share the better band,
--   which "strictly lower" gives automatically.
-- Cohort (L4): students of the school with a point-group total > 0 in the school's current timeframe
--   (the "ranked students"). If the cohort has fewer than 30 students, that point group gets no letters
--   at all, so every leader's column for it is null.
--   A student with no points in the category gets E (p = 0). See BACKEND_PLAN.md decision LL-1: this
--   needs privacy-boundary's confirmation.
-- Columns (L5): point groups of the school with at least one event in the current timeframe.
-- Stability (L9): letters are read only from a snapshot, refreshed at most once per day per school
--   (UTC date; decision LL-2). Only the CURRENT snapshot is kept, and the previous one is deleted on
--   refresh, so no letter history exists to diff (L7).
-- Suppression (L8), per (group, point group) column. Shown only if ALL of these hold:
--   at least 6 members besides the leader; the point group met the cohort floor; every member has a
--   snapshot letter (a student enrolled since the snapshot would otherwise be a gap); and the number of
--   members holding D is 0 or at least 3, and likewise for E. Otherwise the whole column is null.
-- Output (L2): names, point group id/name/colour and the letter only. No points, percentile, cohort
--   size, count, or student id. The server replaces row identity with an opaque per-response key.
-- Audience: get_leader_group_letters is LEADER ONLY. The actor must be the student's own account
--   (student."linkedUser"), never a parent (L11). get_own_led_letters is the member's own view (L10),
--   for the student or a linked parent.
-- Service_role only. The server resolves the actor from the session. Nothing takes a group id.

create table public.leader_letter_run (
  school_id bigint primary key references public.school (id) on update cascade on delete cascade,
  timeframe_id bigint not null references public.school_timeframes (id) on update cascade on delete cascade,
  snapshot_date date not null,
  taken_at timestamptz not null default now(),
  -- Every point group active in the timeframe, including ones that missed the cohort floor.
  point_group_ids bigint[] not null default '{}'
);

create table public.leader_letter (
  school_id bigint not null references public.leader_letter_run (school_id) on update cascade on delete cascade,
  point_group_id bigint not null references public.point_group (id) on update cascade on delete cascade,
  student_id bigint not null references public.student (id) on update cascade on delete cascade,
  letter character(1) not null check (letter in ('S', 'A', 'B', 'C', 'D', 'E')),
  primary key (school_id, point_group_id, student_id)
);
-- Serves the per-member lookups in both read functions (student_id within a school).
create index leader_letter_student_idx on public.leader_letter (student_id);

alter table public.leader_letter_run enable row level security;
alter table public.leader_letter enable row level security;
revoke all on table public.leader_letter_run from anon, authenticated;
revoke all on table public.leader_letter from anon, authenticated;
grant all on table public.leader_letter_run to service_role;
grant all on table public.leader_letter to service_role;

create or replace function public.letter_for_share_below(p numeric)
returns character(1)
language sql
immutable
set search_path = ''
as $$
  select case
    when p >= 0.93 then 'S'
    when p >= 0.75 then 'A'
    when p >= 0.57 then 'B'
    when p >= 0.39 then 'C'
    when p >= 0.20 then 'D'
    else 'E'
  end::character(1);
$$;

-- Recompute the school's snapshot if it is not from today (or the active timeframe changed). Returns
-- the run's timeframe id, or null when the school has no active timeframe (then every letter is null).
create or replace function public.refresh_leader_letters(p_school_id bigint)
returns bigint
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  _tf bigint;
  _starts timestamptz;
  _ends timestamptz;
  _today date := (now() at time zone 'utc')::date;
  _run public.leader_letter_run%rowtype;
  _floor constant integer := 30;
begin
  perform pg_advisory_xact_lock(hashtextextended('leader_letters:' || p_school_id::text, 0));

  select t.id, t.starts_at, t.ends_at into _tf, _starts, _ends
  from public.school_timeframes t
  where t.school_id = p_school_id and t.active
  order by t.starts_at desc
  limit 1;

  select * into _run from public.leader_letter_run r where r.school_id = p_school_id;

  if _tf is null then
    delete from public.leader_letter_run r where r.school_id = p_school_id;
    return null;
  end if;
  if _run.school_id is not null and _run.snapshot_date = _today and _run.timeframe_id = _tf then
    return _tf;
  end if;

  delete from public.leader_letter_run r where r.school_id = p_school_id;  -- cascades to letters

  insert into public.leader_letter_run (school_id, timeframe_id, snapshot_date, point_group_ids)
  select p_school_id, _tf, _today, coalesce(array_agg(distinct pe.point_group_id order by pe.point_group_id), '{}')
  from public.point_event pe
  join public.point_group pg on pg.id = pe.point_group_id and pg.school_id = p_school_id
  where pe.date >= _starts and pe.date <= _ends;

  insert into public.leader_letter (school_id, point_group_id, student_id, letter)
  with active_groups as (
    select unnest(r.point_group_ids) as pgid from public.leader_letter_run r where r.school_id = p_school_id
  ),
  totals as (
    select pe.point_group_id as pgid, sp.student_id, sum(sp.point_value) as total
    from public.student_point sp
    join public.point_event pe on pe.id = sp.point_event_id
    join public.student s on s.id = sp.student_id and s.school_id = p_school_id
    where pe.date >= _starts and pe.date <= _ends
      and pe.point_group_id in (select ag.pgid from active_groups ag)
    group by pe.point_group_id, sp.student_id
    having sum(sp.point_value) > 0
  ),
  cohort as (
    select t.pgid, t.student_id,
      -- rank() ascending minus 1 = the number of cohort members with a strictly lower total.
      (rank() over (partition by t.pgid order by t.total asc) - 1)::numeric
        / count(*) over (partition by t.pgid) as share_below,
      count(*) over (partition by t.pgid) as size
    from totals t
  ),
  eligible as (
    select c.pgid from cohort c group by c.pgid having max(c.size) >= _floor
  )
  select p_school_id, e.pgid, s.id,
    coalesce(public.letter_for_share_below(c.share_below), 'E')
  from eligible e
  join public.student s on s.school_id = p_school_id
  left join cohort c on c.pgid = e.pgid and c.student_id = s.id;

  return _tf;
end;
$$;

-- Leader view (L1, L2, L6, L8). One row per (led group, member, active point group), sorted by group
-- name, member last name, first name, then point group name. letter is null when the column is
-- suppressed, for every member alike.
create or replace function public.get_leader_group_letters(p_actor_user_id bigint)
returns table (
  group_id bigint, group_name text,
  member_first_name text, member_last_name text, member_ordinal integer,
  point_group_id bigint, point_group_name text, point_group_color text,
  letter text
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  _leader bigint;
  _school bigint;
  _tf bigint;
begin
  -- Own student account only. A parent session resolves to no student here (L11).
  select s.id, s.school_id into _leader, _school
  from public.student s where s."linkedUser" = p_actor_user_id
  order by s.id limit 1;
  if _leader is null then
    return;
  end if;
  _tf := public.refresh_leader_letters(_school);

  return query
  with groups as (
    select sg.id, sg.name::text as name
    from public.student_group_leaders sgl
    join public.student_group sg on sg.id = sgl.group_id
    where sgl.student_id = _leader and not sg.archived
      and sg.school_id = _school
      and (sg.timeframe_id is null or sg.timeframe_id = _tf)
    group by sg.id, sg.name
  ),
  members as (
    select g.id as gid, s.id as sid, s.first_name, s.last_name,
      (row_number() over (partition by g.id order by s.last_name, s.first_name, s.id))::integer as ord
    from groups g
    join public.student_group_pair sgp on sgp.student_group_id = g.id
    join public.student s on s.id = sgp.student_id
    where s.id <> _leader
  ),
  columns as (
    select pg.id, pg.name::text as name, pg.color
    from public.leader_letter_run r
    cross join unnest(r.point_group_ids) as u(pgid)
    join public.point_group pg on pg.id = u.pgid
    where r.school_id = _school and _tf is not null
  ),
  cells as (
    select m.gid, m.sid, c.id as pgid, ll.letter::text as letter
    from members m
    cross join columns c
    left join public.leader_letter ll
      on ll.school_id = _school and ll.point_group_id = c.id and ll.student_id = m.sid
  ),
  shown as (
    select ce.gid, ce.pgid
    from cells ce
    group by ce.gid, ce.pgid
    having count(*) >= 6
      and count(*) filter (where ce.letter is null) = 0
      and count(*) filter (where ce.letter = 'D') not in (1, 2)
      and count(*) filter (where ce.letter = 'E') not in (1, 2)
  )
  select g.id, g.name, m.first_name, m.last_name, m.ord, c.id, c.name, c.color,
    case when sh.gid is not null then ce.letter end
  from groups g
  join members m on m.gid = g.id
  cross join columns c
  join cells ce on ce.gid = g.id and ce.sid = m.sid and ce.pgid = c.id
  left join shown sh on sh.gid = g.id and sh.pgid = c.id
  order by g.name, g.id, m.ord, c.name, c.id;
end;
$$;

-- Member's own view (L10): each of the student's groups that has a leader, the leaders' first name
-- and last initial, and the student's OWN letters. It never says whether a column is hidden in the
-- leader's view. Actor: the student's own account or a linked parent.
create or replace function public.get_own_led_letters(p_actor_user_id bigint, p_student_id bigint)
returns table (group_id bigint, group_name text, leaders jsonb, letters jsonb)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  _school bigint;
  _tf bigint;
begin
  if not public.can_view_student(p_actor_user_id, p_student_id) then
    return;
  end if;
  select s.school_id into _school from public.student s where s.id = p_student_id;
  _tf := public.refresh_leader_letters(_school);

  return query
  select sg.id, sg.name::text,
    (select jsonb_agg(jsonb_build_object('firstName', ls.first_name,
                                         'lastInitial', upper(left(btrim(ls.last_name), 1)))
                      order by ls.last_name, ls.first_name)
     from public.student_group_leaders sgl
     join public.student ls on ls.id = sgl.student_id
     where sgl.group_id = sg.id and sgl.student_id <> p_student_id),
    coalesce((select jsonb_agg(jsonb_build_object('pointGroupId', u.pgid, 'letter', ll.letter)
                               order by u.pgid)
              from public.leader_letter_run r
              cross join unnest(r.point_group_ids) as u(pgid)
              left join public.leader_letter ll
                on ll.school_id = r.school_id and ll.point_group_id = u.pgid and ll.student_id = p_student_id
              where r.school_id = _school and _tf is not null), '[]'::jsonb)
  from public.student_group_pair sgp
  join public.student_group sg on sg.id = sgp.student_group_id
  where sgp.student_id = p_student_id
    and not sg.archived
    and (sg.timeframe_id is null or sg.timeframe_id = _tf)
    and exists (select 1 from public.student_group_leaders sgl
                where sgl.group_id = sg.id and sgl.student_id <> p_student_id)
  order by sg.name, sg.id;
end;
$$;

revoke all on function public.letter_for_share_below(numeric) from public, anon, authenticated;
revoke all on function public.refresh_leader_letters(bigint) from public, anon, authenticated;
revoke all on function public.get_leader_group_letters(bigint) from public, anon, authenticated;
revoke all on function public.get_own_led_letters(bigint, bigint) from public, anon, authenticated;
grant execute on function public.letter_for_share_below(numeric) to service_role;
grant execute on function public.refresh_leader_letters(bigint) to service_role;
grant execute on function public.get_leader_group_letters(bigint) to service_role;
grant execute on function public.get_own_led_letters(bigint, bigint) to service_role;
