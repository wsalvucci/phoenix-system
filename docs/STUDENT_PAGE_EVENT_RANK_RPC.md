# Design note for backend: per-event rank for the student page

Status: request, not a migration. Written by senior-dev (agent/sd-wave3), NEXT_STEPS_v2 #7.

## What changed in TypeScript
`api/student.ts` (`getStudentDashboardData`, `getStudentDashboardDataById`) no longer loads every
`student_point` row in the school. It now reads (1) the student's own `student_point` rows for the
timeframe (scoped by `student_id`), and (2) only `point_event_id, point_value` (no student id) for the
events the student took part in, paged at 1000 rows and chunked by 150 event ids. Overall, grade and
point-group ranks already come from `mobile_own_rank`. The unused `getStudentMonthlyTrends` (it loaded
every row too) was deleted.

## What is still heavier than it should be
Query (2) still moves one number per participant per own event into Node just to compute
`competitionRank` and "of N". For a school-wide event that is the whole roster.

## Requested function
```sql
-- service_role only, like mobile_own_rank (internal helper: caller checks canViewStudent first)
create function public.own_event_standings(p_student_id bigint, p_starts timestamptz, p_ends timestamptz)
returns table (point_event_id bigint, student_point_id bigint, own_value numeric,
               own_rank integer, participants integer)
```
- One row per point event of the student's school in `[p_starts, p_ends]` where the student has a
  `student_point`. `own_rank` = competition rank (ties share the better rank, higher score first),
  `participants` = count of `student_point` rows for the event.
- Apply the existing floor in SQL: return `own_rank` and `participants` as NULL when
  `participants < 4` (K_HIDDEN + 1; DATA_DISCLOSURE.md §10.12), so the server never needs the scores.
- Needs the existing index on `student_point (point_event_id)` (backend's index migration).

When it lands, `loadOwnPointEvents` drops query (2) and `calculatePointEventRankings` reads rank and
count straight from the row.
