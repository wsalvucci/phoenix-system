-- Private Realtime score signal (NEXT_STEPS_v2 #10, BACKEND_PLAN §9). Additive.
--
-- Before: walls listened on the PUBLIC broadcast channel "student-points-channel". Anyone holding the
-- anon key (it ships in every browser bundle) could send "sync" and make every wall in every school
-- refetch at once. Nothing in this repository has sent on it since July 2025, so walls were already
-- living on their 60 s refetch.
--
-- After:
--   * Topic  school:<school_id>:scores, PRIVATE (Realtime checks RLS on realtime.messages).
--   * Sender the database only: statement-level triggers on student_point (insert/update/delete) and
--            point_event (update) call realtime.send(..., private => true)
--            once per affected school per statement. Payload is {} (realtime.send adds a message id):
--            no score, no student, no count. realtime.send swallows its own errors, so a Realtime
--            problem can never fail a score write. Messages are only delivered on commit.
--   * Receiver SELECT policy on realtime.messages: a signed-in admin or teacher of that school
--            (public.is_staff_of_school, the same rule as staffAccess.getCallerAccess).
--   * Nobody   else: no INSERT policy, so no browser (anon or signed in) can send on a private topic;
--            no anon policy at all. A paired display has no Supabase session, so it keeps the 60 s
--            refetch (kiosk live updates would need a server-minted Realtime token; not built).
--
-- The old public channel needs no database change: there is no table or policy behind it, and the web
-- app no longer subscribes to it (components/display/useScoreSignal.ts).
--
-- Operator note (optional, dashboard setting, not SQL): Realtime > Settings > "Allow public access"
-- can be switched off once this ships, so public channels are refused outright.
--
-- private.can_receive_school_topic is the one function an API role may execute outside schema public.
-- Schema "private" is not exposed by PostgREST, so it is not an RPC; Realtime needs EXECUTE because
-- it evaluates the policy as the subscriber. It only answers "is the caller (auth.uid()) staff of the
-- school named in this topic".

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------------------------
create or replace function private.can_receive_school_topic(p_topic text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    exists (
      select 1
      from public."user" u
      where u.supabase_id = auth.uid()
        and public.is_staff_of_school(u.id, substring(p_topic from '^school:([0-9]{1,18}):scores$')::bigint)
    ),
    false);
$$;

revoke all on function private.can_receive_school_topic(text) from public, anon, authenticated;
grant execute on function private.can_receive_school_topic(text) to authenticated;

create policy "staff receive their school score signal"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and private.can_receive_school_topic((select realtime.topic()))
  );

-- ---------------------------------------------------------------------------------------------
-- Each trigger names its transition table "changed".
create or replace function private.signal_school_scores()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  school bigint;
begin
  if tg_table_name = 'student_point' then
    for school in
      select distinct s.school_id from changed c join public.student s on s.id = c.student_id
       where s.school_id is not null
    loop
      perform realtime.send('{}'::jsonb, 'sync', 'school:' || school || ':scores', true);
    end loop;
  elsif tg_table_name = 'point_event' then
    for school in
      select distinct g.school_id from changed c join public.student_group g on g.id = c.student_group_id
       where g.school_id is not null
    loop
      perform realtime.send('{}'::jsonb, 'sync', 'school:' || school || ':scores', true);
    end loop;
  end if;
  return null;
end;
$$;

revoke all on function private.signal_school_scores() from public, anon, authenticated;

create trigger signal_school_scores_insert after insert on public.student_point
  referencing new table as changed for each statement execute function private.signal_school_scores();
create trigger signal_school_scores_update after update on public.student_point
  referencing new table as changed for each statement execute function private.signal_school_scores();
create trigger signal_school_scores_delete after delete on public.student_point
  referencing old table as changed for each statement execute function private.signal_school_scores();

-- Moving an event's date (term) or category changes boards without touching student_point, so
-- point_event updates signal too. Deleting an event cascades to student_point, which signals by itself.
create trigger signal_school_scores_update after update on public.point_event
  referencing new table as changed for each statement execute function private.signal_school_scores();
