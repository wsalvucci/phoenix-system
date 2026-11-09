-- Same-school guard for pair tables (TESTING.md "Authorization bugs from the 2026-10-15 audit", the one
-- open backend item). Additive: two trigger functions and their triggers. No data is changed.
--
-- Rule: a row that links two school-owned things must link things of the SAME school. The server
-- actions already refuse a mixed pair (app/supaApi/server/adminScope.ts); this makes it a database
-- rule, so no other route (an RPC, a script, the SQL editor) can create one either.
--
--   table                        side A (school)                    side B (school)
--   student_group_pair           student                            student_group
--   student_group_leaders        student                            student_group
--   teaching_assistant           student                            student_group
--   teacher_student_group_pair   teacher                            student_group
--   ranking_group_pair           ranking_group                      student_group
--   teacher_ranking_group_pair   teacher                            ranking_group
--   point_event                  student_group                      point_group (category)
--   student_point                student                            point_event -> student_group
--   shared_point                 student_point -> student           student_group shared into
--
-- And the other direction: changing school_id on student, teacher, student_group, ranking_group or
-- point_group is refused while that row is paired with something of another school.
--
-- NULL school (student_group.school_id is nullable): treated as "unknown" and allowed, so a legacy
-- group without a school does not start failing score entry. Local stack: 0 such groups.
--
-- Triggers check new writes only; they do not validate rows that already exist. Before relying on
-- the rule in production, the owner runs the read-only "mixed-school pairs" query in
-- docs/schema/production_read_only_checks.sql. It should return zero rows; any row it returns is a
-- pre-existing mixed pair that backend must review (this migration still applies cleanly).
--
-- Functions live in schema "private" (not exposed by PostgREST). EXECUTE is revoked from every API
-- role; a trigger function does not need EXECUTE at fire time. SECURITY DEFINER so the lookups see
-- the rows whoever writes (service_role today; the D25 deny-all RLS would hide them from anyone else).

create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------------------------------------
create or replace function private.refuse_cross_school_pair()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  school_a bigint;
  school_b bigint;
begin
  case tg_table_name
    when 'student_group_pair' then
      select s.school_id into school_a from public.student s where s.id = new.student_id;
      select g.school_id into school_b from public.student_group g where g.id = new.student_group_id;
    when 'student_group_leaders', 'teaching_assistant' then
      select s.school_id into school_a from public.student s where s.id = new.student_id;
      select g.school_id into school_b from public.student_group g where g.id = new.group_id;
    when 'teacher_student_group_pair' then
      select t.school_id into school_a from public.teacher t where t.id = new.teacher_id;
      select g.school_id into school_b from public.student_group g where g.id = new.group_id;
    when 'ranking_group_pair' then
      select r.school_id into school_a from public.ranking_group r where r.id = new.ranking_group_id;
      select g.school_id into school_b from public.student_group g where g.id = new.student_group_id;
    when 'teacher_ranking_group_pair' then
      select t.school_id into school_a from public.teacher t where t.id = new.teacher_id;
      select r.school_id into school_b from public.ranking_group r where r.id = new.ranking_group_id;
    when 'point_event' then
      select g.school_id into school_a from public.student_group g where g.id = new.student_group_id;
      select p.school_id into school_b from public.point_group p where p.id = new.point_group_id;
    when 'student_point' then
      select s.school_id into school_a from public.student s where s.id = new.student_id;
      select g.school_id into school_b
        from public.point_event e join public.student_group g on g.id = e.student_group_id
       where e.id = new.point_event_id;
    when 'shared_point' then
      select s.school_id into school_a
        from public.student_point sp join public.student s on s.id = sp.student_id
       where sp.id = new.student_point_id;
      select g.school_id into school_b from public.student_group g where g.id = new.shared_group_id;
    else
      raise exception 'refuse_cross_school_pair: not configured for table %', tg_table_name;
  end case;

  if school_a is not null and school_b is not null and school_a <> school_b then
    raise exception using
      errcode = '23514',
      message = format('%s row would link school %s with school %s', tg_table_name, school_a, school_b),
      hint = 'Both sides of a pair must belong to the same school.';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------------------------
