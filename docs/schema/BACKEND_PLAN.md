# Backend plan — 2026-10-14

Owner: `backend`. Source of truth for the live schema: `docs/schema/baseline-2026-10-14/`.
Disclosure rules: `docs/DATA_DISCLOSURE.md`.
**Status 2026-10-14:** files 1 through 7a (`20261014223115` to `20261014230650`) are applied to
production, by the product owner. File 8 (`20261014230700`) is **not** applied and now lives in
`supabase/held/`, outside `supabase/migrations/`, so `db push` cannot pick it up. `types/supabase.ts`
was regenerated from production after the apply, and the TypeScript wrappers are built (§11).
File 9 (`20261014230655`, §12) is in `supabase/migrations/` and is **not** applied: it waits for the
product owner's go-ahead (S-3). Verified on the local stack only.

## 0. Migration files and apply order

| # | File | What | Risk |
|---|---|---|---|
| 0 | `20260912000000_reconcile_live_baseline.sql` | Live schema (32 tables, 44 functions, 9 policies, auth trigger) for fresh databases. **Backdated** so a fresh replay works. | No-op on production (guarded). Destructive only on an empty, 2024-only database. |
| 1 | `20261014223115_lock_down_function_execute.sql` | **URGENT.** EXECUTE grants, `search_path`, `create_school_and_pair_admin` caller check, admin-function shadowing fix, `student_class_pair` policy. Self-checking. Applied by the product owner as written. | Low. No data change. |
| 1a | `20261014223157_led_group_member_points_names_only.sql` | **URGENT, same window as 1.** `get_led_group_member_points` rewritten names-only (alphabetical, NULL ids/totals/categories) **and revoked from `authenticated`** (D14: the app cannot decode NULL there, so the ruling's revoke branch applies). No dependencies. | No data change. **Mobile:** a leader's group screen fails (§1.5). |
| 2 | `20261014230100_actor_helpers.sql` | `is_admin_of_school`, `is_staff_of_school`, `can_view_student`. | Additive. |
| 3 | `20261014230200_display_devices.sql` | Kiosk credential tables and RPCs. D17: device lapses when its pairer stops being staff; `display_device_live`, `display_device_reconfirm` (admin), `pairer_active` in the admin list. | Additive. |
| 4 | `20261014230300_publication_cut_functions.sql` | `publication_cut*`, `display_cut` (live-device check), `points_to_next_rank` (D19: nothing for an unranked student), 3 indexes. | Additive. |
| 5 | `20261014230400_withdraw_shares_on_score_change.sql` | Trigger that stops sharing a changed score, plus the notice table and RPC. | Additive. Changes runtime behaviour (D3). |
| 6 | `20261014230500_link_codes_and_attempts.sql` | 50-bit generator as the new default, rate-limited redeem and preview, admin parent-link list, revoke and rotate. | Additive. Existing codes still work. |
| 7 | `20261014230600_leader_letters.sql` | D13 snapshot and functions, with D15 (zero points = E; L8(c) participation), D16 (whole UTC days), D18 (ranked point groups only). | Additive. |
| 7a | `20261014230650_mobile_rpc_disclosure.sql` | D14 for 10 mobile RPCs: cut per cohort, peer ids/trends NULL, no neighbours, school scoping (G1), aggregate floors, per-event rank floor, `ranking_group` school + membership, `point_group` school + `ranked`. Also fixes all-time totals in 5 bodies. Depends on 4. | No data change. **BREAKING for the mobile app as shipped** (§1.5). |
| 9 | `20261014230655_revoke_api_role_table_writes.sql` | D25 (§12): revoke INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER on every public table and all sequence privileges from `anon` and `authenticated`, plus the matching `postgres` default privileges in `public`. Self-checking. `service_role` unchanged; SELECT kept. **Not applied; needs S-3.** | No data change. Narrows access only. No caller writes through an API role (§12.2). |
| 8 | `supabase/held/20261014230700_regenerate_link_codes.sql` | **FLAGGED, held.** Overwrites every link code, then UNIQUE (school_id, upper(link_code)) and a format CHECK. | **Data loss: every outstanding code stops working.** Needs a reissue plan and the product owner's go-ahead. |

**Apply order:** 1 and 1a together (urgent; 1a needs nothing else). Then 0 (recorded only, see below).
Then 2 → 7 together. Then 7a, **in the same window as a mobile release that accepts the NULLs in §1.5**
(decision M-1). 7a's timestamp sits after 7 and before 8, so holding it back while 2 → 7 apply does not
make it out of order. If 8 is applied before 7a, 7a needs `db push --include-all`. 8 is last, only after
its prerequisites (§6.4) and the reissue plan.

**How production should record file 0 (needs approval):** `supabase migration repair --status applied 20260912000000`
(metadata only). Alternatively `supabase db push --include-all`, where the guard makes it a no-op. A plain
`db push` will refuse it because it is older than the latest remote migration. If file 1 is applied first by
any route, file 0 cannot undo it: file 0 never runs `CREATE OR REPLACE` on production.

**After 2–7 (and 7a) apply:** done. `types/supabase.ts` was regenerated from production and the
wrappers in §3–§7 are built against it (§11). Before file 8 moves back into `supabase/migrations/`,
regenerate the types again (it adds no functions, only a constraint and a CHECK).

## 1. Urgent security migration (file 1)

### 1.1 RPC callers found (grep of this repo and every sibling repo, 2026-10-14)

| Caller | Role | Functions |
|---|---|---|
| Web app server code (`teacherServerActions.ts`) | `service_role` | `duplicate_scorebook_events`, `edit_scorebook_point_event` |
| **Phoenix Student Mobile** (Kotlin, anon key + student JWT) | `authenticated` | `get_active_timeframe`, `get_all_timeframes`, `get_available_leaderboard_scopes`, `get_category_breakdown`, `get_dashboard_totals`, `get_grade_leaderboard`, `get_led_group_member_points`, `get_my_groups`, `get_my_visibility_snapshot`, `get_point_group_leaderboard`, `get_point_history`, `get_ranking_group_leaderboard`, `get_school_leaderboard`, `get_student_group_leaderboard` |
| Web browser bundle | none | No `.rpc(` in the browser. The browser client uses Realtime broadcast only. |
| Nobody | — | `create_school_and_pair_admin`, every `*_as_admin`, `add_*`, `remove_*`, `create_group`, `update_student_data`, `get_school`, `get_own_*`, all helpers |

No RPC is called with the bare anon role. The mobile app calls only after sign-in (`App.kt` gates on `AuthState.Authenticated`).

### 1.2 What changes
- `REVOKE ALL ... FROM public, anon, authenticated` on all 46 functions. Revoking from `public` is
  what actually works. The mobile migrations revoked only `anon`, which is still a member of `PUBLIC`.
- `authenticated` gets back exactly the 14 mobile functions. `service_role` gets all of them.
- `search_path`: `public, pg_temp` on the live bodies, which use unqualified names, and `''` on the
  rewritten ones.
- `create_school_and_pair_admin`: the caller must be that admin (`auth.uid()`), plus no API grant.
- `get_point_groups_as_admin`, `get_student_groups_as_admin` and `get_school`: parameter qualified as `fn.school_id`.
- `student_class_pair` policy: row-scoped through the class AND the student, `WITH CHECK`, `TO authenticated`.
- `handle_new_user`: no API role. `supabase_auth_admin` is granted it explicitly.
- A self-check block aborts the migration if anon can execute anything, if any function lacks
  `search_path`, or if `authenticated` can execute anything beyond the 14.

### 1.3 Related fixes in the TypeScript tree (no DB needed)
- `utils/supabase/server.ts` used the **service-role key** for the cookie client. Every request
  without a session therefore ran as `service_role`. Live consequence:
  `app/linkAccount/serverActions.ts#linkTeacher` was an **unauthenticated** teacher link-code oracle.
  Now it uses the anon key. Requests with a session were already `authenticated` and are unchanged.
- `supabaseServiceClient.ts` was a `"use server"` module, so its default export was a POST-able
  server action. It is now a plain module with a browser guard. `topCards/page.tsx` now does an
  `import type` from `api/service/dashboard`.
- The build's client chunks were grepped: no service-role key and no service-client code.

### 1.4 Disclosure findings in the live mobile RPCs — RULED (D14, §10.12); fixed by 1a and 7a
These were live, and file 1 keeps them working. 1a and 7a implement the ruling:
- `get_school_leaderboard` and `get_point_group_leaderboard`: top 10 with **no cut**, plus 2 named
  neighbours above the caller (§9.3 / D2 DENY), plus `rank_change` (D10 DENY).
- `get_grade_leaderboard`: top 10 per grade, no cut. A grade of 9 gets its complete ranking.
- `get_led_group_member_points`: gives a leader every group mate's **totals and category points**.
  It violates D13 L2 directly. **Recommend revoking it as soon as the mobile app can drop the screen.**
- `get_student_group_leaderboard` and `get_ranking_group_leaderboard`: group averages and member
  counts with no `MIN_COHORT_FOR_AGGREGATE` floor, plus `top_student_points`.
- `get_point_history` and `get_category_breakdown` accept any timeframe id, including another
  school's. They return only the caller's own points, so the impact is low.
- Found while amending (not a disclosure finding, a point-math bug): `get_grade_leaderboard`,
  `get_dashboard_totals` (rank), `get_my_visibility_snapshot` (overall and grade rank),
  `get_student_group_leaderboard` and `get_ranking_group_leaderboard` LEFT JOIN `point_event` with the
  timeframe in the ON clause and then sum `student_point.point_value` anyway, so they rank and average
  on **all-time** points. 7a uses timeframe totals everywhere.
- Still open (backend): `auth_current_student()` resolves through `"user".student_id`. If a parent
  account ever carries `student_id`, every mobile function treats the parent as the child (§10.12
  note, L11). Resolve with the link-model decision in §9.

### 1.5 What the mobile app will notice (Phoenix Student Mobile, checked against its DTOs 2026-10-14)
The ruling keeps every signature and NULLs denied values "so the app keeps running". **The app as
shipped cannot decode most of those NULLs.** Its `@Serializable` DTOs declare them as non-nullable
`Long`/`Double`, and supabase-kt's default `Json` does not coerce, so a NULL makes `decodeList` throw.
Each repository call is in `runCatching`, so the screen shows its error state; it does not crash.

| RPC (file) | What changes on the wire | App consequence until it ships the fix |
|---|---|---|
| `get_led_group_member_points` (1a) | Revoked (permission error) | `getStudentGroupLeaderboard` fetches members in the same `runCatching`, so **a leader's whole group screen fails**. Non-leaders unaffected. Fix: drop the call, or isolate its failure; later, the letters wrapper. |
| `get_school_leaderboard`, `get_grade_leaderboard`, `get_point_group_leaderboard` (7a) | Peer `student_id` NULL; peer `points_change`/`rank_change` NULL; fewer rows (cut, no zero-point students, no neighbours); unranked caller has no own row; grade totals now timeframe-only | **Every board with a peer row fails** (`LeaderboardEntryDto.studentId: Long`). Fix: `studentId: Long?`, and change `LeaderboardScreen.kt:104` `key = { it.studentId }` to a key that is unique without it (e.g. index). Show "Not ranked yet" when no row has `is_current_student`. |
| `get_dashboard_totals` (7a) | `school_rank`, `total_students` NULL for a caller with 0 points; 0 rows for a timeframe of another school; rank now timeframe-based | Home fails for zero-point students. Fix: `schoolRank`/`totalStudents: Long?`. |
| `get_point_history` (7a) | `event_rank`, `event_participant_count` NULL for events with fewer than 4 participants | **History page fails** if any such event is on it. Fix: both `Long?`, hide "Nth of M" when null. |
| `get_student_group_leaderboard` (7a) | `avg_points` NULL below 10 members; average now timeframe-based | Group screen fails for small groups. Fix: `avgPoints: Double?`. |
| `get_ranking_group_leaderboard` (7a) | 0 rows unless the ranking group is in the caller's school and the caller is in one of its groups; `top_student_points` always NULL; groups under 10 members get NULL `rank`, `avg_student_points`, `group_points`, `total_score` | Fails on any row (`topStudentPoints` default does not absorb an explicit NULL). Fix: all five nullable; list unranked groups after ranked ones; key stays `groupId`. |
| `get_my_visibility_snapshot` (7a) | `leaderboard_top_*` = 10 (ceiling), `rank_lookahead` = 0, ranks NULL when unranked; `category_ranks` lists only point groups where the caller is ranked | Decodes. Do not render "Top 10" headings (§10.12). |
| `get_available_leaderboard_scopes` (7a) | Only scopes that would publish something: cut > 0 for school/grade/point group, groups of 10+ members, ranking groups with a 10+ group | Decodes. Fewer tabs. |
| `get_category_breakdown` (7a) | Timeframe must be the caller's school | Decodes. |
| `get_active_timeframe`, `get_all_timeframes`, `get_my_groups` | Unchanged | — |

**Decision M-1 (product owner):** apply 7a only together with a mobile release that has the nullable
DTOs, or apply it now and accept the error screens above. The ruling ranks the uncut grade board as
the second-worst live leak, and "keeping a screen working is not a disclosure ground" (§10.12).

## 2. Baseline reconciliation (file 0, and `types/supabase.ts`)
- The 2024 migrations describe a June 2024 schema. A fresh `db reset` failed at `20260912204234`.
  File 0 sits before that one and recreates the live shape from the snapshot. It is generated by
  script from `tables.sql` and `functions.sql`, with FKs ordered after the tables.
- Guard: it runs only if `public.point_event` is absent, and it raises if any public table has a row.
- `types/supabase.ts` is replaced by `docs/schema/baseline-2026-10-14/database.types.ts`, the
  generator output. One consumer drifted: `teacherServerActions.ts` passed `null` where the
  generated arg type is optional. It now passes `undefined`, which gives the same SQL default.
  `tsc` is clean.

## 3. Publication cut and points-to-next-rank (file 4)

**Policy (§8.3):** `publication_cut_policy()` returns `(10, 0.33, 3, 10)`.
`publication_cut(size) = max(0, min(10, floor(0.33·size), size−3))`. It must equal
`computeCut()` in `dashboardFilters.ts` for every row of the §8.4 table: 0–3→0, 4→1, 6→1, 9→2,
12→3, 30→9, 31→10, 600→10, null/negative→0. When `dashboardFilters.ts` is rewritten, add a test
that pins these values on both sides.

**`display_cut(p_school_id, p_timeframe_id, p_cohort_kind, p_cohort_id, p_actor_user_id?, p_display_device_id?)`
→ `(display_rank, first_name, last_name, grade, total_points)`**
- Cohorts: `overall`, `grade` (id = grade number), `point_group` (must be `ranked`), `student_group` (not archived, timeframe matches).
- size = students in the cohort with total > 0. Shrink-only ties: a row is published iff
  `rank + tied_band − 1 ≤ cut`. No count, no student id. Zero rows covers "not allowed", "too small" and "nothing".
- The actor is re-checked: staff of the school, or a non-revoked display device of the school.

**TypeScript contract** (new plain server module `app/supaApi/server/dashboard/displayCut.ts`,
built after type regeneration; `Cohort` comes from the §8.2 `dashboardFilters.ts` types):
```ts
export type DisplayStudentRow = {
  readonly key: string;        // opaque, per response: `${cohortKey}:${index}`. Never student.id.
  readonly rank: number;
  readonly firstName: string;
  readonly lastName: string;
  readonly grade: number;
  readonly totalPoints: number;
};
/** DISPLAY tier. `viewer` comes from getDashboardViewer() (§4), never from the browser. */
export async function getDisplayCut(viewer: DashboardViewer, schoolId: number,
  timeframeId: number, cohort: Cohort): Promise<readonly DisplayStudentRow[]>;
```
Feeding actions (`featuredDashGetGlobalStats` and the others) then build their DISPLAY payload from
these rows only. §7.1 rule: a student published in one cohort appears only in that cohort's list.

**`points_to_next_rank(p_actor_user_id, p_student_id, p_timeframe_id)` → `(cohort_kind, cohort_id, points_to_next)`**
Overall always. Grade, point group and student group only with ≥ 10 participants. Omitted at rank 1.
Actor: the own account (`student."linkedUser"`) or a linked parent.
```ts
export type PointsToNextRank = {
  overall: number | null;
  grade: number | null;
  pointGroups: { pointGroupId: number; pointsToNext: number }[];
  studentGroups: { studentGroupId: number; pointsToNext: number }[];
};
export async function getPointsToNextRank(studentId: number, timeframeId: number): Promise<PointsToNextRank | null>;
```
It replaces `nearbyStudents`, `nearbyGradeStudents` and the per-group nearby lists (§9.3).

**Indexes added with it:** `student_point(point_event_id)` (sp↔pe joins; the existing unique index
leads with `student_id`), `point_event(point_group_id, date)` (point-group cohorts),
`student(school_id, grade)` (every cohort).

## 4. Display devices (file 3) — closes §7.4 #18 once wired

**Flow:** the kiosk opens `/display` and shows an 8-character code (40 bits, 10-minute expiry).
Staff, on their own signed-in device, enter it and tap "Pair". The kiosk polls and receives a
256-bit token in an httpOnly cookie. Staff never type credentials on the kiosk. Alternative: a staff
member signed in on the kiosk taps "Turn this screen into a display". The device is created and the
staff session is signed out in the same response. Revoke: any admin of the school, or the pairer.
**D17:** any staff of the school may pair. A device stops resolving (and `display_cut` refuses it) once
its pairer is no longer staff of that school or the pairer's user row is gone. An admin re-confirms it
with `display_device_reconfirm(actor, device_id)` and becomes its pairer. `display_devices_for_school`
returns `pairer_active`. `display_pairing_claim` re-checks that the approver is still staff.

**RPCs (service_role):** `display_pairing_start(secret_hash)`, `display_pairing_approve(actor, code, school, label)`
→ `'approved'|'no_match'`, `display_pairing_claim(secret_hash, token_hash)`, `display_device_create(actor, school, label, token_hash)`,
`display_device_resolve(token_hash)` → `(device_id, school_id, school_name, label, paired_by_name)`,
`display_device_revoke(actor, device_id)`, `display_device_reconfirm(actor, device_id)` (admin only),
`display_devices_for_school(actor, school)` → `(..., revoked_at, pairer_active)`.
The database stores SHA-256 digests only.

**TypeScript contract:**
```ts
// app/supaApi/server/display/displayAccess.ts — plain server module (NOT "use server")
export type DisplayContext = { kind: 'display'; deviceId: string; schoolId: number;
  schoolName: string; label: string; pairedByName: string | null };
export type StaffViewer = { kind: 'staff'; userId: number; schoolIds: number[] };
export type DashboardViewer = StaffViewer | DisplayContext;
/** Reads cookie `__Host-phx_display` (httpOnly, Secure, SameSite=Strict, Path=/, Max-Age 400d). */
export async function getDisplayContext(): Promise<DisplayContext | null>;
/** Display cookie first, else staff session. Only app/dashboard/* may accept a DisplayContext. */
export async function getDashboardViewer(): Promise<DashboardViewer | null>;

// app/display/actions.ts — "use server"
export async function startDisplayPairing(): Promise<{ userCode: string; expiresAt: string }>;
export async function pollDisplayPairing(): Promise<{ status: 'pending' | 'paired' | 'expired' }>;
export async function approveDisplayPairing(userCode: string, schoolId: number, label: string): Promise<{ ok: boolean }>;
export async function convertThisBrowserToDisplay(schoolId: number, label: string): Promise<{ ok: boolean }>;
export async function listDisplays(schoolId: number): Promise<{ deviceId: string; label: string;
  pairedAt: string; pairedByName: string | null; lastSeenAt: string | null; revokedAt: string | null }[]>;
export async function revokeDisplay(deviceId: string): Promise<{ ok: boolean }>;
/** Admin of the device's school only. Makes the caller the pairer of a lapsed device. */
export async function reconfirmDisplay(deviceId: string): Promise<{ ok: boolean }>;
// listDisplays rows also carry `pairerActive: boolean`.
```
Wiring: `app/dashboard/layout.tsx` and every feeding action switch from `isStaffOfSchool(schoolId)` to
`getDashboardViewer()`. A display viewer's `schoolId` overrides `?school=`. `startDisplayPairing` is
unauthenticated, so it is rate-limited by client key in TS (proposed: 20 per IP per hour).

**`getDashboardSchools()` — implemented now** in `app/supaApi/server/dashboard/dashboardSchool.ts`:
```ts
export type DashboardSchool = { id: number; name: string };
export async function getDashboardSchools(): Promise<DashboardSchool[]>; // own schools, sorted by name
```
Staff: their admin and teacher schools. Everyone else: `[]`. After §4 ships, a display returns its one school.

## 5. Share withdrawal (file 5) — §10.3 violation 4
The trigger `AFTER UPDATE OF point_value ON student_point WHEN (old IS DISTINCT FROM new)` deletes
that score's `shared_point` rows and writes one `shared_point_withdrawal` notice. It covers every
write path (edit RPC, bulk entry, CSV import, TA upsert). Upserts that rewrite the same value do
nothing. Changes to `input_score` alone do nothing (recipients never see it).
```ts
/** Student's own account only. Returns unseen notices and marks them seen. */
export async function takeShareWithdrawalNotices(): Promise<{ eventName: string | null;
  eventDate: string | null; withdrawnAt: string }[]>;
// UI copy (§10.3): "Your shared score for <eventName> changed, so it is no longer shared."
```

## 6. Link codes (files 6 and 8) — §10.4, §10.11, D11, D12

### 6.1 Contract
```ts
export type LinkPurpose = 'student_claim' | 'parent_link' | 'teacher_claim';
export type LinkResult = { status: 'linked' | 'no_match' | 'rate_limited' };
/** Session user from getOwnUserData; client key = HMAC-SHA256(LINK_RATE_LIMIT_SECRET, client IP). */
export async function redeemLinkCode(purpose: LinkPurpose, schoolId: number, code: string): Promise<LinkResult>;
/** "Is this Maya R.?" Only for 10-character codes, so it cannot work before file 8. No id returned. */
export async function previewLinkCode(purpose: 'student_claim' | 'parent_link', schoolId: number, code: string)
  : Promise<{ status: 'match'; firstName: string; lastInitial: string } | { status: 'no_match' | 'rate_limited' }>;
// Admin (admin of the student's school, re-checked in SQL):
export async function listParentLinks(studentId: number): Promise<{ parentUserId: number; linkedAt: string;
  parentName: string | null; parentEmail: string | null }[]>;
export async function revokeParentLink(studentId: number, parentUserId: number): Promise<boolean>; // audited
export async function rotateLinkCode(kind: 'student' | 'teacher', id: number): Promise<{ code: string } | null>;
// Student's own screen (§10.11): "A parent account was linked on <date>".
export async function getOwnParentLinkDates(): Promise<string[]>;
```
SQL: `redeem_link_code`, `preview_link_code`, `admin_list_parent_links`, `admin_revoke_parent_link`,
`admin_rotate_link_code`, `own_parent_link_dates`. All service_role, and all take the actor `"user".id`.

### 6.2 Properties
- 10 Crockford base-32 characters = **50 bits** from `extensions.gen_random_bytes`. Input is
  case-insensitive, and hyphens and spaces are ignored (I/L→1, O→0).
- Uniform failure: wrong code, wrong school, already linked, existing parent pair → `no_match`.
- Bucket (proposed): **5 failures per user per hour, 20 per client key per hour**, shared by preview
  and redeem. Failures are logged without the code, and rows are purged after 24 hours. Serialized
  per user with an advisory lock.

### 6.3 Consumers switched
`components/linkAccount/LinkAccountForm.tsx` calls `redeemLinkCode` for all three roles. `linkStudent.ts`,
`linkTeacher.ts`, `app/linkAccount/serverActions.ts#linkTeacher` (dead, no importer) and
`parentApi.ts#linkStudentToParent` are now thin delegates to `redeemLinkCode`, so none of them is an
unthrottled POST-able path. The teacher claim gets `linked_user IS NULL` in the RPC's UPDATE (race guard).
`LinkResult.status` gains `'unavailable'` (no session, `LINK_RATE_LIMIT_SECRET` missing, or an RPC error).

### 6.4 Before file 8 may apply (FLAGGED)
1. ~~Replace the TS generators that bypass the default~~ **Done (branch `agent/backend-rpc-wrappers`).**
   `api/admin/teachers.ts` omits `link_code` on insert (DB default `generate_link_code()`), and
   `adminTeachersApi.ts#clientRevokeTeacher` calls `rotateLinkCode` → `admin_rotate_link_code`.
2. Reissue plan: admins print or send the new codes from the admin screens, on a chosen date.
3. Product-owner go-ahead. **Data lost: every unredeemed code in circulation.** Links that already
   exist are kept.

## 7. Leader letters (file 7) — D13, L1–L12
- `refresh_leader_letters(school)`: at most one snapshot per school per UTC day (L9). Only the
  current snapshot is kept (L7). Uses the school's active timeframe. Columns are the **ranked** point
  groups (D18) with an event in the window (L5). The window ends at 00:00 UTC of the snapshot date, so a
  snapshot holds whole days whoever triggers it (D16). Each letter row also stores `participated`.
- Cohort: students with a point-group total > 0. If there are fewer than 30, that point group has no
  letters. `p` = share strictly lower. Bands: S ≥ .93, A ≥ .75, B ≥ .57, C ≥ .39, D ≥ .20, E.
- `get_leader_group_letters(actor)`: own student account only, never a parent (L11). Direct members
  minus the leader (L1). L8 per column: ≥ 6 members, cohort floor met, every member has a letter,
  D and E counts each 0 or ≥ 3, and (L8(c), D15) more than half the listed members took part,
  otherwise the whole column is null. A member with no points in the category gets E (D15).
- Before letters go live at a school where 00:00 UTC is 07:00–15:00 local (Hawaii, Pacific, most of
  Asia and Oceania), add `school.timezone` and a local-midnight boundary (D16). Not built.
- `get_own_led_letters(actor, student)`: groups with a leader, the leaders' first name and last
  initial, and the student's own letters (L10). Never says whether a column is hidden.
```ts
export type LeaderLetter = 'S' | 'A' | 'B' | 'C' | 'D' | 'E';
export type LeaderGroupLetters = {
  groupId: number; groupName: string;
  pointGroups: { id: number; name: string; color: string }[];   // colour: column header only (L6)
  members: { key: string; firstName: string; lastName: string;   // key opaque; sorted server-side
             letters: { pointGroupId: number; letter: LeaderLetter | null }[] }[];
};
export async function getLeaderGroupLetters(): Promise<LeaderGroupLetters[]>; // groups with no members come from the names-only list
export type OwnLedLetters = { groupId: number; groupName: string;
  leaders: { firstName: string; lastInitial: string }[];
  letters: { pointGroupId: number; letter: LeaderLetter | null }[] };
export async function getOwnLedLetters(studentId: number): Promise<OwnLedLetters[]>; // student or linked parent
```

## 8. Index gaps (proposals only, not built)
| Index | Serves |
|---|---|
| `UNIQUE "user"(supabase_id)` | every request: `getOwnUserData`, `get_user_data()`, `auth_current_student()`. Check for duplicates first. |
| `point_event(student_group_id, date)` | scorebook loads, `duplicate_scorebook_events` source scan |
| `student_group_pair(student_group_id)` | group member lists (PK leads with `student_id`) |
| `teacher(linked_user)`, `student("linkedUser")` | `getCallerAccess`, own-student lookups, link RPCs |
| `teacher(school_id)`, `student_group(school_id)`, `point_group(school_id)`, `school_timeframes(school_id)` | school-scoped admin lists and every RPC above |
| `user_student_pair(student_id)` | `can_view_student`, admin parent-link list |
| `student_group_leaders(student_id)`, `(group_id)` | leader lookups (no PK today) |
| `shared_point(shared_group_id)` | "Shared with me" feed |

## 9. Legacy cleanup (proposals only, each needs an explicit go-ahead)
- DROP `create_school_and_pair_admin` (no caller, now unreachable).
- DROP the unused `*_as_admin`, `add_*`, `remove_*`, `create_group`, `update_student_data`, `get_school` and `get_own_*` family (no caller in any repo).
- Legacy tables (standing decision #4): `point_conversion_rule`, `point_conversion_rule_type`
  (`point_template.conversion_rule_type` FK and `conversion_rule_value NOT NULL` must go first), `class`,
  `student_class_pair` (0 rows), `teacher_class_pair`, `school_admins` (its `link_code` default is a
  literal string), `student_group_type`. Each drop states what is lost, after a row-count check.
- `student_point`: drop the duplicate `UNIQUE (id)`. Add PKs to `student_group_leaders` and
  `teaching_assistant_point_event` after de-duplicating. Add FKs for `user.teacher_id` and `user.student_id`.
- **Two link models coexist:** `student."linkedUser"` (web) and `user.student_id` (mobile
  `auth_current_student`). Likewise `teacher.linked_user` and `user.teacher_id`
  (`app/linkAccount/serverActions.ts`). Pick one and backfill. The new RPCs follow the web model.
- The Realtime broadcast `student-points-channel` is public. Anyone with the anon key can send
  `sync` and force every display to refetch. Make it private once display tokens exist.
- `ALTER DEFAULT PRIVILEGES ... REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC` would stop new functions
  being born callable by anon. It is global to the role and can affect extensions, so it is
  proposed, not done. Until then, every new function revokes explicitly (all files here do).

## 10. Decisions needed from the product owner
- **S-1** Approve the production operations: apply file 1, and record file 0 with `migration repair`.
- **S-3** Approve applying file 9 (`20261014230655_revoke_api_role_table_writes.sql`) to production with a
  plain `db push` (it sorts after the latest applied file, 7a, and before held file 8). What it does: removes
  every table write and sequence privilege from `anon` and `authenticated`. What it changes for users: nothing
  (§12.2). Rollback, if ever needed: re-grant from the self-check's list.
- ~~S-2~~ RULED D14: implemented in 1a and 7a. **New: M-1** (§1.5): when to apply 7a relative to the mobile release.
- ~~D-1~~ RULED D17: any staff, with lapse and admin re-confirm (file 3).
- ~~P-1~~ RULED D18, ~~P-2~~ RULED D19: built everywhere, including letters and the mobile RPCs.
- **Web follow-up (senior-developer, not backend SQL):** the §10.12 per-event floor applies to the web
  `pointEventRankings[].outOf` too (`app/student/RecentEventsWithRankings.tsx:124`, `app/student/page.tsx:204`):
  hide rank and "of N" for events with fewer than 4 participants.
- ~~P-3~~ **RULED 2026-10-14 (product owner): stored totals everywhere.** A score is the stored
  `student_point.point_value`. Walls, own view and mobile all sum it, grouped by
  `point_event.point_group_id` (the SQL definition). The legacy template rule
  (`point_template.conversion_rule_type` / `conversion_rule_value`, the `point_conversion_rule*`
  tables, `PointConversionRuleType`, `convertPointUsingRuleType`) is removed from all application
  code: re-applying it on top of `point_value` was the double-conversion bug. The only conversion in
  the system is the per-event formula `point_event.conversion_formula` (`lib/pointConversionFormula.ts`),
  applied once at score entry when a teacher has set one. The legacy columns and tables stay in the
  schema (no destructive DDL here); dropping them is §9 and needs its own go-ahead.
- **L-1** Date and reissue plan for file 8 (BREAKING).
- **L-2** Rate-limit numbers, and the new server secret `LINK_RATE_LIMIT_SECRET`.
- ~~LL-1~~ RULED D15 (E, plus L8(c)); ~~LL-2~~ RULED D16 (UTC whole days; timezone before non-US schools). Built in file 7.
- Optional: a cap on parent links per student.

## 11. TypeScript wrappers (built 2026-10-14 against the regenerated types)

Every wrapper resolves the actor (`"user".id`) from the Supabase session, checks it in TypeScript, then
calls a service_role-only RPC that re-checks it in SQL. None takes a user id from the browser. Plain
modules are imported by server components only; `"use server"` files are the ones a client must call.

| Module | Kind | Exports | TS check (then SQL re-check) |
|---|---|---|---|
| `app/supaApi/server/sessionActor.ts` | plain | `getSessionUserId`, `getOwnStudent`, `canViewStudent`, `isAdminOfSchool` | helpers |
| `app/supaApi/server/clientKey.ts` | plain | `getClientKey`, `computeClientKey`, `clientIpFrom`, `readRateLimitSecret` | HMAC of client IP |
| `app/supaApi/server/link/linkCodeActions.ts` | use server | `redeemLinkCode`, `previewLinkCode` | session user; client key or fail closed |
| `app/supaApi/server/admin/parentLinks.ts` | use server | `listParentLinks`, `revokeParentLink`, `rotateLinkCode` | admin of the record's own school (looked up from the row) |
| `app/supaApi/server/student/ownRecordRpc.ts` | plain | `getPointsToNextRank`, `takeShareWithdrawalNotices`, `getLeaderGroupLetters`, `getOwnLedLetters`, `getOwnParentLinkDates` | `canViewStudent` (own or linked parent) / own student only |
| `app/supaApi/mappers/rpcMappers.ts` | pure | row → domain for points-to-next and letters; L10 sentence | opaque keys, no peer ids |
| `app/supaApi/server/display/displayAccess.ts` | plain | `getDisplayContext`, `getDashboardViewer`, cookie and digest helpers | display token → `display_device_resolve` |
| `app/display/actions.ts` | use server | §4 contract (`start`/`poll` return `{ error }` when rate-limited or unavailable) | staff of school; device actions take the school from the device row |
| `app/supaApi/server/dashboard/displayCut.ts` | plain | `getDisplayCut`, `cohortKey` | display viewer: own school only; staff: own schools |

**Wired:** link screen → `redeemLinkCode`; student home → points to move up (overall, grade, category),
share-withdrawn notice, Groups You Lead letters (names-only fallback), L10 member notice; parent child
page → points to move up and the L10 notice (no leader letters, L11).
**Built, not wired:** `previewLinkCode` (needs a UX step; refuses non-10-character codes without
spending an attempt), the admin parent-link screen, `getOwnParentLinkDates`, the `/display` kiosk page.

### 11.1 `LINK_RATE_LIMIT_SECRET` (new server secret, required)
- **What:** the HMAC-SHA256 key for the rate-limit client key: `client_key = HMAC(secret, client IP)`, hex.
  Only the digest reaches `link_attempt.client_key`; the raw IP is never stored or logged.
- **Where:** server env only (Vercel project env for Production and Preview, `.env.local` for dev). Never
  `NEXT_PUBLIC_`. Read by `app/supaApi/server/clientKey.ts`.
- **Value:** at least 32 characters; generate with `openssl rand -base64 48`. Shorter counts as missing.
- **Fails closed:** if it is missing or short, `redeemLinkCode` and `previewLinkCode` return `'unavailable'`
  ("Linking is not available right now") without calling the database, and `startDisplayPairing` refuses.
  So it must be set **before** this branch deploys.
- **Rotation:** changing it resets the per-network buckets (old digests stop matching). The per-user
  bucket is unaffected. Safe to rotate at any time.
- Client IP: first hop of `x-forwarded-for` (set by Vercel), else `x-real-ip`, else one shared
  `"unknown"` bucket.
- Display pairing has no database bucket: `startDisplayPairing` (20 per client key per hour) and
  `approveDisplayPairing` (10 per staff account per hour) use an in-memory, per-instance limiter.

### 11.2 D20: dashboards on `display_cut` (wired 2026-10-14, after P-3)
```ts
// app/supaApi/server/dashboard/displayBoards.ts — "use server"
export async function getDisplayBoards(requestedSchoolId: number | null, timeframeId: number | null)
  : Promise<DisplayBoards | null>;
// app/supaApi/universal/displayTypes.ts — types only
type DisplayBoards = { timeframes; timeframeId: number | null; overall: DisplayBoard;
  grades: DisplayBoard[]; pointGroups: DisplayBoard[]; upcomingEvents: DisplayEvent[] };
type DisplayBoard = { key; title; color: string | null; rows: DisplayStudentRow[] };
type DisplayStudentRow = { key; rank; firstName; lastName; grade; totalPoints };
type DisplayEvent = { key; name; date; maxPoints; pointGroupId: number | null };
```
- **Who:** `getDashboardViewer()`: a staff session (admin or teacher of the school) or a live display
  device (its bound school only). `requestedSchoolId` only selects among a staff caller's own schools.
- **Scope:** one `display_cut` call per cohort (overall, each grade the school has, each `ranked` point
  group). Empty cohorts are dropped. SQL re-checks the actor. No ids, sizes, per-event scores or trends.
- **Service role, why:** a display device has no Postgres identity, and a top-k cut is not a row policy.
  The metadata reads (timeframes, grades, ranked point groups, upcoming event metadata) run only after
  the viewer is authorized for that school, and are filtered to it.
- **Consumers:** `/dashboard/featured`, `/dashboard/global`, `/dashboard/mobile`, `/dashboard/topCards`.
  "Moving up" and the team panels are off (DATA_DISCLOSURE §11.6) until floored SQL versions exist.
- **Deleted:** `dashboardFilters.ts`, `publicationCut.ts`, `featured/mobile/globalDashGetGlobalStats`,
  `api/dashboard.ts` and `api/service/dashboard.ts` (`getTopScrollingDashboard`, `getGlobalDashboard`,
  and three unauthenticated, live "use server" exports: `getTopStudents`, `getNearbyRanking`,
  `getStudentPointsWithRanking`). `getGlobalPointStats` now has one caller, `adminGetGlobalPointStats`.
- **Still to do:** `/display` routes and pairing UI; `app/dashboard/layout.tsx` still requires a staff
  session, so a paired device cannot reach these pages yet.

## 12. Data-access architecture (D25, backend ruling 2026-10-14) and file 9

### 12.1 The rule
**All table reads and writes go through the server-only service client, after a TypeScript
authorization check in `app/supaApi/server/*`, `api/*` or a server action. RLS is a deny-all backstop.**
The anon-key cookie client (`utils/supabase/server.ts`, `utils/supabase/client.ts`) is for `auth.*` and
Realtime broadcast only. The only thing an API role may call is the 13 SECURITY DEFINER student RPCs
(`authenticated`), which scope by `auth.uid()` themselves.

Why not add policies instead: a SELECT policy on `student_point`, `point_event`, `student` or `user` hands
the raw rows to anyone holding a session and the public anon key, straight from PostgREST, with no
publication cut. DATA_DISCLOSURE (the cut, floors, no counts, no peer ids) cannot be expressed as row
policies, so row access through PostgREST would bypass it. Every web screen already authorizes in
TypeScript and reads through the service client, and the mobile app is RPC-only, so deny-all costs nothing.

Consequences, binding on everyone:
- No new code reads or writes a table through the cookie client. It returns no rows (reads) or `42501`
  (writes, after file 9). `UserContextResolver` now requires the service client.
- No new RLS policy for `anon` or `authenticated`, and no new table grant to them, without a backend
  ruling that amends this section. `01_grants` pins the policy set and `tests/rls` asserts zero rows per
  role per table, so either change fails the suite on purpose.
- The 9 legacy policies stay. They are inert: each subqueries `public.user`, which has no policy, and after
  file 9 their write branches have no grant behind them. Dropping them is cleanup (§9), not needed for safety.
- Every service-client use must authorize first (non-negotiable 2). That check is now the only gate, so
  it is what reviews look for.

### 12.2 Who needs which grant (audit 2026-10-14)
| Caller | Path | Table privilege needed |
|---|---|---|
| Web server code | service client (`service_role`) | all; unchanged |
| Web cookie client | `auth.getUser/signIn/signOut/exchangeCodeForSession`, Realtime broadcast | none |
| Web browser bundle | Realtime broadcast `student-points-channel`, password reset (`auth.*`) | none |
| Phoenix Student Mobile | 14 `postgrest.rpc("get_*")` calls, no `from(...)`, no Realtime | none (all SECURITY DEFINER) |
| Auth trigger | `handle_new_user`, SECURITY DEFINER owned by `postgres` | none for API roles |

The only cookie-client table read in the tree was the unimported Supabase starter `components/tutorial`
(`from('notes')`); it is deleted.

### 12.3 File 9
- Revokes table writes and all sequence privileges from `anon` and `authenticated`; `ALTER DEFAULT
  PRIVILEGES FOR ROLE postgres IN SCHEMA public` does the same for future tables and sequences. There are no
  global (non-schema) default ACLs to override. Self-check aborts if any API role can still write or use a
  sequence, or if `service_role` lost SELECT/INSERT/UPDATE/DELETE.
- SELECT is kept for now. Revoking it from both roles is the logical next step under D25 (reads would
  then fail with `42501` instead of returning no rows), but it changes error behaviour for any stray read,
  so it is proposed, not done.
- Verified locally: `npm run test:db:reset` applies it cleanly; pgTAP and `tests/rls` pass (§12.5).

### 12.4 Baseline replay fix in `20240607213353_remote_schema.sql` (ruling: keep it there)
The test-suite agent added three `CREATE SCHEMA IF NOT EXISTS` lines (`pgsodium`, `graphql`, `vault`) to this
already-applied file so a fresh local replay works. **Approved as harmless; it stays where it is.**
- Production never re-runs it: version `20240607213353` is recorded in `supabase_migrations.schema_migrations`,
  and the CLI selects files by version, not by content. Even if it ran, the statements are idempotent and the
  schemas exist there.
- It cannot move to file 0 or a later migration: file 0 is dated 2026 and runs after this file, which needs
  the schemas at its first `CREATE EXTENSION`. `config.toml` has no pre-migration hook (the seed runs after),
  so a local-only bootstrap would mean a wrapper around `supabase db reset` that CI and every developer must
  remember. The guard in place is smaller and always runs.
- Cost, recorded: this file no longer matches byte-for-byte what production applied in 2024. The source of
  truth for the live schema remains `docs/schema/baseline-2026-10-14/`. Rule: no other edit to an applied
  migration is allowed; this exception is limited to idempotent `IF NOT EXISTS` replay guards.

### 12.5 Verification (local stack only, 2026-10-14)
`npm run test:db:reset`, then `supabase test db` 157/157 (01_grants 14/14; before file 9 the four new write
assertions failed as expected) and `vitest -c vitest.rls.config.ts` 481/481. Unit 62/62. No remote target
was used.
