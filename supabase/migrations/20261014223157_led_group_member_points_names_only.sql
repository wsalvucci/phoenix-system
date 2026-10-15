-- get_led_group_member_points: names only, alphabetical, and no longer callable by the mobile app.
-- DATA_DISCLOSURE.md D14, §10.12 ("Sequencing for get_led_group_member_points"), D13 L2, §4 GROUP LEADER.
--
-- Ships in the same window as 20261014223115_lock_down_function_execute.sql and depends on nothing
-- else. File 1 keeps EXECUTE for authenticated on this function; this file takes it away.
--
-- What was live: a group leader read every group mate's student_id, timeframe total and per-category
-- points, sorted highest first. That is the league table §4 forbids.
--
-- What this does:
--   1. Rewrites the body to return names only. student_id, total_points and category_breakdown are
--      NULL; rows are ordered by last name, then first name (L6). The signature and return shape are
--      unchanged, so nothing that names this function breaks at the catalog level.
--   2. REVOKES EXECUTE from authenticated (and public, anon). The ruling says the function is revoked
--      instead if the mobile app cannot cope with NULL. It cannot: Phoenix Student Mobile decodes the
--      rows into LedGroupMemberDto, where student_id and total_points are non-nullable Long, so a
--      names-only row fails to decode. Revoking gives the same visible result (the call fails) and
--      removes the surface. The rewritten body stays as defence in depth if the grant is ever restored.
--   Once the mobile app has a letters screen, letters reach it only through a new authenticated
--   wrapper with no actor parameter (§10.12). That wrapper is not part of this file.
--
-- Mobile impact: LeaderboardRepositoryImpl.getStudentGroupLeaderboard fetches the members inside the
-- same runCatching as the group aggregate, so for a LEADER the whole group screen now returns failure.
-- Non-leaders are unaffected. The mobile team must drop or isolate that call.
--
-- No table, column or row changes.

create or replace function public.get_led_group_member_points(p_group_id bigint, p_timeframe_id bigint)
returns table (student_id bigint, first_name text, last_name text, total_points bigint, category_breakdown jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_student_id bigint;
  v_school_id  bigint;
begin
  select cs.student_id, cs.school_id into v_student_id, v_school_id
  from public.auth_current_student() cs;
  if v_student_id is null then
    return;
  end if;

  -- Own led groups only, in the caller's school (D13 L1).
  if not exists (
    select 1
    from public.student_group_leaders sgl
    join public.student_group sg on sg.id = sgl.group_id
    where sgl.group_id = p_group_id
      and sgl.student_id = v_student_id
      and sg.school_id = v_school_id
  ) then
    return;
  end if;

  -- G1: the timeframe must belong to the caller's school.
  if not exists (
    select 1 from public.school_timeframes t
    where t.id = p_timeframe_id and t.school_id = v_school_id
  ) then
    return;
  end if;

  return query
  select null::bigint, s.first_name::text, s.last_name::text, null::bigint, null::jsonb
  from public.student_group_pair sgp
  join public.student s on s.id = sgp.student_id
  where sgp.student_group_id = p_group_id
    and s.id <> v_student_id
  order by s.last_name, s.first_name, s.id;
end;
$$;

revoke all on function public.get_led_group_member_points(bigint, bigint) from public, anon, authenticated;
grant execute on function public.get_led_group_member_points(bigint, bigint) to service_role;
