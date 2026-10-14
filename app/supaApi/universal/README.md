# Universal data access

- `universalApi.ts` - shared server actions (user lookups, timeframes, staff and admin reads).
  `adminGetGlobalPointStats` is ADMIN tier only and returns the whole school, uncut.
- `displayTypes.ts` - the DISPLAY-tier payload types every `app/dashboard/*` screen renders from.

## Dashboards (DISPLAY tier)

Every dashboard list comes from `getDisplayBoards(requestedSchoolId, timeframeId)` in
`app/supaApi/server/dashboard/displayBoards.ts`, which calls `public.display_cut` once per cohort
(overall, each grade, each ranked point group). The publication cut (N, P, K) lives only in SQL
(`publication_cut_policy()`); there is no TypeScript copy and no runtime knob. See
`docs/DATA_DISCLOSURE.md` §3, §8 and §11.3 (D20).
