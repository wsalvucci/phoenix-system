# Live schema baseline — 2026-10-14

Read-only catalog snapshot of the `public` schema on project `hqhsbnxkygihxnqevthe` ("Phoenix",
Postgres 15.1). This was taken with catalog `SELECT`s through the Supabase connector. It is **not** a restorable `pg_dump`:
it covers structure, not data, and it was reconstructed from `pg_catalog`.

| File | Contents |
|---|---|
| `tables.sql` | 33 tables: columns, defaults, constraints, non-constraint indexes, RLS state, policies |
| `functions.sql` | All 46 `public` functions, verbatim (`pg_get_functiondef`), with SECURITY DEFINER / search_path noted |
| `database.types.ts` | `supabase gen types` output for the live database |

There are no views, enums, or materialized views in `public`. Extensions in use: `pgcrypto`, `uuid-ossp`, `pgjwt`,
`pg_stat_statements`, `pgsodium`, `supabase_vault`.

## Applied migrations (live `schema_migrations`)

`20240607213353`, `20240607232950`, `20240608013838`, `20240608164747`, `20240608170318` (all `remote_schema`),
`20260912204234_duplicate_scorebook_events`, `20260912204826_index_scorebook_event_copy_operations`,
`20260912215436_add_point_event_conversion_formula`, `20260913004513_atomic_edit_point_event`.

Most live functions (the leaderboard, visibility and `*_as_admin` families) were **not** created by any migration in
`supabase/migrations/`. They exist only in the live database. Treat this baseline, not the migrations folder, as the
source of truth until backend reconciles them.

## Drift from the repo

- `types/supabase.ts` is stale relative to `database.types.ts`. For example, it lacks `scorebook_event_copy_operation`.
  It is about 325 diff lines.

## Findings for backend (security first)

1. **Every SECURITY DEFINER function is executable by `anon`**, except `duplicate_scorebook_events` and
   `edit_scorebook_point_event`. Most check the caller through `get_user_data()` → `auth.uid()` or
   `auth_current_student()`, so an anonymous call returns nothing. Exceptions:
   - **`create_school_and_pair_admin(admin_id, school_name)`** has no caller check. Anyone holding the public anon
     key can create a school and attach it to any admin id. This is a live integrity hole.
   - `timeframe_bounds`, `visibility_config` and `visibility_change_cutoff` take no caller context. Audit whether they
     return anything sensitive.
   - `handle_new_user` is a trigger function; it should not be EXECUTE-granted to anon or authenticated.
2. **No `search_path` is pinned** on 43 SECURITY DEFINER functions. Only the two scorebook functions and
   `handle_new_user` set `search_path=""`. This is the standard Supabase linter finding.
3. **`get_point_groups_as_admin` and `get_student_groups_as_admin` shadow their parameter.** In
   `point_group.school_id = school_id`, the unqualified name resolves to the column, so the filter is always true.
   The functions return every group in all of the admin's schools, not the requested one.
4. **RLS is the only barrier.** `anon` and `authenticated` hold ALL privileges on every table. 26 of 33 tables have
   RLS on with no policies, so they are service-role-only. The 8 policies on the other 7 tables are admin- and teacher-scoped
   `FOR ALL ... TO public` with no `WITH CHECK`.
5. **The `student_class_pair` policy never references the row's own columns,** so it passes for any admin of any
   school. The table has 0 rows today.
6. **Link codes:**
   - `student.link_code` and `teacher.link_code` are 7 hex characters of `md5(random())`. That is 28 bits, with no
     unique constraint and no school scoping. Per `DATA_DISCLOSURE.md` §10.4 they need at least 40 bits.
   - The `school_admins.link_code` default is a quoted *string literal*, so every row gets the same text.
7. **Missing integrity:**
   - `user.teacher_id` and `user.student_id` have no foreign keys.
   - `student_group_leaders` and `teaching_assistant_point_event` have no primary key.
   - `student_point` has a duplicate `UNIQUE (id)` on top of its primary key.
8. **Index gaps on hot paths.** No indexes on:
   - `student_point.point_event_id`, which matters with about 23k rows
   - `point_event.student_group_id`
   - `student_group_pair.student_group_id`
   - any `school_id` column
9. **Legacy tables are still present:** `point_conversion_rule`, `point_conversion_rule_type`, `class`,
   `student_class_pair`, `school_admins`, `student_group_type`. See README standing decision #4.
10. **Answers to open questions:**
    - `student_point.input_score` is nullable, so a blank score can already be stored separately from 0.
    - `link_code` is not unique.
