-- Revoke table and sequence write privileges from the API roles `anon` and `authenticated`.
-- Owner: backend. See docs/schema/BACKEND_PLAN.md section 12 (decision D21) and docs/TESTING.md.
--
-- NOT APPLIED TO PRODUCTION. Needs the product owner's go-ahead before `db push`.
--
-- Why: Supabase's default privileges gave anon and authenticated INSERT, UPDATE, DELETE, TRUNCATE,
-- REFERENCES and TRIGGER on all 32 original public tables, plus USAGE/UPDATE on every sequence.
-- RLS is currently the only thing between those grants and `student_point`, `point_event`, `user`
-- and `student`. Under D21 nothing ever writes through an API role:
--   - Web app: every write goes through the server-only service client after a TypeScript authorization
--     check; the anon-key cookie client is used for `auth.*` only (audited 2026-10-14).
--   - Phoenix Student Mobile: RPC only (14 `get_*` calls, grepped 2026-10-14), and every function
--     `authenticated` may execute is SECURITY DEFINER, so it needs no table privilege at all.
--   - Realtime: broadcast only; no table is in a publication.
--   - Auth: `handle_new_user` is SECURITY DEFINER owned by postgres.
-- `service_role` is untouched. SELECT is kept for both roles for now: RLS returns no rows to them (D21
-- deny-all backstop) and revoking SELECT is a separate, proposed step.
--
-- No data change. Not destructive. Narrows access only.

revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public
  from anon, authenticated;

revoke all on all sequences in schema public from anon, authenticated;

-- Tables and sequences that migrations create later (owned by postgres) are born without these grants.
alter default privileges for role postgres in schema public
  revoke insert, update, delete, truncate, references, trigger on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

-- Self-check: abort if any API role can still write anywhere in public.
do $$
declare
  _bad text;
begin
  select string_agg(r.rolname || ' ' || c.oid::regclass::text, ', ' order by 1)
  into _bad
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  cross join (values ('anon'), ('authenticated')) as r(rolname)
  where n.nspname = 'public'
    and c.relkind in ('r', 'p', 'v', 'm', 'f')
    and (
      has_table_privilege(r.rolname, c.oid, 'insert')
      or has_table_privilege(r.rolname, c.oid, 'update')
      or has_table_privilege(r.rolname, c.oid, 'delete')
      or has_table_privilege(r.rolname, c.oid, 'truncate')
      or has_table_privilege(r.rolname, c.oid, 'references')
      or has_table_privilege(r.rolname, c.oid, 'trigger')
      or has_any_column_privilege(r.rolname, c.oid, 'insert')
      or has_any_column_privilege(r.rolname, c.oid, 'update')
    );
  if _bad is not null then
    raise exception 'API role can still write: %', _bad;
  end if;

  select string_agg(r.rolname || ' ' || c.oid::regclass::text, ', ' order by 1)
  into _bad
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  cross join (values ('anon'), ('authenticated')) as r(rolname)
  where n.nspname = 'public'
    and c.relkind = 'S'
    and (has_sequence_privilege(r.rolname, c.oid, 'usage') or has_sequence_privilege(r.rolname, c.oid, 'update'));
  if _bad is not null then
    raise exception 'API role can still use a sequence: %', _bad;
  end if;

  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and not (has_table_privilege('service_role', c.oid, 'select')
        and has_table_privilege('service_role', c.oid, 'insert')
        and has_table_privilege('service_role', c.oid, 'update')
        and has_table_privilege('service_role', c.oid, 'delete'))
  ) then
    raise exception 'service_role lost a table privilege';
  end if;
end;
$$;