create or replace function private.refuse_school_move_while_paired()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  mixed boolean := false;
begin
  if new.school_id is null or new.school_id is not distinct from old.school_id then
    return new;
  end if;
  -- school.id renumbered (ON UPDATE CASCADE): every row of the old school moves together.
  if old.school_id is not null and not exists (select 1 from public.school where id = old.school_id) then
    return new;
  end if;

  case tg_table_name
    when 'student' then
      mixed := exists (select 1 from public.student_group_pair x join public.student_group g on g.id = x.student_group_id
                        where x.student_id = new.id and g.school_id <> new.school_id)
            or exists (select 1 from public.student_group_leaders x join public.student_group g on g.id = x.group_id
                        where x.student_id = new.id and g.school_id <> new.school_id)
            or exists (select 1 from public.teaching_assistant x join public.student_group g on g.id = x.group_id
                        where x.student_id = new.id and g.school_id <> new.school_id)
            or exists (select 1 from public.student_point sp join public.point_event e on e.id = sp.point_event_id
                         join public.student_group g on g.id = e.student_group_id
                        where sp.student_id = new.id and g.school_id <> new.school_id);
    when 'teacher' then
      mixed := exists (select 1 from public.teacher_student_group_pair x join public.student_group g on g.id = x.group_id
                        where x.teacher_id = new.id and g.school_id <> new.school_id)
            or exists (select 1 from public.teacher_ranking_group_pair x join public.ranking_group r on r.id = x.ranking_group_id
                        where x.teacher_id = new.id and r.school_id <> new.school_id);
    when 'student_group' then
      mixed := exists (select 1 from public.student_group_pair x join public.student s on s.id = x.student_id
                        where x.student_group_id = new.id and s.school_id <> new.school_id)
            or exists (select 1 from public.student_group_leaders x join public.student s on s.id = x.student_id
                        where x.group_id = new.id and s.school_id <> new.school_id)
            or exists (select 1 from public.teaching_assistant x join public.student s on s.id = x.student_id
                        where x.group_id = new.id and s.school_id <> new.school_id)
            or exists (select 1 from public.teacher_student_group_pair x join public.teacher t on t.id = x.teacher_id
                        where x.group_id = new.id and t.school_id <> new.school_id)
            or exists (select 1 from public.ranking_group_pair x join public.ranking_group r on r.id = x.ranking_group_id
                        where x.student_group_id = new.id and r.school_id <> new.school_id)
            or exists (select 1 from public.point_event e join public.point_group p on p.id = e.point_group_id
                        where e.student_group_id = new.id and p.school_id <> new.school_id)
            or exists (select 1 from public.point_event e join public.student_point sp on sp.point_event_id = e.id
                         join public.student s on s.id = sp.student_id
                        where e.student_group_id = new.id and s.school_id <> new.school_id)
            or exists (select 1 from public.shared_point x join public.student_point sp on sp.id = x.student_point_id
                         join public.student s on s.id = sp.student_id
                        where x.shared_group_id = new.id and s.school_id <> new.school_id);
    when 'ranking_group' then
      mixed := exists (select 1 from public.ranking_group_pair x join public.student_group g on g.id = x.student_group_id
                        where x.ranking_group_id = new.id and g.school_id <> new.school_id)
            or exists (select 1 from public.teacher_ranking_group_pair x join public.teacher t on t.id = x.teacher_id
                        where x.ranking_group_id = new.id and t.school_id <> new.school_id);
    when 'point_group' then
      mixed := exists (select 1 from public.point_event e join public.student_group g on g.id = e.student_group_id
                        where e.point_group_id = new.id and g.school_id <> new.school_id);
    else
      raise exception 'refuse_school_move_while_paired: not configured for table %', tg_table_name;
  end case;

  if mixed then
    raise exception using
      errcode = '23514',
      message = format('%s %s is paired with rows of another school; it cannot move to school %s',
                       tg_table_name, new.id, new.school_id),
      hint = 'Remove its group, leader, assistant, competition and score links first.';
  end if;
  return new;
end;
$$;

revoke all on function private.refuse_cross_school_pair() from public, anon, authenticated;
revoke all on function private.refuse_school_move_while_paired() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Pair side. UPDATE triggers fire only when a linking column changes, so ordinary edits (a score's
-- point_value, a TA's full_access, an event's name) pay nothing.
create trigger same_school_pair before insert or update of student_id, student_group_id
  on public.student_group_pair for each row execute function private.refuse_cross_school_pair();
create trigger same_school_pair before insert or update of student_id, group_id
  on public.student_group_leaders for each row execute function private.refuse_cross_school_pair();
create trigger same_school_pair before insert or update of student_id, group_id
  on public.teaching_assistant for each row execute function private.refuse_cross_school_pair();
create trigger same_school_pair before insert or update of teacher_id, group_id
  on public.teacher_student_group_pair for each row execute function private.refuse_cross_school_pair();
create trigger same_school_pair before insert or update of ranking_group_id, student_group_id
  on public.ranking_group_pair for each row execute function private.refuse_cross_school_pair();
create trigger same_school_pair before insert or update of teacher_id, ranking_group_id
  on public.teacher_ranking_group_pair for each row execute function private.refuse_cross_school_pair();
create trigger same_school_pair before insert or update of student_group_id, point_group_id
  on public.point_event for each row execute function private.refuse_cross_school_pair();
create trigger same_school_pair before insert or update of student_id, point_event_id
  on public.student_point for each row execute function private.refuse_cross_school_pair();
create trigger same_school_pair before insert or update of student_point_id, shared_group_id
  on public.shared_point for each row execute function private.refuse_cross_school_pair();

-- Owner side.
create trigger same_school_move before update of school_id
  on public.student for each row execute function private.refuse_school_move_while_paired();
create trigger same_school_move before update of school_id
  on public.teacher for each row execute function private.refuse_school_move_while_paired();
create trigger same_school_move before update of school_id
  on public.student_group for each row execute function private.refuse_school_move_while_paired();
create trigger same_school_move before update of school_id
  on public.ranking_group for each row execute function private.refuse_school_move_while_paired();
create trigger same_school_move before update of school_id
  on public.point_group for each row execute function private.refuse_school_move_while_paired();
