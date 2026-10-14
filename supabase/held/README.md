# Held migrations

Migrations written but not approved for production. `supabase db push` does not see this folder.
Move a file back into `supabase/migrations/` only after the product owner approves it.

- `20261014230700_regenerate_link_codes.sql` — overwrites every student/teacher link code. Needs a
  reissue plan and the product owner's go-ahead. The TS generators that failed its CHECK
  (`api/admin/teachers.ts`, `adminTeachersApi.ts`) now use the DB default and `admin_rotate_link_code`
  (`docs/schema/BACKEND_PLAN.md` §6.4).
