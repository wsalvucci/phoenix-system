# Held migrations

Migrations written but not approved for production. `supabase db push` does not see this folder.
Move a file back into `supabase/migrations/` only after the product owner approves it.

- `20261014230700_regenerate_link_codes.sql` — overwrites every student/teacher link code. Needs a
  reissue plan, and first `api/admin/teachers.ts` and `adminTeachersApi.ts` must stop minting codes
  that fail its CHECK (see `docs/schema/BACKEND_PLAN.md`).
