# Phoenix System — Data Disclosure Policy

**Status:** canonical. This document governs what data may reach which audience.
**Scope:** every surface, server action, API route, and return type in this repository.
**Owner:** disclosure authority. Mechanism (RLS, policies, query scoping) is owned by `backend`.
**Last ruling recorded:** 2026-10-14 — backend plan rulings: mobile RPCs, letter edge cases,
display pairing, cohort definitions (§10.12–§10.15, D14–D19); group-leader letter grades (§10.7, D13); rank colour
system and the student's own link code (§10.10, §10.11, D8–D12); UX restructure and Victorian
remake plans (§10); compare
retired, nearby lists reconciled (§9); dashboards are staff-only, DISPLAY tier (§0, §4, §7).

---

## 0. Ruling log

Newest first. Each entry names the sections it changed.

- **2026-10-14 — Backend plan rulings: mobile RPCs, leader-letter edge cases, display pairing,
  cohort definitions (§7.5, §10.7, §10.12–§10.15).** These answer `docs/schema/BACKEND_PLAN.md`
  §10 items S-2, LL-1, LL-2, D-1, P-1 and P-2. All were verified against the live function bodies
  (`docs/schema/baseline-2026-10-14/functions.sql`) and the unapplied migrations
  `supabase/migrations/20261014150*`.
  - **D14. Phoenix Student Mobile RPCs: peer rows are DISPLAY-equivalent, own rows are STUDENT**
    (§10.12). Every leaderboard applies `publication_cut` per cohort with shrink-only ties. Peer
    rows carry rank, first name, last name and total only. Peer `student_id`, `points_change` and
    `rank_change` are NULL. Named neighbours are removed (`rank_lookahead` = 0, D2). Group averages
    need `MIN_COHORT_FOR_AGGREGATE` (10) members. `top_student_points` is NULL. Every timeframe,
    point group and ranking group must belong to the caller's school. **`get_led_group_member_points`
    is DENY as written.** It drops to names only in the same release as file 1, and is revoked
    once the mobile app moves to letters. Signatures stay the same, with NULL in the denied
    columns, so the app keeps running.
  - **D15. Leader letters: a member with zero points in a point group gets E, never a per-member
    blank** (§10.13). A blank is a sharper marker than E. It says "exactly nothing", and it marks
    that one row. The zero-point E counts toward L8(b) like any other E. **Added condition L8(c):**
    the column is hidden unless more than half of the listed members took part in that point
    group in the timeframe. This handles the "category only some groups do" case. Letters exist
    only for `ranked` point groups (D18).
  - **D16. Snapshot day boundary: UTC is ALLOWED for now, if the snapshot is limited to whole
    days** (§10.13). A snapshot covers only events dated before 00:00 UTC on its snapshot date.
    It must not include everything up to whenever the first caller happened to open it. A school
    where 00:00 UTC falls between 07:00 and 15:00 local time (Hawaii, the Pacific islands, most of
    Asia and Oceania) needs a school timezone column before letters go live there.
  - **D17. Any staff member of the school may pair a display, if conditions hold** (§10.14).
    Limiting pairing to admins would not take anything off a screen. Every teacher can already
    open a dashboard, so admin-only pairing would push teachers back to the worse fallback: a
    staff login on the kiosk (R5). Conditions: a device stops resolving once its pairer is no
    longer staff of that school, unless an admin of the school re-confirms it. The admin sees
    every device and can revoke any of them. The "convert this browser" path signs the staff
    session out in the same response. Supersedes the "admin issuing a display token" wording in
    §7.5.
  - **D18. Point-group cohorts are limited to `point_group.ranked = true`: CONFIRMED and widened**
    (§10.15). This now covers every rank, cut, letter and points-to-next figure for a point group,
    on every surface. It includes leader letters, which today take every point group
    (`20261014150600_leader_letters.sql:106-110`), and the mobile `get_point_group_leaderboard`,
    which has no `ranked` check and no school check.
  - **D19. Cohort size counts only students with a total above 0: CONFIRMED** (§10.15). The same
    cohort supplies every rank and every own denominator. A student with zero points has no rank
    ("not ranked yet"). They are never shown as last.

- **2026-10-14 — Product owner: group leaders see per-point-group letter grades (§10.7, §10.8,
  §10.9). SUPERSEDES the letter-grade clause of D7.** The coordinator relayed this as the
  owner's requirement (the program admin wants leaders to have an approximation of each
  member's status), with the owner's clarification that the letters are **per point group**.
  The authority rules on *how*, not whether:
  - **D13. Leader letter grades are ALLOWED-IF every condition L1–L12 in §10.7 holds.** The
    conditions: the leader's own groups only; one letter per member per point group, the
    letter only, on the scale S, A, B, C, D, E (*owner's answer, 2026-10-14*: no +/−, and S is
    a narrow top band of 7%, so S ≥ 93rd percentile, A ≥ 75th, B ≥ 57th, C ≥ 39th, D ≥ 20th,
    E below that; §10.7 L3–L4); computed in SQL against the whole-school point-group cohort, never against
    group mates; members listed alphabetically, with no colour and no sorting; no counts or
    distributions; a whole column hidden when a D or E would single a member out; daily
    snapshots; members told on their own home; never sent to the leader's parent or to any
    DISPLAY. Until every condition holds, the section stays names-only, as it is in the
    working tree today. The 7fe5120 implementation must not be restored (§10.7 lists why).
  - Provenance: this requirement reached the authority second-hand, through the coordinator.
    If the owner's own words differ, the stricter reading applies.

- **2026-10-14 — Rank colour system and the student's own link code (§3.4, §10.4, §10.5,
  §10.7, §10.10, §10.11).** These answer the designer's questions in "Rank colour system"
  (`docs/design/VICTORIAN_REMAKE_PLAN.md`), raised under standing decision #5, and a
  question from senior-developer:
  - **D8. Rank colour is ALLOWED-IF on own, parent, teacher and admin views** (§10.10 Q1).
    The tier comes from the absolute rank only, never from N, a percentile or points. Colour
    appears only beside the numeral it comes from. The 21+ neutral treatment satisfies "no
    low-rank styling", with one addition: in a cohort of 21 to 29, **every** rank renders
    neutral, so the neutral band is never a small bottom group readable from across a room.
    This supersedes §10.5's "tiers below the medals are not colour-coded".
  - **D9. DISPLAY: the case cannot arise** (§10.10 Q2). The cut never exceeds `N_ABSOLUTE` = 10,
    so a wall shows tiers 1–5 and 6–10 only. `N_ABSOLUTE` now has a hard ceiling of 20 while
    the colour system stands. A rank of 11 or more on a DISPLAY is a cut violation before it is
    a colour question.
  - **D10. Rank change and percentile stay uncoloured: CONFIRMED and widened** (§10.10 Q3). Up
    and down are styled identically. A percentile never feeds the tier. Rank change is DENIED
    on DISPLAY in both directions.
  - **D11. The student's own `linkCode` is DENIED in every student payload**
    (`api/student.ts:44`, `:122`; §10.11). For now, the code reaches a parent only through
    staff. A student-initiated, single-use parent invite is ALLOWED-IF the conditions in §10.11
    hold.
  - **D12. Per the schema baseline, student codes fail §10.4 condition 5** (28 bits,
    `md5(random())`, not unique). The pre-link confirm stays unbuilt. Codes must be
    regenerated, and made unique per school (§10.4).

- **2026-10-14 — UX restructure plan and Victorian remake plan (§9.1, §9.3, §10).** Rulings on
  the disclosure questions raised in `docs/design/UX_RESTRUCTURE_PLAN.md` and
  `docs/design/VICTORIAN_REMAKE_PLAN.md`, made under the owner's delegation:
  - **D1. `/student/compare` is RETIRED** (§9.1, §10.1). Confirms ux-optimizer's decision, which
    is stricter than the earlier cut-only ruling. The `getCompareCandidates` contract in §9.1 is
    withdrawn and must not be built. `getSchoolGlobalStats` is deleted.
  - **D2. No named peers on the student or parent home pages** (§9.3, §10.2). Both neighbour
    lists are removed. The §9.3 clause that allowed an above-cut neighbour by name is withdrawn.
    `pointsToNextRank` stays as the only replacement, with a cohort floor.
  - **D3. Point sharing: approved "who will see" sentence; sharer name ALLOWED to recipients**
    (§10.3). Recipients get the name, event, date, category and points only. The raw input
    score, the sharer's id, and any ordering by points are denied. The share audience must be
    limited to the sharer's own groups. A share is withdrawn if the score changes afterwards.
  - **D4. Pre-link "Is this Maya R.?" ALLOWED-IF** (§10.4): first name and last initial only.
    Codes must be unguessable, attempts rate-limited, failures uniform, and the response carries
    no id. It is not built until all of those conditions hold.
  - **D5. Own denominator ("of N") CONFIRMED** on the student's own view and the parent's view
    of a linked child (§10.5). Never in a share, the shared feed, or any DISPLAY payload. Low
    ranks get no distinct visual treatment.
  - **D6. "Points gained since last visit" ALLOWED-IF** (§10.6): own data, celebrate only a
    positive delta, and no server-side log of visit times.
  - **D7. Further rulings from the plans** (§10.7): "Groups You Lead" letter grades DENIED
    (an open violation of the GROUP LEADER tier; *letter-grade clause superseded by D13*). TA
    scorebook payload narrowed. A teacher's own
    link code is removed from the teacher home. `/dashboard/global` hub copy corrected. School
    switcher, `?school=` links and "Paired by" label ALLOWED. Mockups use placeholder data only.

- **2026-10-14 — Student compare and student-tier global stats (§9).** `getSchoolGlobalStats`
  and `studentDashGetGlobalStats` ruled. Peer rows reaching a student or parent are
  DISPLAY-equivalent: above-cut only, no denominator. `nearbyStudents` /
  `nearbyGradeStudents` ruled DENY. `studentDashGetGlobalStats` to be deleted.

- **2026-10-14 — Product owner: all `app/dashboard/*` surfaces are staff-only (admin or
  teacher login required).** This replaces the earlier standing decision that the dashboards
  are public with no login. Implemented by `app/dashboard/layout.tsx` (navigation gate) and
  `app/supaApi/server/staffAccess.ts` (`getCallerAccess` / `isStaffOfSchool`, checked inside
  each server action). The disclosure authority's rulings that follow from it, made under the
  owner's delegation:
  - **R1. The dashboards are now the DISPLAY tier, not PUBLIC** (§4). A login decides who may
    *open* a dashboard. It does not decide who *reads* it. A dashboard on a hallway screen is
    read by every student who walks past.
  - **R2. DISPLAY keeps the full publication cut and every PUBLIC field ruling** (§3, §4, §7).
    The server cannot tell a teacher's desk from a hallway screen, so every dashboard payload
    is treated as hallway-visible. The staff login shrinks the reach from "the internet" to
    "the school community". It does not widen the field allow-list by a single field.
  - **R3. The PUBLIC tier still exists, and no surface is currently in it** (§4). It is the
    tier for anything reachable without a session. Any student data reachable with no
    session is now a violation by definition, not a tier assignment.
  - **R4. Being staff of a school does not unlock uncut, whole-school data** (§4, §7.4 #19).
    `isStaffOfSchool` is true for *any* teacher in the school. Uncut, whole-school detail
    belongs to the ADMIN tier. TEACHER detail is scoped to the teacher's own groups.
  - **R5. A staff session left running on an unattended display is a disclosure of that
    staff tier to everyone at the screen** (§4, §7.4 #18). Displays need a credential that can
    do nothing except render DISPLAY for one school.
  - **R6. Choosing a school is allowed if the choice is validated against the session**
    (§5 hard rule 2). A caller may *pick among* the schools the session is already staff of,
    which is what `getDashboardSchoolId` does. A caller may never pick its tier.
  - **R7. Former product-owner trade-offs in old §7.5, now decided by the authority** (§7.5):
    a full last name is ALLOWED on DISPLAY; cohorts with a cut of 0 have their panel heading
    suppressed; a rounded school-wide population figure is ALLOWED; per-event scores stay
    DENY; the full-roster staff view moves out of `app/dashboard/`.

- **2026-10-14 — First worked ruling: dashboard surfaces (§7).** Recorded when the
  dashboards were PUBLIC. Its field rulings stand under DISPLAY. Violation statuses were
  re-audited after the staff-only ruling.

---

## 1. The organizing principle

> **Criticize privately, praise publicly.**

The people in this database are children.

Flattering data is an asset. It motivates students and it belongs on the wall.
Unflattering data is a liability, and the only safe place for it is with the student
themselves and the adults responsible for them.

A system that publishes rankings publishes last place along with first **unless someone
deliberately stops it.** Every ranking surface in this codebase must contain that
deliberate stop. If you cannot point at the line of code that is the stop, there isn't one.

---

## 2. The asymmetry test

Apply this to **every field** reaching **every audience**, in order:

1. **Would this student be glad a peer saw this?** If yes, it may be public.
2. **Could a peer use this to mock, rank-shame, or single out this student?** If yes, it
   may not leave the student, their parents, and the staff responsible for them —
   regardless of how useful it would be elsewhere.
3. **Does the recipient need it to do something?** If not, it does not cross the wire,
   even if harmless.

In this test, "public" means **visible to peers.** That covers the PUBLIC tier, the DISPLAY
tier (a hallway screen is read by peers whoever logged it in), and any row about student B
that reaches student A or A's parent.

Rank is the sharp case, because it is flattering at the top and humiliating at the bottom.
The resolution is **not** "show rank to everyone" and **not** "show rank to no one":

> **Inclusion above a cut is public. Position below the cut does not exist publicly.**

A student always knows their own rank. The wall shows only those who would be glad to be
on it. Nobody learns who is last.

---

## 3. The publication cut

**Where it applies:** every peer-visible ranking. That means the PUBLIC and DISPLAY tiers,
and every list of *other* students in a STUDENT or PARENT payload (§9). A staff login in
front of a dashboard does not remove the cut (§0 R2).

Any peer-visible ranking must compute its cut from an absolute count **and** a proportion
**and** a hidden-remainder floor, **taking the smallest.**

```
cut(cohort) = min(
    N_ABSOLUTE,                  // default 10 — caps exposure in large cohorts
    floor(P_RATIO * size),       // default 0.33 — scales down in small cohorts
    size - K_HIDDEN              // default 3 — guarantees a crowd to hide in
)
if cut <= 0: publish nothing for this cohort
```

`size` is the cohort population: the number of students who are candidates for that
specific list, not the school population.

### 3.1 Why each term is load-bearing

Do not remove a term because it "never binds." Each one exists because of a specific
failure the others do not catch.

- **`N_ABSOLUTE` alone fails small cohorts.** "Top 10 in grade" applied to a grade of 9
  publishes the complete ranking of every student in it, including last place. The
  percentage term catches this: `floor(0.33 × 9) = 2`, so the cut is 2 and seven students
  stay unpublished.

- **`P_RATIO` alone fails large cohorts.** 33% of a 600-student school is 198 names on a
  public wall, which is a roster, not a celebration. The absolute term caps it at 10.

- **`size - K_HIDDEN` catches what both miss.** A cohort of 4 yields
  `floor(0.33 × 4) = 1`, which looks safe, but publishing 1 of 4 leaves three students who
  can each narrow their own standing to a three-way band. Requiring at least `K_HIDDEN`
  unpublished students means the remainder is always a crowd. At `size = 3` every term
  collapses to zero or less and **the correct output is an empty list**. A cohort that
  small cannot have a public leaderboard without exposing everyone in it.

### 3.2 Worked values (defaults N=10, P=0.33, K=3)

| cohort size | N_ABSOLUTE | floor(0.33·size) | size − 3 | **cut** | published / hidden |
|---|---|---|---|---|---|
| 3   | 10 | 0  | 0   | **0**  | nothing |
| 4   | 10 | 1  | 1   | **1**  | 1 / 3 |
| 6   | 10 | 1  | 3   | **1**  | 1 / 5 |
| 9   | 10 | 2  | 6   | **2**  | 2 / 7 |
| 12  | 10 | 3  | 9   | **3**  | 3 / 9 |
| 30  | 10 | 9  | 27  | **9**  | 9 / 21 |
| 31  | 10 | 10 | 28  | **10** | 10 / 21 |
| 600 | 10 | 198| 597 | **10** | 10 / 590 |

Above size 31 the cut is pinned at `N_ABSOLUTE`. Below it, the ratio governs. Around
size 4–6 the hidden-remainder floor governs. All three regions occur in a real school.

### 3.3 Rules that go with the cut

1. **Compute it per cohort, independently.** Overall, per grade, and per point group are
   separate cohorts with separate sizes and therefore separate cuts. **Never compute one
   cut from the largest cohort and apply it to the others.** That is the exact failure
   mode the percentage term exists to prevent.

2. **Recompute on every publish.** Cohort sizes change with enrollment, transfers, and
   timeframe selection. A cut cached from a 300-student school and served to a 9-student
   grade is the original bug wearing a cache.

3. **Never publish the denominator.** "#2" is flattering; "#2 of 9" discloses the cohort
   size and lets every other student in that grade bound their own position. Peer-visible
   surfaces show **name, grade, and achievement**: never "of N", never a total count,
   never a percentile, never "N ranked", never "N students". A student's own view may show
   their own denominator; the wall may not.

4. **Resolve ties by shrinking, not extending.** If the students at positions `cut` and
   `cut + 1` are tied on the published measure, **exclude the whole tied band and move the
   cut up.** Extending the cut to include everyone tied can breach `size - K_HIDDEN`, and
   publishing an arbitrary ordering within a tie invents a distinction the data does not
   support. If shrinking empties the list, publish nothing.

5. **Treat the thresholds as policy, not configuration.** `N_ABSOLUTE`, `P_RATIO`, and
   `K_HIDDEN` are disclosure decisions. They may be read from config but **must not be
   runtime-mutable by any caller**, and loosening any of them is a ruling the disclosure
   authority makes, not a tuning knob a dashboard passes in.

6. **Union of cuts is not a cut.** If a student qualifies for publication in *any* cohort,
   publish them *only in that cohort's list*. Do not let qualification in one cohort
   promote a student into another cohort's list, and do not let the union of several cuts
   become the effective public roster. Five point groups at "top 20 each" plus "top 20
   overall" plus "top 33% per grade" is a 150-name public roster assembled out of three
   individually reasonable-looking limits.

### 3.4 Provisional status of the thresholds

`N_ABSOLUTE = 10`, `P_RATIO = 0.33`, `K_HIDDEN = 3` are **placeholder defaults pending the
product owner's confirmation.** They are safe to ship with. The disclosure authority's
recommendation if the owner wants to revisit them:

- **`K_HIDDEN = 3` should be raised to 5, not lowered.** Three hidden students is a
  three-way band; each of them can narrow their own standing considerably. Five is the
  point at which the remainder stops feeling individually identifiable. Raising it costs
  almost nothing in large cohorts (where `N_ABSOLUTE` binds anyway) and only suppresses
  leaderboards in cohorts of 8 or fewer, which should not have public leaderboards.
- **`P_RATIO = 0.33` is defensible but generous.** At size 30 it publishes 9 of 30. 0.25
  would publish 7. The authority does not object to 0.33 and would object to anything
  above 0.4, at which point "featured" starts meaning "most of us."
- **`N_ABSOLUTE = 10` should hold.** Ten names is a celebration. Twenty is a list. The
  existing code's `20` is the number to move away from.
- **Hard ceiling: `N_ABSOLUTE` may never exceed 20** while the rank-colour system (standing
  decision #5) stands. A cut above 20 would split one celebratory wall into coloured and
  plain classes. Raising it past 20 is a new ruling, not a tuning change (§10.10 Q2).
- **A new threshold the authority recommends adding: `MIN_COHORT_FOR_AGGREGATE = 10`.**
  See hard rule 5. There is currently no floor at all on published group averages.

The staff-only ruling (§0) does **not** loosen any of these. They apply unchanged to DISPLAY.

---

## 4. Disclosure tiers

Ordered most restrictive to least. **A tier never inherits a wider tier's access.**
There is no "at least" relationship between tiers; each is an explicit allow-list.

### PUBLIC — unauthenticated

Anything reachable with no session: no login, no display credential.

**Current membership: none.** Since 2026-10-14 no sanctioned surface serves student data
without a session. The tier is kept as a definition, for two reasons. It is the floor any
future unauthenticated surface (signage token, public share link, marketing page) is ruled
against. And it names what an ungated endpoint is: a violation.

- **Permitted:** the same allow-list as DISPLAY below, with **last initial only** in place
  of last name (an unauthenticated page is indexable and quotable against a child's full
  name). Plus aggregate and anonymous figures, subject to hard rule 5.
- **Never:** everything DISPLAY never permits, and anything that requires a session to
  scope.
- Any exported server action, route handler, or page that returns student data and has no
  session check is a **PUBLIC-tier disclosure**. Rule it against this allow-list. In
  practice that makes it a violation.

### DISPLAY — the dashboards (staff-opened, peer-read)

Routes: `app/dashboard/featured`, `app/dashboard/global`, `app/dashboard/topCards`,
`app/dashboard/mobile`, `app/dashboard/feature` (a redirect), and anything else under
`app/dashboard/`.

**Who may open it:** an authenticated admin or teacher of the school being displayed
(`app/dashboard/layout.tsx`, plus `isStaffOfSchool` inside every feeding action).
**Who reads it:** everyone who can see the screen. That includes hallway traffic,
students, visitors, and anyone who photographs it. **The server cannot tell which kind of
screen it is rendering to, so every DISPLAY payload is ruled as hallway-visible.** A
screenshot of a hallway display outlives the school year.

- **Permitted:** first name, last name (full or initial; §7.5), grade, point totals and
  achievements **for students above the publication cut**, and aggregate/anonymous figures
  (school totals, grade-level averages, participation counts) subject to hard rule 5.
- **Never:** any student below the cut, in any form; full rosters; a student's position once
  it is outside the featured set; per-event or per-assignment scores; declining trends;
  daily point history granular enough to reconstruct behavior; `link_code` (it is a
  credential, not data); `birthdate`; `gender`; notes; anything about teaching-assistant or
  disciplinary status; any denominator (§3.3 rule 3).
- **The staff login does not widen this list.** A DISPLAY payload rendered for an admin is
  byte-for-byte the same as one rendered for a teacher. Staff who need more than this use
  their own tier's surfaces, which live **outside** `app/dashboard/`.
- **Scope:** exactly one school, which must be one the session is staff of. A caller may
  express a preference among its own schools (`?school=`) only if the server validates the
  preference against the session (`getDashboardSchoolId`). The tier is never chosen by the
  caller (§0 R6).
- **Credential on the screen (§0 R5):** an unattended display must not run under a session
  that can reach TEACHER or ADMIN surfaces. Anyone standing at a kiosk that is logged in as
  a teacher holds that teacher's account: the scorebook, the teacher pages, and every
  staff-gated server action. That is a disclosure of the whole TEACHER tier to whoever is
  at the screen. The required mechanism is a display-scoped credential whose only capability
  is DISPLAY for one school (`backend` owns the design). Until it exists, this is open
  violation §7.4 #18.

### GROUP LEADER / TEACHING ASSISTANT — a student with duties over peers

The narrowest non-public tier and the easiest to get wrong, because the holder is a peer,
not an adult.

- **Permitted:** group mates' names, and only the data needed for the specific duty
  granted — for the events they are authorized to score, the input they are entering.
- **Never:** a group mate's totals, standing, history, or any comparison across group
  mates; anything outside the specific events granted; anyone outside their own group.
  **A student must not be able to assemble a league table of their friends.**
- Applied in §10.7: "Groups You Lead" letter grades DENY; TA scorebook payload narrowed.

### STUDENT — their own record

Everything about themselves: totals, ranks, every event, history, trends, shared points.
A student may always see their own position, **including an unflattering one**, and may see
their own denominator.

About **other** students, a student may receive only rows that clear the DISPLAY
allow-list: above the per-cohort cut, with no denominator, no trend, and no per-event score.
In other words, nothing a hallway display would not already show them. See §9.

### PARENT — their linked children

Everything the student sees, for each child linked through `user_student_pair`. About any
other child, only what the STUDENT tier permits about other students (the DISPLAY
allow-list). Comparative views ("nearby students") disclose *other* children to this
parent. They are ruled DENY in §9.3.

### TEACHER — their own groups

Full detail for students in groups they own or assist, **scoped at the query**. Nothing
about other teachers' groups beyond the DISPLAY allow-list.

**Being a teacher at a school is not a scope** (§0 R4). `isStaffOfSchool(schoolId)` returns
true for every teacher in that school. It is a sufficient gate for DISPLAY data, which is
already cut. It is **not** a sufficient gate for any uncut, per-student, or per-event data,
which must be scoped to the teacher's own groups.

### ADMIN — their own schools

Full detail within schools listed in their own admin record (`admin_school_pair`).
`schools` is a **list**; a single `schoolId` is not a sufficient scope type. Uncut,
whole-school views (the full ranked roster, every per-event score) belong to this tier
alone, on surfaces outside `app/dashboard/`.

---

## 5. Hard rules

1. **Filter at the query, never in the component.** Data fetched and then hidden in the UI
   **has already crossed the wire.** It is in the HTML payload, the RSC stream, or the
   client bundle, and it is readable with View Source or one line in the devtools console.
   That includes the devtools of a logged-in hallway kiosk. "The component doesn't render
   it" is not a defense; it is the defect.

2. **The caller never picks its own privacy tier.** If a function takes an audience, filter
   level, or `schoolId` from its caller and that caller is reachable from the browser, the
   tier is attacker-controlled. **Audience must be derived from the resolved session.** A
   caller-supplied `schoolId` is acceptable **only** as a selection among schools the
   session is already entitled to, checked server-side before any read (§0 R6).

3. **Over-fetching is a disclosure.** Ranking every student in a school in order to return
   one student's position means the whole roster crossed the boundary. Push the computation
   to SQL and return only the answer.

4. **Credentials are not fields.** `link_code` grants account linking. It appears in no
   payload to anyone except the staff issuing it.

5. **Aggregate carefully.** A "bottom quartile average" over a group of four identifies
   people. Require a minimum cohort size (recommended: 10) before publishing any derived
   statistic: average, percentile, participation rate, or trend.

6. **Absence is information.** A public top-20 that is always the same nineteen names plus
   one gap discloses something about the twentieth. Prefer stable cuts and avoid publishing
   "fell off the list" transitions.

7. **The type is the contract.** Read the return type, not the component. If a field is in
   the type, assume it crosses the wire and rule on it. Optional fields are not exempt.

8. **Unruled is denied.** Any field not explicitly ALLOW or ALLOW-IF in this document, for
   a given tier, is DENY for that tier. Adding a field to a payload requires a ruling.

9. **Authentication is reach, not tier.** A login check answers "may this session call
   this?" It does not answer "which fields may come back?" Every gated function still needs
   a tier, and its payload is ruled against that tier's allow-list.

---

## 6. How to apply this as a developer

1. **Establish the audience first.** Which tier is this surface?
   - Under `app/dashboard/`: **DISPLAY.** Staff log in to open it, but peers read it. Apply
     the publication cut and the DISPLAY allow-list. The login changes nothing about the
     fields.
   - Reachable with no session: **PUBLIC.** Today that means it is a violation.
   - Otherwise: the tier of the resolved session (STUDENT, PARENT, TEACHER, ADMIN), and for
     any *other* student's row in the payload, the DISPLAY allow-list.
2. **Enumerate every field that reaches it.** Read the actual return type in
   `app/supaApi/universal/utils/types.ts`, `api/core/types.ts`, or `types/domain.ts`.
3. **Trace to the session.** State which identity the server resolved and what scoped the
   query. "The page is under `/teacher`" is **not** a scope. An unchecked `schoolId`
   argument is **not** a scope. `isStaffOfSchool` is a scope for DISPLAY data and for
   nothing wider.
4. **Rule each field** ALLOW / DENY / ALLOW-IF against the asymmetry test.
5. **Put the filter in the query.** If you find yourself writing `.slice()` or `.filter()`
   in a component or a `displayData.ts` helper, the data has already leaked.

### 6.1 Smells that are almost always violations

- `supabaseServiceClient()` in a function with no authorization check. Service role
  bypasses RLS entirely; there is nothing underneath it.
- An exported function in a `"use server"` file that takes `schoolId: number` and does not
  check it against the session. Every export in a `"use server"` file is an HTTP endpoint.
- `isStaffOfSchool(schoolId)` as the **only** gate on a function that returns uncut,
  per-student, or per-event data. That gate admits every teacher in the school (§4 TEACHER).
- A gate that admits "any student or parent in this school" in front of a function that
  returns other students' rows. Membership in a school is not entitlement to its roster.
- `select("*")` on `student`. That table carries `link_code`.
- `.slice(0, 20)` as the only limit. That is `N_ABSOLUTE` alone — see §3.1.
- `Math.ceil` in a cut calculation. The cut rounds **down**; `ceil` rounds a cohort of 3
  up to 1 published student.
- `null` in a privacy limit field meaning "no limit."
- A default rank of `-1` (or any value `<= N`) for a student missing from a rank map. It
  passes `rank <= N` and publishes the student.
- Any `update*Filters()` / `reset*Filters()` mutator on a disclosure config.
- `totalStudents`, `outOf`, `totalCount`, or `${rows.length} ranked` rendered on a
  peer-visible surface. That is the denominator — see §3.3 rule 3.

---

## 7. First worked ruling — dashboard surfaces (2026-10-14; re-audited 2026-10-14 after the staff-only ruling)

This is the reference example. Apply its shape to new surfaces. The ruling was first
recorded with these surfaces as PUBLIC. After the staff-only ruling they are DISPLAY. **The
field rulings in §7.1 and §7.2 are unchanged** under DISPLAY (§0 R2). Only the session
identity and the violation statuses in §7.4 changed.

```
SURFACES: app/dashboard/global, app/dashboard/featured (+ screens/*),
          app/dashboard/feature (now a redirect), app/dashboard/topCards,
          app/dashboard/mobile
AUDIENCE: DISPLAY (was PUBLIC until 2026-10-14)
SESSION IDENTITY: an authenticated Phoenix user who is admin or teacher of at least
          one school. Resolved by getCallerAccess() (staffAccess.ts): admin schools
          from admin_school_pair, teacher school from teacher.school_id. The
          navigation gate is app/dashboard/layout.tsx. Each feeding server action
          independently calls isStaffOfSchool(schoolId) before its service-role
          reads. The school is chosen by getDashboardSchoolId(requested), which
          honours a ?school= preference only if it is one of the caller's own
          schools (in progress in parallel; replaces the literal 12).
          The resolved identity is the person who opened the screen, NOT the
          audience. The audience is whoever can see the screen.
```

### 7.1 `GlobalPoints` field rulings (`app/supaApi/universal/utils/types.ts:104`)

| field | ruling | reason |
|---|---|---|
| `schoolId` | ALLOW | Not student data. Must be a session-validated school. |
| `totalStudents` | **DENY** | The denominator. §3.3 rule 3. Rendered at `AnimatedFeatured.tsx:78` and `global/page.tsx:85`. |
| `categoryStudentCounts.grades` | **DENY** | Per-grade cohort sizes. A student in a grade of 9 who sees "9" can bound their own standing from the two published names. |
| `categoryStudentCounts.pointGroups` | **DENY** | Same, per point group. |
| `timeframes[]` (id, name, startDate, endDate, isActive) | ALLOW | School calendar metadata, no student in it. |
| `grades[]` | ALLOW-IF the grade has a nonzero cut | A grade whose cut is 0 must not appear as a heading at all; an empty "Grade 3" panel discloses that grade 3 has ≤3 participating students. |
| `students[].id` | ALLOW-IF opaque, or until §7.4 #18 is closed | Needed as a React key. `getStudent(studentId)` is now session-gated, so the id is no longer an unauthenticated lookup key. But a kiosk running a staff session lets anyone at the screen call `getStudent(id)` *as staff* (§7.4 #18). Until displays use a display-scoped credential, publish an opaque per-response key, not `student.id`. |
| `students[].firstName` | ALLOW (above cut) | The point of the wall. |
| `students[].lastName` | ALLOW (above cut) | Full last name permitted on DISPLAY (§7.5). |
| `students[].grade` | ALLOW (above cut) | Explicitly permitted for DISPLAY. |
| `students[].totalPoints` | ALLOW (above cut) | The achievement. |
| `students[].rank` | ALLOW-IF above the overall cut | Flattering at the top; the cut is the whole mechanism. Never for a student below it. |
| `students[].gradeRank` | ALLOW-IF above that **grade's own** cut | Per-cohort cut, independently computed. §3.3 rule 1. |
| `students[].pointGroups[].points` | ALLOW-IF above that point group's own cut | Same. |
| `students[].pointGroups[].rank` | ALLOW-IF above that point group's own cut | Same. |
| `students[].lastMonthRank` | **DENY** | A declining trend is the definition of unflattering. Publishing "was #4, now #19" is rank-shaming with a time axis. |
| `students[].lastMonthGradeRank` | **DENY** | Same. |
| `students[].lastMonthPoints` | **DENY** | Differenced against `totalPoints` it reconstructs the trend. |
| `students[].pointGroups[].lastMonthPoints` | **DENY** | Same, per category. |
| `students[].pointGroups[].lastMonthRank` | **DENY** | Same. |
| `students[].monthToMonthChange` | **DENY** | A negative value here is a published decline. |
| `students[].totalPointsByDay` | **DENY** | Day-granular history. Reconstructs behavior: which days a child was present, participating, or scored zero. |
| `students[].pointsEarnedEachDay` | **DENY** | Same. |
| `students[].studentGroups[]` | **DENY** | Group membership is roster data and enables cross-referencing a named student to a group's average. |
| `pointGroups[]` (id, name, color) | ALLOW | Category metadata, no student in it. |
| `studentGroups[].id`, `.name` | ALLOW | Team names are meant to be cheered. |
| `studentGroups[].totalStudents` | **DENY** | Group size is the denominator for `averagePoints`. Published together they let anyone reconstruct the group's point total and, in a group of four, individual contributions. Rendered at `AnimatedFeatured.tsx:109` and `displayData.ts:38`. |
| `studentGroups[].averagePoints` | ALLOW-IF group size ≥ `MIN_COHORT_FOR_AGGREGATE` (10) | Hard rule 5. A four-student average identifies people. |
| `studentGroups[].lastMonthAveragePoints` | **DENY** | Group-level decline, and differencing exposes the trend. |
| `studentGroups[].rawPoints` | ALLOW-IF group size ≥ 10 | Group-earned points are not attributable to an individual, but gate it with the average it is displayed beside. |
| `studentGroups[].lastMonthRawPoints` | **DENY** | Trend. |
| `studentGroups[].pointGroups[].points` | ALLOW-IF group size ≥ 10 | Same gate. |
| `rankingGroups[].id`, `.name` | ALLOW | Competition metadata. |
| `rankingGroups[].studentGroups[]` | ALLOW-IF each nested group clears the same per-field rulings above | The nested shape duplicates `studentGroups[]`; it is a second copy of the same leak if ruled separately. |
| `pointEvents[].id`, `.name`, `.date`, `.maxPoints` | ALLOW | The "upcoming events" panel. No student in it. Useful and safe. |
| `pointEvents[].studentGroupId` | ALLOW-IF only used to label the event's audience | Does not name a student. |
| `pointEvents[].pointGroup` | ALLOW | Category id. |
| `pointEvents[].students[].id` | **DENY** | Per-event participation for every student in the school. |
| `pointEvents[].students[].points` | **DENY** | **Per-event scores.** Never peer-visible. This is a child's score on a single assignment, for every child, including every zero. |
| `pointEvents[].students[].rank` | **DENY** | Per-event rank, including last place in every event. |

### 7.2 `SimpleDashboardData` rulings (`api/service/dashboard.ts:10`, feeds `topCards`)

| field | ruling | reason |
|---|---|---|
| `timeframes[]` | ALLOW | Calendar metadata. |
| `students[].student.first_name` / `.last_name` / `.grade` | ALLOW (above cut) | As above. |
| `students[].totalPoints`, `.rank` | ALLOW-IF above a correctly computed cut | Today the cut is `slice(0, 20)`: `N_ABSOLUTE` alone, and set to 20. |
| `students[].student.id`, `.studentId` | ALLOW-IF opaque | Same caveat as `GlobalPoints.students[].id`. |
| `students[].student.school_id` | **DENY** | Not needed by the renderer; the surface is already single-school. Fails test question 3: the recipient does not need it. |
| `students[].pointGroups[]` | ALLOW-IF above that point group's own cut | Per-cohort. |
| `students[].studentGroups[]` | **DENY** | Group membership, rendered at `topCards/page.tsx:167-169`. |

### 7.3 `getSchoolGlobalStats` return

Moved to §9.1. It feeds a STUDENT/PARENT surface, not a dashboard.

### 7.4 Violations (most severe first) — status as of 2026-10-14

Status key: **OPEN** = unchanged by the staff-only work. **PARTLY RESOLVED** = the
authentication half is fixed; the disclosure half is not. **RESOLVED** = no further action.
`universalApi.ts` line numbers are approximate. The file is being edited in parallel, so
locate by function name.

1. **OPEN — `app/supaApi/universal/dashboardFilters.ts:23-28`** — `DASHBOARD_FILTERS.GLOBAL`
   sets all three limits to `null`, described as "No privacy filters - shows all data".
   Combined with the `=== null ... return true` branch in `getGlobalPointStats`
   (`universalApi.ts` ~:1104), `/dashboard/global` returns **the complete ranked roster
   of the school**: every name, every total, every rank including last place, plus daily
   point history and every per-event score. *Consequence now:* the login no longer lets a
   stranger fetch it, but any teacher who opens `/dashboard/global` on a hallway screen
   shows the whole school's last place to every passing student. Any teacher in the school
   can also read whole-school detail outside their own groups (§4 TEACHER). *Required
   change:* GLOBAL is DISPLAY; it gets the same cut as FEATURED. `null` must stop meaning
   "no limit" anywhere in this file. Remove the nullability from the type.

2. **PARTLY RESOLVED — `globalDashGetGlobalStats` (`universalApi.ts` ~:641)** — was
   unauthenticated with any `schoolId`. It now calls `isStaffOfSchool(schoolId)` first. The
   cross-school, unauthenticated enumeration is closed. *Remaining:* it still returns
   uncut data (#1) to any teacher of the school. *Required change:* apply the DISPLAY cut.
   School selection through `getDashboardSchoolId` satisfies hard rule 2 (§0 R6).

3. **OPEN — `getGlobalPointStats` `pointEvents[].students[]` (`universalApi.ts` ~:1172)** —
   never filtered by any cut, on any dashboard. Even on FEATURED and MOBILE, where the
   student list is shortlisted, this array carries **every student id with their score and
   rank for every event in the timeframe.** *Consequence:* the per-assignment score of
   every child in the school, including zeros, sits in the payload of the hallway display,
   readable from the kiosk's devtools. It is also returned to any student through
   `studentDashGetGlobalStats` (§9.2). The roster is reconstructable from this array alone
   even when `students[]` is correctly cut. *Required change:* strip `students[]` from
   `pointEvents` entirely for DISPLAY, and for every payload that reaches a student or
   parent.

4. **OPEN — `getGlobalPointStats` privacy filter (`universalApi.ts` ~:1100-1118)** — the cut
   is a **union (`||`), not a minimum**, and the three limits are applied to three different
   cohorts rather than combined within each cohort. A student is published if they clear
   *any* of top-N overall, top-N in *any* point group, or top-ratio of their grade.
   *Consequence:* with 5 point groups at `numStudentsPerPointGroup = 20`, FEATURED can
   publish ~100 students from the point-group term alone, plus top 20 overall, plus 33% of
   every grade. The union is the effective roster on the wall. **Additional defect found in
   re-audit:** the point-group test is `(pointGroupRankMap...get(student.id) ?? -1) <=
   numStudentsPerPointGroup`. A student missing from a point group's rank map gets `-1`,
   which passes, so the student is published. *Required change:* implement §3. Per cohort,
   three-way minimum, and a student published in one cohort appears **only** in that
   cohort's list (§3.3 rule 6). A missing rank means "not published", never a passing value.

5. **OPEN — grade cut in `getGlobalPointStats` (`universalApi.ts` ~:1111)** — uses
   `Math.ceil(gradeStudentCount * ratioStudentsPerGrade)` with **no `size - K_HIDDEN`
   term**, and defaults an unknown grade size to `1`. For a grade of 3, `ceil(3 × 0.33) = 1`:
   one student published, two hidden, each able to resolve their own standing to a coin
   flip. For a grade of 2, `ceil(0.66) = 1`: the hidden student knows exactly where they
   stand. *Required change:* `floor`, and the three-way minimum including `size - K_HIDDEN`.
   An unknown cohort size yields cut 0.

6. **PARTLY RESOLVED, SUPERSEDED BY §9.1 — `getSchoolGlobalStats` (`api/student.ts:1030`)** —
   was unauthenticated with any `schoolId`. It now resolves the caller and admits staff of
   the school, a student account in the school, or a parent with a linked child in the
   school. *Remaining, and now the main problem:* it returns **every student in the school
   ranked with no cut** to every one of those callers. That is a peer disclosure to students
   and parents. See §9.1 for the ruling and required change.

7. **PARTLY RESOLVED — `app/dashboard/global/page.tsx:1,42` (and `featured`, `mobile`,
   `topCards`)** — `"use client"` pages calling server actions from the browser with the
   literal school `12`. Authentication is now enforced server-side, and the literal is
   being replaced by `useDashboardSchool` / `getDashboardSchoolId` (in progress). The
   original required change ("make these server components") is **withdrawn**. A client
   component is acceptable if the action it calls returns only DISPLAY-ruled fields, because
   then nothing extra reaches the browser. *Remaining:* until #1, #3, #4, #5, #13 are fixed,
   these actions return uncut and DENY fields, and all of it lands in the kiosk browser's
   memory and network tab. *Required change:* none in the page beyond the school hook. The
   fix is in the actions.

8. **OPEN — `app/dashboard/featured/screens/displayData.ts:9-15`** — `studentDisplayLimit` is
   a **client-side** limiter: `Math.min(20, Math.ceil(population / 3))`. Three defects in
   one function. (a) It runs in the browser, so everything it filters out has already
   crossed the wire (hard rule 1). (b) `Math.ceil` instead of `floor`, and no
   `size - K_HIDDEN` term. (c) `20` instead of `N_ABSOLUTE = 10`. *Required change:* delete
   it. The server returns rows that are already cut; the client renders what it is given.

9. **OPEN (auth added) — `api/service/dashboard.ts:278`** — `const top20Students =
   mappedStudents.slice(0, 20)` is `N_ABSOLUTE` alone, at 20. In a school or grade smaller
   than 20 this publishes the complete ranking. Note also `:255`, which assigns
   `studentsWithPoints.length + 1` as a default rank to students with no points: a
   synthesized last place. `getTopScrollingDashboard` (`api/dashboard.ts`) is now
   staff-gated, which does not touch either defect. *Required change:* apply §3; never
   synthesize a rank for an unpublished student.

10. **PARTLY RESOLVED — `getGlobalDashboard` (`api/dashboard.ts`, `api/service/dashboard.ts:562`)**
    — now staff-gated. Still uses a `slice(0, 20)`-only cut. Unreferenced by any page.
    *Required change:* apply §3, or delete. Deletion is preferred, since an unused
    endpoint is surface with no product value.

11. **OPEN — `app/dashboard/mobile/page.tsx:81-90`** — renders `mobileDashData.students` with
    **no limit at all**, trusting `DASHBOARD_FILTERS.MOBILE` (top 50 overall, top 10 per
    point group, top 50% per grade — a union, per #4). 50% of a grade plus 50 overall is not
    a featured set. *Required change:* MOBILE is DISPLAY; it gets the identical cut to
    FEATURED. There is no "light filtering" DISPLAY variant.

12. **OPEN — Denominators rendered on DISPLAY** — all instances of §3.3 rule 3:
    - `app/dashboard/featured/screens/AnimatedFeatured.tsx:78` — `{data.totalStudents}`
      "students in the system"
    - `app/dashboard/global/page.tsx:85` — `{data.totalStudents}` "students"
    - `app/dashboard/global/page.tsx:23` — `{slide.rows.length}` "students" / "teams"
    - `app/dashboard/featured/screens/displayData.ts:21` — `${rows.length} ranked`
    - `app/dashboard/featured/screens/AnimatedFeatured.tsx:109` —
      `{team.totalStudents} students`
    - `app/dashboard/featured/screens/AnimatedFeatured.tsx:111` —
      `Top ${n} of ${teamLeaders.length} teams`
    - `app/dashboard/featured/screens/displayData.ts:38` — `${s.totalStudents} students`
    *Required change:* remove all of them. The overall school figure may return as a
    rounded number (§7.5).

13. **OPEN — Trend data on DISPLAY** — `app/dashboard/global/page.tsx:77,99` builds a "Moving
    up" panel from `lastMonthRank`, and `ScrollingLeaderboard.tsx:67` renders
    `↑ {change} ranks vs. last month`. The panels only show *rises*, which is the right
    instinct, but the **underlying `lastMonthRank`, `lastMonthGradeRank`, `lastMonthPoints`,
    and `monthToMonthChange` fields cross the wire for every student in the payload**, so
    the falls are readable in the page source. It also breaks hard rule 6: appearing in
    "Moving up" and then vanishing is itself a signal. *Required change:* DENY all
    `lastMonth*` and `monthToMonthChange` fields in DISPLAY payloads. The "Moving up" panel
    is permitted only if the server computes it and returns **only** a rise magnitude for
    students already above the overall cut, with no prior-rank field in the payload.

14. **OPEN — `app/supaApi/universal/dashboardFilters.ts:126-196`** — `updateDashboardFilters()`
    and `resetDashboardFilters()` mutate the shared `DASHBOARD_FILTERS` object at runtime.
    `DASHBOARD_FILTERS` is `Record<string, DashboardFilterConfig>` (not readonly), and
    `getDashboardFilters(dashboardType: string)` takes an arbitrary string. This violates
    §3.3 rule 5 directly. *Consequence:* if either mutator is ever reachable from a route
    handler or action, a caller can set `FEATURED.numStudentsOverall` to the school size
    and publish the roster, process-wide, for every display. *Required change:* delete both
    mutators; freeze the config; type the key as a union, not `string`.

15. **OPEN — `app/supaApi/universal/dashboardFilters.ts:91-98`** — `getDashboardFilters` falls
    back to `FEATURED` with a `console.warn` for any unrecognized string. A typo silently
    selects a tier rather than failing. *Required change:* unknown tier is a thrown error,
    not a default. Fail closed.

16. **OPEN — `console.log` of payloads** — `getGlobalPointStats` timeframe logging,
    `api/service/dashboard.ts:54-58`, `app/dashboard/topCards/page.tsx:23-27`. The
    `topCards` one runs **in the browser**, printing the dashboard payload to the console of
    a hallway kiosk. Server-side logs of student data belong in an audited sink, not stdout.
    *Required change:* remove. (Same defect at `app/student/compare/components/CompareContainer.tsx:35,71`; see §9.1.)

17. **RESOLVED — `app/dashboard/feature/page.tsx`** — now `redirect("/dashboard/featured")`.

18. **NEW, OPEN — A staff session on an unattended display (`app/dashboard/layout.tsx`)** — the
    gate accepts any admin or teacher session. In practice a hallway display will be a
    browser logged in as a real teacher or admin and left running. *Consequence:* any
    student who walks up to the kiosk holds that staff account. They can open
    `/teacher` and the scorebook (and `/admin`, if the account is an admin), and call every `isStaffOfSchool`-gated action
    from devtools. Today that includes `getSchoolStudents`, `getAllTimeframePointEvents`,
    `getStudent`, `globalDashGetGlobalStats`, and `teacherDashGetGlobalStats`. Together
    they give the full school roster with every per-event score. This is the PUBLIC-era
    full-roster leak again, now reachable from the hallway screen instead of the internet.
    *Required change (`backend` owns mechanism):* a display-scoped credential (e.g. a
    server-issued display token bound to one school, created by an admin) whose session
    resolves to DISPLAY only and cannot reach any TEACHER/ADMIN surface or action.
    `app/dashboard/*` should accept it. Interim, until it ships: the dashboard UI must not
    link to staff areas, and staff must be told that a logged-in kiosk is their account on
    the wall. That interim does **not** close the finding.

19. **NEW, OPEN — `isStaffOfSchool` used as the scope for uncut whole-school data** — the new
    wrappers in `universalApi.ts` (`getSchoolStudents`, `getAllTimeframePointEvents`,
    `getSchoolStudentGroups`, `getRankingGroupPoints`, the staff branch of `getStudent`,
    `teacherDashGetGlobalStats`, `globalDashGetGlobalStats`) and the staff branch of
    `getSchoolGlobalStats` (`api/student.ts`) admit **any teacher of the school**.
    *Consequence:* every teacher can read every student's record, roster position, and
    per-event scores school-wide, including students in other teachers' groups. That
    exceeds TEACHER (§4). *Required change:* keep `isStaffOfSchool` as the gate only for
    functions whose output is DISPLAY-ruled. Functions returning uncut or per-student data
    must check `admin_school_pair` (ADMIN) or scope the query to the caller's own groups
    (TEACHER). Exports with no current caller should be made module-private instead.

### 7.5 Former trade-offs, now ruled (2026-10-14)

The product owner delegated these calls to the disclosure authority. They are rulings, not
open questions.

- **`/dashboard/global` — RULED: it stays as a DISPLAY surface with the DISPLAY cut. The
  full-roster view moves out of `app/dashboard/`.** The staff login does not make a full
  roster safe here, because the page is built to be put on a screen (§0 R2). The
  full-roster view is genuinely valuable *to staff*, so it is moved rather than cut. Build
  it at an ADMIN route (e.g. under `app/admin/`), scoped to the admin's own schools. A
  teacher version must be scoped to the teacher's own groups.

- **Last names — RULED: full last name is ALLOWED on DISPLAY.** The objection was that an
  unauthenticated, internet-reachable page makes a child's record searchable against their
  full name. DISPLAY is no longer internet-reachable or indexable, and a hallway honor roll
  with full names is the conventional, flattering form. Last initial remains the rule for
  any future PUBLIC surface (§4).

- **Small-cohort panels — RULED: suppress the heading.** A cohort with a cut of 0 produces
  no panel and no heading, so the absence is invisible (consistent with the `grades[]`
  ruling in §7.1). Recommended, not required: a non-ranking celebration for small cohorts
  (participation counts above `MIN_COHORT_FOR_AGGREGATE`, teacher-chosen callouts). That is
  a product decision about features, not about disclosure.

- **Per-event scores — RULED: DENY on DISPLAY, permanently.** A per-event score includes
  every zero. Recent-results energy is permitted through *event-level aggregates*:
  participation count (if the event cohort ≥ `MIN_COHORT_FOR_AGGREGATE`), and the top scorer's
  name only if they clear that event cohort's own cut. No per-student array.

- **School total — RULED: a rounded school-wide population ("over 1,200 students") is
  ALLOWED on DISPLAY.** It is not usable as a ranking denominator at that granularity. It is
  never allowed for a grade, a point group, or a student group, where cohorts are small
  enough that rounding does not help. Rounding: down to the nearest 100 at or above 200;
  suppressed below 200.

**One genuine trade-off remains, stated for the owner as a consequence rather than a
question:** §7.4 #18 (display-scoped credential) slows down "stand up a display quickly".
Today it takes one teacher login. After the fix it takes any staff member approving a pairing
code on their own device (*amended 2026-10-14, D17, §10.14*; formerly "an admin issuing a display
token").
The authority's ruling is the restriction, because the alternative is a staff account on
an unattended screen in a hallway full of children.

---

## 8. Required contract — `app/supaApi/universal/dashboardFilters.ts`

For `backend` / `senior-developer` to implement. This replaces the current file entirely.
The disclosure authority specifies the contract; `backend` owns the mechanism and has final
say on how it is enforced in SQL.

### 8.1 What must stop being true

- `null` must not be representable in a disclosure limit. "No limit" is not a disclosure
  decision anyone gets to express in this type.
- The three limits must not be three independent knobs applied to three cohorts. They are
  three **terms of one minimum**, evaluated **per cohort**.
- There must be no runtime mutator and no `string`-keyed lookup with a silent fallback.
- The tier must not be a function argument supplied by a browser-reachable caller.
- A staff login must not select a wider tier on a dashboard route.

### 8.2 The types

```ts
/** Disclosure tiers. Not a free string. Not extensible by callers. */
export type DisclosureTier =
  | 'PUBLIC'    // unauthenticated. No sanctioned surface today; the floor for any future one.
  | 'DISPLAY'   // app/dashboard/* — staff-opened, peer-read (hallway screens)
  | 'STUDENT'   // own record (+ other students only at DISPLAY level)
  | 'PARENT'    // linked children (+ other students only at DISPLAY level)
  | 'TEACHER'   // own groups
  | 'ADMIN';    // own schools

/**
 * Policy thresholds. Readonly at the type level AND frozen at runtime.
 * Changing these values is a disclosure ruling, not configuration.
 * No exported function accepts these as a parameter.
 */
export type CutPolicy = {
  readonly nAbsolute: number;   // cap on published names in any one cohort
  readonly pRatio: number;      // 0..1, proportion of the cohort
  readonly kHidden: number;     // minimum number of students left unpublished
  readonly minCohortForAggregate: number; // floor for any published average/derived stat
};

/** A cohort is the population of one list, not the school. */
export type Cohort =
  | { kind: 'overall' }
  | { kind: 'grade';      grade: number }
  | { kind: 'pointGroup'; pointGroupId: number }
  | { kind: 'studentGroup'; studentGroupId: number };

/** The only thing a cut computation returns. */
export type Cut = {
  readonly cohort: Cohort;
  readonly size: number;      // server-side only. MUST NOT be serialized to any peer-visible payload.
  readonly cut: number;       // 0 means publish nothing for this cohort
};
```

### 8.3 The thresholds

```ts
const PEER_VISIBLE_CUT_POLICY: CutPolicy = Object.freeze({
  nAbsolute: 10,
  pRatio: 0.33,
  kHidden: 3,
  minCohortForAggregate: 10,
});
```

Provisional per §3.4. **One policy, used for every peer-visible ranking:** PUBLIC, DISPLAY,
and the other-students rows in STUDENT and PARENT payloads (§9). There is no separate, looser
DISPLAY policy because staff are logged in (§0 R2).

STUDENT (own record), PARENT (own children), TEACHER, and ADMIN are **not** cut-based for the
records they own. They are scope-based, and a cut is the wrong tool for them. A teacher sees
all of their own group, uncut; they simply must not see anyone else's. Replacing the current
`STUDENT`/`TEACHER`/`ADMIN` filter entries with cut numbers was the original category error
in this file. It modelled every tier as "how much of the leaderboard do you get", when the
real question for non-public tiers is "whose records are yours".

### 8.4 The one exported computation

```ts
/**
 * The three-way minimum. The only legitimate way to produce a peer-visible cut.
 * Pure, total, no I/O, unit-testable.
 */
export function computeCut(cohort: Cohort, size: number, policy: CutPolicy): Cut;
```

Required behavior, and the test cases that must accompany it:

| input `size` | required `cut` | why |
|---|---|---|
| 0, 1, 2, 3 | `0` | every term collapses; publish nothing (§3.1) |
| 4 | `1` | `size - kHidden` governs |
| 6 | `1` | `floor(0.33 × 6) = 1` governs |
| 9 | `2` | ratio governs — this is the "top 10 in a grade of 9" bug |
| 12 | `3` | ratio governs |
| 30 | `9` | ratio governs |
| 31 | `10` | `nAbsolute` governs from here up |
| 600 | `10` | `nAbsolute` governs — not 198 |
| negative / NaN | `0` | fail closed, do not throw into a render path |

Floor, never ceil. Integer result, never fractional. Never negative.

### 8.5 Tie handling

```ts
/**
 * Shrink-only tie resolution. Applied AFTER computeCut, on the measure actually
 * being published (totalPoints for overall/grade, group points for a point group).
 * If rows[cut-1] and rows[cut] are tied on `measure`, drop the whole tied band and
 * re-test. If the list empties, return [].
 */
export function applyTieShrink<T>(
  rows: readonly T[],
  cut: number,
  measure: (row: T) => number,
): readonly T[];
```

Never extend to include a tied band, because extending can breach `size - kHidden`. Never
order arbitrarily within a tie.

### 8.6 How the tier is obtained

```ts
/** Throws on an unknown tier. No fallback, no console.warn, no default. */
export function cutPolicyFor(tier: DisclosureTier): CutPolicy;
// PUBLIC, DISPLAY            -> PEER_VISIBLE_CUT_POLICY
// STUDENT, PARENT            -> PEER_VISIBLE_CUT_POLICY, applied to OTHER students' rows only
// TEACHER, ADMIN             -> throws: these tiers are scope-based, not cut-based
```

- No exported function in this module accepts a tier, a policy, a threshold, or a cut from
  a browser-reachable caller.
- `DISPLAY` is determined by the **route**, resolved server-side. Anything under
  `app/dashboard/` is `DISPLAY`, full stop, **whatever staff role the session holds.** An
  admin viewing `/dashboard/global` gets DISPLAY, not ADMIN.
- `PUBLIC` is what any session-less request gets. Today no data surface should answer one.
- The deleted surface: `updateDashboardFilters`, `resetDashboardFilters`,
  `validateFilterConfig`, `getAvailableDashboardTypes`, `DashboardFilterConfig`, and the
  mutable `DASHBOARD_FILTERS` record. None of them come back.

### 8.7 Where the cut must be enforced

`backend` has final say on mechanism, but the enforcement point is not negotiable: **the
cut is applied in the query that produces the rows, before they are serialized.** Per
hard rule 3, ranking the whole school in Node to return 10 names means the roster crossed
the boundary into the server action's response-building code and is one careless
`console.log` or error payload from leaking. The authority's expectation is a SQL function
per cohort that takes the cut as a `LIMIT` after a windowed rank, returning at most `cut`
rows and **no count**.

`Cut.size` exists for the server's own arithmetic. It must never appear in a peer-visible
response body. The DISPLAY student row type should be a distinct, narrow type, not
`GlobalPoints['students'][number]` with fields omitted at render time, so that adding a
field to the internal type cannot silently widen the payload. The same narrow row type is
used for the other-students rows in STUDENT/PARENT payloads (§9).

### 8.8 Disagreement procedure

Where the disclosure authority and `backend` disagree, **the stricter disclosure wins and
the question goes to the product owner.** Do not split the difference in code.

---

## 9. Second ruling — student compare and student-tier global stats (2026-10-14)

### 9.1 `app/student/compare/page.tsx` ← `getSchoolGlobalStats` (`api/student.ts:1030`)

> **SUPERSEDED 2026-10-14 (§0 D1, §10.1): the compare surface is RETIRED.** The field rulings
> below stand as the record of why the surface leaked. The "Required change" items 1–3 (build
> `getCompareCandidates`) are **withdrawn**: do not build a replacement candidate feed. Items
> 4–6 stand and are now unconditional: delete `getSchoolGlobalStats`, delete
> `app/student/compare/**` (including `CompareContainer.tsx`), and stop forwarding the nearby
> lists.

```
SURFACE: app/student/compare (server page) -> CompareContainer (client)
         fed by getSchoolGlobalStats(schoolId, null) and getStudentDashboardData()
AUDIENCE: STUDENT (own account) and PARENT (via getStudentDataWithContext's linked
          child). The function also admits any staff of the school.
SESSION IDENTITY: getCallerAccess() -> userId, studentId, staffSchoolIds. Admitted if
          schoolId is in staffSchoolIds, OR the caller's own student / any
          user_student_pair child is enrolled in schoolId. schoolId is caller-
          supplied but now validated. The page passes the resolved student's school.
WHAT IT RETURNS: every student in the school (id, first_name, last_name, grade),
          totalPoints, rank 1..N, and totalStudents. No cut. Computed in Node from
          every student_point row in the timeframe (over-fetch, hard rule 3).
          The page forwards all of it to a client component (CompareContainer),
          which logs it to the browser console (:71) and slices 10 for the dropdown
          (:87), a client-side cut (hard rule 1).
CONSEQUENCE: any student, and any parent of any student, can read the full ranked
          school roster, including who is last overall and every classmate's total.
          The parent case is wider still: a parent sees every other family's child.
```

**Field rulings — other students' rows (`students[]`)**

| field | ruling | reason |
|---|---|---|
| `students[]` below the overall cut | **DENY** | A student must not learn a peer's standing beyond what the wall shows. |
| `students[].firstName`, `.lastName`, `.grade`, `.totalPoints` | ALLOW-IF above the overall cut (§3, computed in SQL) | DISPLAY-equivalent. Comparing yourself with a top student is aspirational and flattering to them. |
| `students[].rank` | ALLOW-IF above the overall cut | Same. |
| `students[].id` | ALLOW-IF opaque per-response key | Only a selection key for the dropdown. Not a `student.id`. |
| per-point-group points of another student | ALLOW-IF that student is above **that point group's own** cut | §3.3 rule 1. Otherwise omit, and render as "—". |
| per-point-group rank of another student | ALLOW-IF above that point group's own cut | Same. |
| `totalStudents` | **DENY** in this payload | The caller's own denominator already arrives with their own record (`totalOutOf`). It does not belong beside a peer list. |
| `timeframe`, `pointGroups[]` (id, name, color) | ALLOW | Metadata. |

**Field rulings — the caller's own record** (from `getStudentDashboardData`, not this
function): own totals, own overall rank and grade rank, own `totalOutOf` / `gradeOutOf`, own
per-point-group points and ranks: **ALLOW** (STUDENT tier; a parent for a linked child). The
caller's own per-category rank must come from the own-record payload
(`pointGroupRankings`), not from sorting a roster in the browser
(`CompareContainer.tsx:98-106` does this today).

**Required change (for `senior-developer` / `backend`):**

1. Replace `getSchoolGlobalStats` with a compare-specific action that **takes no
   `schoolId`.** It resolves the student from the session (own account, or the linked
   child the page is showing, verified through `user_student_pair`) and derives the school
   from that student. Suggested shape:
   `getCompareCandidates(timeframeId: number | null): Promise<{ timeframe, pointGroups,
   candidates: CompareCandidate[] } | null>`, where `CompareCandidate` is the narrow
   DISPLAY row type (§8.7): opaque key, first name, last name, grade, total points, overall
   rank, and per-point-group `{ id, points, rank }` only for groups the candidate is
   above-cut in.
2. Compute the overall cut and each point group's cut in SQL (§8.7). Return at most `cut`
   candidates and **no count.**
3. **Drop the staff branch.** This feed serves STUDENT/PARENT. Staff who want a roster use
   ADMIN/TEACHER surfaces (§7.4 #19).
4. Delete `getSchoolGlobalStats` once `compare` is moved. It has no other caller. Deleting it
   removes a live POST endpoint.
5. In `CompareContainer.tsx`: remove the `console.log`s (:35, :71), the `.slice(0,10)`
   (:87, now redundant), and the roster sort used for category ranks (:98).
6. In `page.tsx` `adaptStudentData`: stop forwarding `nearbyStudents` and
   `nearbyGradeStudents` (see 9.3).

**What this costs:** a student can compare against the top of the school and against
themselves, but not against an arbitrary classmate below the cut. That is the intended
outcome. "Compare me with my friend who is ranked 140th" is exactly the league table §4
forbids.

### 9.2 `studentDashGetGlobalStats` (`app/supaApi/universal/universalApi.ts` ~:619)

```
AUDIENCE: STUDENT (student accounts only; parents fail the getOwnStudentData check)
          and any staff of the school.
SESSION IDENTITY: isStaffOfSchool(schoolId), else getOwnStudentData().schoolId === schoolId.
CALLERS: none in the app. It is still exported from a "use server" file, so it is a
          live POST endpoint.
WHAT IT RETURNS: the full GlobalPoints shape, filtered by DASHBOARD_FILTERS.STUDENT
          (top 10 overall || top 3 per point group || ceil(20%) per grade): the
          union defect (§7.4 #4, including the -1 rank fall-through) and the ceil
          defect (#5). Plus, uncut: pointEvents[].students[] (every classmate's score
          and rank on every event, §7.4 #3), lastMonth* and monthToMonthChange trends,
          totalPointsByDay / pointsEarnedEachDay, studentGroups membership,
          totalStudents and categoryStudentCounts (denominators).
CONSEQUENCE: any logged-in student can POST this with their own school id and read
          every classmate's per-assignment score, including every zero, plus the
          month-over-month decline of every published peer.
```

**Ruling: DELETE the export.** It has no caller, so deletion costs no product value, and as
written it violates every DISPLAY field ruling in §7.1. If a student-facing school
leaderboard is built later, it must use the same narrow DISPLAY row type and
`PEER_VISIBLE_CUT_POLICY` as §9.1, with no `pointEvents[].students[]`, no trends, no daily
history, no denominators. Field rulings for that future surface are exactly §7.1. The
student's own figures come from their own-record call, not from this payload.

`teacherDashGetGlobalStats` (also no caller) falls under §7.4 #19. Delete it, or scope it
to the teacher's own groups.

### 9.3 `nearbyStudents` / `nearbyGradeStudents` (`api/student.ts` ~:722-761; group variant ~:804-821)

Returned by `getStudentDashboardData` to `app/student/page.tsx`, `app/parent/[studentId]/page.tsx`,
and `app/student/compare/page.tsx`. Two students above and two below the caller, with name,
total, and rank, overall and in-grade (and per group).

**Ruling: DENY.** For a student near the bottom, "nearby" is the names, totals, and exact
ranks of the students at the bottom of the school. For a parent, it is other families'
children by name and standing. It fails test question 2 for every neighbour below the
cut, and nobody below the cut agreed to be shown.

**ALLOW-IF replacement:** a single number, "points to the next position" (the gap to the
next rank above the caller), with **no name, id, or rank of the student who holds it**.
This keeps the motivating part ("12 more points to move up"), and nobody is identified.
Conditions, amended 2026-10-14 (§10.2): overall cohort always; grade, point-group and
student-group cohorts only if the cohort has at least `MIN_COHORT_FOR_AGGREGATE` (10)
ranked students; omitted at rank 1; computed in SQL.

~~A neighbour who is above the overall cut may be shown by name, since they are already on
the wall, but that row comes from the §9.1 candidate list.~~ **Withdrawn 2026-10-14 (§0 D2).**
The candidate list no longer exists (§9.1 superseded). No other student is named on the
student home or the parent child page, in any form.

*Required change:* remove `nearbyStudents`, `nearbyGradeStudents`, and the group
`nearbyStudents` from the return type and the query. Add `pointsToNextRank` (and the grade
and group equivalents) computed in SQL. Update the student and parent pages accordingly.

---

## 10. Third ruling — UX restructure and Victorian remake plans (2026-10-14)

Source plans: `docs/design/UX_RESTRUCTURE_PLAN.md` (ux-optimizer) and
`docs/design/VICTORIAN_REMAKE_PLAN.md` (designer). Each question either plan put to the
disclosure authority is answered below, plus every other student-data surface found in
them. These are rulings, not recommendations. Line numbers are as of this date.

### 10.1 `/student/compare` — RETIRED (confirms UX §6)

```
SURFACE: app/student/compare   AUDIENCE: STUDENT, PARENT   SESSION IDENTITY: see §9.1
```

**Ruling: retire.** The authority's §9.1 ruling (cut-only candidates) was the least a
compare page needed. Retiring it is stricter and costs nothing: the route has no inbound
link, its data is fabricated, and the student's own standing already answers "how am I
doing". **Stricter wins.**

- Delete `app/student/compare/**`, `getSchoolGlobalStats` (`api/student.ts:1030`, a live POST
  endpoint returning the full ranked roster), and the `adaptStudentData` forwarding of the
  nearby lists. The route redirects to `/student`.
- The designer drops compare from Phase 4 and drops the `max-w-5xl` compare exception.
- **A future "How you compare with your grade" is pre-ruled ALLOW-IF:** one aggregate, the
  grade's mean or median total, computed in SQL. The grade must have at least
  `MIN_COHORT_FOR_AGGREGATE` (10) ranked students. No names, no distribution, histogram,
  quartile or "bottom N" figure. The student's own position against it ("above / below your
  grade's average") is own data and is allowed. Anything beyond that is a new ruling.

### 10.2 Named neighbour and peer lists — student home and parent child page

```
SURFACES: app/student/page.tsx (Overall, Grade, Point Group Rankings cards)
          app/parent/[studentId]/page.tsx:56-75 ("Nearby students" table)
AUDIENCE: STUDENT (own) / PARENT (linked child)
SESSION IDENTITY: own student via linkedUser; parent via user_student_pair
FEED: getStudentDashboardData / getStudentDashboardDataById -> StudentRankingData
      (types/domain.ts: nearbyStudents, nearbyGradeStudents) + per-group nearby lists
```

**Ruling: §9.3 DENY stands, on both pages, with no exceptions.** UX's default (no
neighbour lists on either page) is adopted as the ruling. The above-cut-by-name exception in
§9.3 is withdrawn, so no other child is named on either page.

| field | student home | parent child page | reason |
|---|---|---|---|
| `nearbyStudents[]`, `nearbyGradeStudents[]`, per-group nearby | **DENY** | **DENY** | §9.3. At the bottom of the school it names the bottom of the school. |
| own `totalRank`, `gradeRank`, per-group rank | ALLOW | ALLOW | Own record. |
| own `totalOutOf`, `gradeOutOf`, per-group `outOf` | ALLOW (§10.5) | ALLOW (§10.5) | Own denominator. |
| `pointsToNextRank` (overall) | ALLOW | ALLOW | No one identified. |
| `pointsToNextRank` (grade / point group / student group) | ALLOW-IF cohort ≥ 10 | ALLOW-IF cohort ≥ 10 | In a grade of 4, "the student just above you" is a band of two. Their total is then nearly identifiable. |
| own monthly trend (`StudentMonthlyTrends`) | ALLOW | ALLOW | Own record. Trends are private, not denied. |
| parent "Percentile" tile | ALLOW (own) | ALLOW (own) | Permitted, and UX's removal of it is endorsed. |

**Required change:** as §9.3. Remove the three lists from the type and the query (not just
the render). Note that today they are rendered at `app/parent/[studentId]/page.tsx:56-75` and
destructured at `app/student/page.tsx:66`. Release: removing data from a role is MAJOR (UX §7).

### 10.3 Point sharing

```
SURFACES: SharePointModal (sharer), SharedPointsTab "Shared with me" (recipients)
FUNCTIONS: shareStudentPoint / unshareStudentPoint (api/student.ts:1490, :1575),
           getSharedPointsForStudent (api/student.ts:1643)
AUDIENCE: sharer = STUDENT (own record). Recipients = other students, reached through
          student_group_pair membership of the shared groups. A peer-to-peer disclosure
          made with the sharer's consent.
SESSION IDENTITY: getStudentDataWithContext() (student accounts only; parents are not
          resolved, so parents neither share nor see the feed)
```

**Why sharing passes the asymmetry test:** the sharer chooses the point, the audience, and
the moment. A child showing their friends a good score is "praise publicly" with the child
holding the pen. That consent covers exactly what the child was told would be shown, and
nothing more. So the sentence is the contract, and the payload may not exceed it.

**The "who will see this" sentence — APPROVED, in this wording:**

> Students in the groups you pick will see your name, this assignment, and the points you
> earned. Students who join those groups later will see it too. You can stop sharing at any
> time.

Single-group toggle: "Students in **Band** will see your name, this assignment, and the
points you earned." If a parent group includes child groups, the modal must name every
included group before the share commits ("Band, including Band A, Band B, Band C").
Do not write "everyone", "your class", or "your friends". The audience is group membership,
and the sentence must say so. Do not promise that unsharing removes it from anyone's memory
or screenshots. "Stop sharing" is accurate; "delete" is not.

**Recipient field rulings (`SharedPointData`, `types/domain.ts:707`)**

| field | ruling | reason |
|---|---|---|
| `eventName`, `eventDate`, `pointGroup` (id, name, color) | ALLOW | "this assignment", as the sentence says. |
| `sharedPoints[].pointValue` | ALLOW | "the points you earned", as the sentence says. |
| `sharedPoints[].sharer.firstName`, `.lastName` | **ALLOW** | The recipients are group mates, who know each other by name. A share with no name praises nobody. The sentence tells the sharer their name is shown. |
| `sharedPoints[].sharer.id` | **DENY** | The recipient needs nothing keyed by a real `student.id` (test question 3). Use an opaque per-response key. |
| `sharedPoints[].studentPointId` | ALLOW-IF opaque | Only a React key. Not the database id. |
| `sharedPoints[].inputScore` | **DENY** | The sentence promises "points", not the raw quiz score. A second figure the child did not knowingly share is outside the consent. |
| own rank / `outOf` for the shared event | **DENY** (never added) | The sharer's per-event rank sits beside the Share button on their own page (§10.5). It must never travel with the share. |
| ordering of `sharedPoints[]` within an event | **ALLOW-IF not by points** | `api/student.ts:1797` sorts descending by `pointValue`, which turns everyone who shared into a per-assignment league table with a last place. Order by share time or by name. |
| any count of group members, or of who did not share | **DENY** (never added) | Hard rule 6. "4 of 22 shared" marks the 18 who did not. |

**Violations**

1. `api/student.ts:1520` — `shareStudentPoint` accepts **any** `groupIds` and shares into them
   and all their descendants, with no check that the sharer belongs to them. Group ids are small
   integers. *Consequence:* a student can put their name and score in the "Shared with me" feed
   of any group in any school. Then the approved sentence is false, because the recipients are
   strangers. *Required change:* intersect the requested ids with the sharer's own groups (as
   `getStudentGroups` computes them) server-side, and reject the rest.
2. `api/student.ts:1776-1778` — `inputScore` and the real `sharer.id` are returned to recipients.
   *Required change:* drop `inputScore`; replace `sharer.id` and `studentPointId` with opaque keys.
3. `api/student.ts:1797` — the feed is sorted by points (see the table). *Required change:* sort
   by share time, then by name.
4. **Shares are live joins to `student_point`.** If a teacher corrects a 90 down to 40 after the
   child shared it, the group now sees 40. The child consented to show a 90, not a 40.
   *Required change (`backend` owns mechanism):* withdraw the share automatically when the
   underlying `point_value` changes, and tell the sharer the next time they visit ("Your
   shared score for Quiz 4 changed, so it is no longer shared"). Snapshotting the shared
   value is the alternative. The authority prefers withdrawal, because a snapshot publishes a
   number the teacher has said is wrong.

The tab name "Shared with me" and the subtitle "Points your classmates chose to show you."
are **APPROVED**.

### 10.4 Pre-link confirmation — "Is this Maya R.?"

```
SURFACE: proposed lookup before linkStudent / linkStudentToParent commit (UX §1, Screen D)
AUDIENCE: an authenticated user with no relationship to the student yet. Treated as
          PUBLIC-adjacent: a stranger who has typed a school number and a code.
```

**Reasoning:** possession of the code is already the credential for the whole record.
`linkStudentToParent` (`app/supaApi/server/parent/parentApi.ts:30`) lets any code holder
become a parent with full access. So showing "Maya R." to a code holder discloses strictly
less than the action it confirms, and it stops a mistyped code linking the wrong child to a
family. The new risk is different: a lookup that does not commit is a silent name oracle. It
lets someone test codes and harvest names without leaving the linked-account trace that a
wrong link leaves.

**Ruling: ALLOW-IF every condition holds.** Until all of them hold, the step is not built.

1. **Returns first name and last initial only.** No grade, no school name beyond what the
   caller typed, no id, no photo, no "already linked" flag.
2. **The response carries no student id or token.** The commit call re-submits the school
   and code and re-validates them. It never trusts a value returned by the lookup.
3. **Uniform failure.** Wrong code, wrong school, and already-linked all return the same
   message ("That code did not match…"). Today `linkStudent`
   (`app/supaApi/server/linkStudent.ts:19-32`) returns three distinguishable errors. One of
   them echoes the code into the response and stdout ("No student found for link code: " +
   code). That is an enumeration oracle today, with or without the confirm step. Fix it
   regardless.
4. **Rate limited.** Lookup and link attempts share one bucket per user and per IP. Proposed:
   5 failures per hour, then a cool-down. `backend` owns the numbers. Failures are logged
   without the code.
5. **Codes are unguessable.** Codes come from a CSPRNG with at least 40 bits of entropy. The
   teacher generator (`app/supaApi/client/admin/teachers/adminTeachersApi.ts:19-22`, 7 hex
   characters of `md5(Date.now())`) fails this. It is about 28 bits and predictable from the
   time it was issued. `backend` must confirm how *student* codes are generated before the
   confirm step ships.
   **Answered by the live baseline (2026-10-14, `docs/schema/baseline-2026-10-14/README.md`
   finding 6; `tables.sql:280-285`):** student and teacher codes default to
   `substring(md5(random()::text), 0, 8)`. That is 7 hex characters, or 28 bits. `random()`
   is not a CSPRNG. The column has no unique constraint and no per-school scoping. **Condition
   5 fails for students too, so the confirm step stays unbuilt.** Two further consequences:
   (a) The codes are not unique, so two students in one school can share a code. When they
   do, `linkStudent`'s `.maybeSingle()` errors and returns "Something went wrong" rather than
   the uniform no-match message. That makes it a collision oracle. `linkStudentToParent`'s
   `.single()` fails for both children. (b) In a school of 600, each blind guess hits *some*
   student with a probability of about 600 / 2^28, roughly 1 in 450,000. There is no rate
   limit today. *Required (`backend`):* a CSPRNG generator of at least 40 bits
   (`gen_random_bytes`; pgcrypto is installed), `UNIQUE (school_id, link_code)`, and a
   **one-time regeneration of every existing student and teacher code** once the generator
   is fixed. Every current code was issued by the weak generator, so treat them all as
   exposed. Staff then reissue codes to families. The quoted-literal default on
   `school_admins.link_code` is in a legacy table with no disclosure surface (README decision
   #4). It is noted here, not ruled.
6. Authenticated sessions only, and student and parent linking only. The teacher link flow
   does not get a name preview, since staff accounts are provisioned by admins.

**Also ruled (UX §1 asks):** a school number in a URL (`?school=12`) is **not** a credential
and is ALLOWED in links, including the admin "Copy family sign-up link". A link code is
**never** put in a URL: query strings land in browser history, server logs, and referrers.
Codes stay typed.

**Policy gap closed here:** any number of accounts can link as a parent with one code, and
nobody is told. *Ruling:* parent links must be listed on the student's record for the admin,
and each must be revocable there. An admin must be able to rotate a student's code. A code
that has been shared beyond the family is a disclosure of the child's entire record, so
staff need a way to see that it happened and to stop it.

### 10.5 Own denominator ("of N students") — CONFIRMED with conditions

The designer's assumption is correct: §4 STUDENT allows a student their own denominator, and
PARENT inherits it for a linked child. Conditions:

- **ALLOW** on the student's own home and on the parent's child page, for overall, grade,
  point-group, and per-event standing (`totalOutOf`, `gradeOutOf`, `pointEventRankings[].outOf`).
- `N` is the size of the cohort the rank was computed in (the ranked participants),
  computed server-side and returned as one number. It is never derived on the client from a
  roster.
- **DENY** in any shared payload (§10.3), in the "Shared with me" feed, in any DISPLAY
  payload, and in any surface built to be shown to others (a future "share my rank" card,
  certificate, or export). The own view is private. A shareable artifact is not.
- **No distinct visual treatment for low ranks.** Nothing is red, dimmed, smaller or lighter
  for a low rank, and there is no "last place" styling. *Amended 2026-10-14 (D8):* the earlier
  clause "rank tiers below the medals are not colour-coded" is superseded by standing decision
  #5. Ranks 1–20 are coloured by tier under the conditions in §10.10, which stop the neutral
  tier from ever identifying a small bottom group. The purpose is unchanged: a child's phone,
  glanced at by a friend, does not shout their bottom position.
- Known defect, low severity: `calculatePointEventRankings` (`api/student.ts:838`) breaks ties
  by array order, so two students tied on an event get different ranks. For an own rank this
  invents a distinction (§3.3 rule 4's principle). *Required change:* tied students share the
  better rank.

### 10.6 "Points gained since last visit" — ALLOWED-IF

It is the student's own data, at STUDENT tier. Conditions:

- **Preferred mechanism:** client-side. Keep the last-seen total in `localStorage`, keyed by
  student, and compare it on load. Nothing new is stored on the server.
- If served from the server (`previousTotalPoints`), it must be the student's own total as
  of a **time boundary** (start of today, or the last award before the session), derived from
  existing point rows. **No server-side log of when a child opens the app.** A visit history
  is new behavioural data about a child, and it is DENY until separately ruled. It would be
  readable by every tier above STUDENT.
- **Celebrate only a positive delta.** Zero or negative renders the final number statically,
  with no count-down and no "−" line. The "+ points" small-caps line in Concept 2 appears
  only for a positive delta.
- Not for the parent view or any other tier unless separately ruled.

### 10.7 Everything else in the two plans that surfaces student data

**SURFACE: "Groups You Lead"** (`app/student/page.tsx` ~:148 ← `getStudentLeaderGroups`,
`api/student.ts:325`). AUDIENCE: GROUP LEADER (a peer). SESSION IDENTITY: the own student,
resolved through `getStudentDataWithContext`, then `student_group_leaders`.

*Superseded 2026-10-14 (D13).* The earlier ruling here (letter grades DENY, names only) is
replaced by a product-owner requirement: leaders see one S–E letter per member **per point
group**. This section rules *how*. Each condition L1–L12 is part of the ALLOW. If any one is
missing, the section ships names-only. Names-only is the working tree today
(`api/student.ts:320-335`), so the earlier open violation is closed there.

The cost, stated plainly: this hands a peer an unflattering figure about a classmate. That is
the one kind of disclosure §1 keeps with the student, their parents and the staff responsible
for them. Nothing in the spec makes it flattering. It keeps the figure coarse, contained, and
impossible to assemble into a league table.

| field | ruling |
|---|---|
| group `id`, `name` | ALLOW: only groups the session student leads (L1) |
| member `firstName`, `lastName` | ALLOW |
| member key | ALLOW-IF opaque per response. Never `student.id`. |
| member `grade` (year level) | DENY. Not needed. |
| per-point-group `letter` (`'S'`, `'A'..'E'`, or `null`) | **ALLOW-IF L1–L12** |
| point group `id`, `name`, `color` | ALLOW. The colour styles the column header only (L6). |
| points, scores, percentiles, ratios, ranks, cohort sizes | DENY |
| an overall or total letter | DENY (owner's clarification: per point group only) |
| `percentileToRating` colour, or any colour on a letter | DENY |
| counts, distributions, averages, a "group grade", history | DENY |

**Implementable spec**

- **L1. Scope.** The leader's own groups only, meaning rows in `student_group_leaders` for the
  session student, and the **direct** members of those groups. A child group is included only
  if the leader is listed on it too. The leader's own row is left out of the list (their own
  letters are own data, shown on their home). Everything is resolved server-side from the
  session. No group id from the caller is trusted.
- **L2. Payload per member:** an opaque key, the first name, the last name, and
  `letters: Array<{ pointGroupId, letter: 'S'|'A'|'B'|'C'|'D'|'E' | null }>`. Nothing else. The
  letter is computed in SQL (`backend`), so no points, percentile or cohort size leaves the
  database.
- **L3. Scale: exactly six letters, S, A, B, C, D, E** (*owner's answer, 2026-10-14*). No +/−
  and no F. S is a deliberately narrow top band (L4). The 18-step `percentileToRating` scale
  (`types/domain.ts:127`) must not be used here. Eighteen steps across a group of ten comes
  close to a rank order.
- **L4. Basis: the member's standing in the whole-school cohort for that point group, never
  relative to group mates.** Take the percentile of the member's point-group total among all
  ranked students in the school for the current timeframe. Percentile here means
  p = (students in that cohort with a strictly lower total) ÷ (cohort size), so tied students
  share the better band. Then band it:

  | letter | S | A | B | C | D | E |
  |---|---|---|---|---|---|---|
  | p at least | 0.93 | 0.75 | 0.57 | 0.39 | 0.20 | (below 0.20) |
  | band width | 7% | 18% | 18% | 18% | 19% | 20% |

  S keeps the `percentileToRating` S range (top 7%). It is well under a fifth, as the owner
  asked. E stays the bottom 20%, as in the original quintile ruling, so the L8 floors are
  calibrated the same way as before. If the
  school's cohort for that point group has fewer than 30 students, the column is `null`
  (L8). A group-relative letter is a rank in disguise: quintiles of a group of five *are*
  ranks.
- **L5. One column per point group** active in the timeframe. No overall letter, no "average
  letter", and no column derived from another column.
- **L6. Order and presentation.** Members are sorted by last name, then first name. The sort
  is done server-side and is fixed. The UI offers no sort, filter, group-by or search on
  letters, and it highlights no row. A letter is plain `--foreground` text, at the same size
  and weight as the names. No fill, badge, icon, emphasis, rank-tier hue (§10.10) or
  `percentileToRating` colour. A point group's colour may mark its column header only.
- **L7. No derived figures.** No per-letter counts, no distribution, histogram, average, "N
  below C" or group summary. No change markers ("was B, now D") and no trend.
- **L8. Singling-out suppression, decided per (group, point group) column.** A column is shown
  only if both of these hold:
  (a) the group has **at least 6 members besides the leader**, and the L4 school-cohort floor
      holds;
  (b) **each of D and E is held by either 0 members or at least 3** (`K_HIDDEN` = 3, "a crowd
      to hide in").
  (c) *added 2026-10-14 (D15, §10.13):* **more than half** of the listed members took part in
      that point group in the timeframe. A member with zero points gets E, never a blank.
  If any of these fails, the **whole column** is `null` for every member. Hiding only the lone E
  would mark that member by the gap (hard rule 6). A hidden column shows a single neutral
  line, "Not shown for this group", for every reason, so the leader cannot tell "group too
  small" from "someone is alone at the bottom". A lone S, A or B is never suppressed: it is
  flattering, and the asymmetry test allows it.
  **Re-check for the S band (2026-10-14):** S is the top 7% of the *whole school's* cohort,
  not of the group, so the band's narrowness does not single anyone out within a group. A lone
  S says "near the top of the school in this category". The student would be glad a peer saw
  that, and in most cohorts that student is within reach of the DISPLAY cut anyway. At the
  30-student floor, S holds the top 2 or 3 students, which is a near-rank, but a flattering
  one, so it stays allowed. S does not change how D and E are assigned, so condition (b) stays
  on D and E only. A column with no S tells the leader nothing about anyone at the bottom.
  One added rule: S gets **no** special styling under L6. That means no gold, star, glow or
  rank-tier hue. Otherwise S becomes a rank-1 medal, and the plain letters beside it read as
  lesser. *Example:* in a group of 8 with A, A, B, C,
  C, C, D, E, one member holds D and one holds E, so the column is hidden. In a group of 9
  with A, B, C, D, D, D, E, E, E, the column is shown.
- **L9. Stability.** Letters come from a snapshot taken at most once a day, never computed
  live. Otherwise a leader could watch a classmate's letter move after a single event and
  infer that event's score (hard rule 6). *Added 2026-10-14 (D16, §10.13):* a snapshot covers
  whole days only (events dated before its day boundary). UTC is the boundary for now, and some
  schools need a school timezone first.
- **L10. Members are told.** Every member of a led group sees this on their own home, beside
  their groups: "<Leader first name> <last initial>, who leads <Group>, can see your letter
  grade (S, or A to E) for each category." The member also sees their own per-point-group letters
  for that group, so they know exactly what the leader sees. The same sentence appears on
  their parent's page for that child. The member is **not** shown whether their column is
  currently hidden, because that would reveal L8's reason.
- **L11. Leader only.** Letters never appear in any PARENT payload for the leader: the duty
  belongs to the child, and the letters are other children's data. They never reach DISPLAY
  or shares, and they cannot be exported or printed as a list.
- **L12. Separate from the TA grant.** Letters are read-only and do not widen the TA scorebook
  rules below. A student who is both a leader and a TA still gets per-event values only for
  granted events, and still gets no totals.

**The 7fe5120 implementation must not be restored.** It fails L3 (18 steps), L4 (points ÷
the top scorer across the leader's groups, which makes the leader's best friend the
reference point), L5 (it also sends an overall letter), L6 (red and purple `percentileToRating`
colours for low letters, and a sort by totals), L7 (no derived figures were checked), L8 (no
suppression) and L10 (members are never told). It also sends the members' year `grade`.
*Hand-off:* `backend` (an SQL function returning only the L2 shape, with daily snapshots),
senior-developer (type and page), designer (plain letters, header-only colour, L10 copy).

**SURFACE: TA scorebook** (`/scorebook/group/[id]` ← `newGetScorebookData`,
`app/supaApi/server/teacher/teacherServerActions.ts:283`). AUDIENCE: TEACHING ASSISTANT when the
caller is a student assistant. Events are already correctly scoped to granted events.

| field (TA caller only) | ruling | reason |
|---|---|---|
| group mates' names, and the entered value on **granted** events | ALLOW | The duty. The TA has to see what they are editing. |
| `studentPoints[].pointData.notes` (:423) | **DENY** | Teacher notes about a peer. |
| `studentPoints[].student.powerschoolId` (:418) | **DENY** | An identifier. Not needed for the duty. |
| `studentPoints[].student.studentGroups` (:414) | **DENY** | Peers' memberships in other groups. Outside the TA's own group. |
| per-student totals, averages, letter grades, sort-by-score, rank | **DENY** (UI and payload) | §4: no comparison across group mates. Per-event entry only. |
| `full_access` | ALLOW-IF granted by the teacher | It widens *which events*, not *what kind of data*. Every row above still applies. |

**VIOLATION 2 (OPEN):** `newGetScorebookData` returns notes, PowerSchool ids, and other-group
memberships to student TAs. *Required change:* when the resolved access is a TA, select only
names and the per-event values for granted events.

**SURFACE: teacher home "Link Code"** (`app/teacher/page.tsx:258-259`, fed by `linkCode` at
`api/teacher.ts:97,163,341`). AUDIENCE: TEACHER (own). UX §5 asked for confirmation that this is
acceptable. **Ruling: DENY.** Hard rule 4: a credential is not a field. The code has no use once
the account is linked (`linkTeacher` refuses an already-linked teacher). It is shown in
`text-3xl` red on a screen that gets projected to a classroom. **VIOLATION 3 (OPEN):** remove
`linkCode` from the teacher payloads and the page. Re-linking goes through an admin reissuing the
code. The "Your account" disclosure keeps Teacher ID and School ID only.

**Dashboard hub (UX §2):**
- `/dashboard/global` copy: UX's note "the full-roster view is legitimate" is **corrected**.
  §7.5 already rules it a cut DISPLAY surface. The tile must not promise "Everything on one
  screen". Suggested wording: "Whole-school highlights on one screen." The full roster belongs
  to an ADMIN route outside `app/dashboard/`.
- School switcher: **ALLOW** for admins and for teachers with more than one school, among
  the session's own schools only (§0 R6). It lists only those schools' names.
- Fall-back notice: **ALLOW-IF** it names only the school being shown. It must not name the
  rejected school or tell "does not exist" apart from "not yours". "You do not have access
  to school 7" echoes the caller's own input and is acceptable.
- School name corner label on displays: ALLOW. The "Paired by <teacher>" label: ALLOW (staff
  name, and it makes the pairing accountable). Display pairing tokens satisfy §7.4 #18 when
  built.

**Scorebook restructure (UX §3):** near-match name suggestions, "N of M scored", and overwrite
counts are TEACHER-own-group data. ALLOW. When the viewer is a TA, "N of M scored" is ALLOWED
on granted events, and the TA-column rules above apply.

**Designer plan:**
- The Standing section's neighbour rows (designer §4.3) are **DENY** (§10.2). Build only the
  neighbour-less Standing.
- Rank badges on the student's own ranks: ALLOW under §10.10, for every tier from 1 to 20,
  not only 1–3. Per-group data colours are style only.
- Concept art and QA screenshots: **placeholder data only** ("Ada Example", "0,000 points").
  The designer already requires this, and it is now a rule. A screenshot of a real student's
  record for a design review is a disclosure to everyone who sees the review. Seed fake data
  for the 320/390/1024 sign-off pass. (`reference.jpeg` at the repo root is an anime still
  with no student data. No action.)

**Home and link screens (UX §1):** the role router, `ParentChip` ("Your children" + count),
the one-child parent redirect, and the sign-up "we sent a link to <email>" copy show only the
caller's own data. ALLOW.

### 10.8 Policy gaps recorded (proposed rulings in force until revisited)

- **Shared-feed membership is live.** A student added to a group later sees earlier shares.
  This is ruled acceptable, because the sentence discloses it. If owners want shares limited
  to the members at the time of sharing, that is a stricter option, not a required one.
- **Parent code reuse** (§10.4): ruled. Admin-visible, revocable parent links and code rotation
  are required.
- **Leader duty definition.** *Updated by D13.* The one defined leader grant is read-only
  per-point-group letters, under §10.7 L1–L12. Nothing else is ruled. Any other leader data
  defaults to names only.
- **Per-event standing in tiny events** (§10.12): `event_rank` and the participant count are
  returned only for events with at least 4 participants. This is a proposed ruling, in force.
- **Rank colour on future shareable artifacts** (certificates, "share my rank"): these
  artifacts are not ruled. Until they are, they carry neither the rank nor its colour
  (§10.5, §10.10).

### 10.9 For the product owner

- **Groups You Lead letter grades (D13) are ruled as you asked, and the cost is real.** A peer
  now holds a coarse, sometimes unflattering label for each classmate in each category. That
  is the kind of data §1 keeps with the student, their parents and responsible staff. These
  are your choices, and none of them is taken by default:
  (a) a per-group teacher switch, so letters appear only where a teacher turns them on;
  (b) a member opt-out from having letters shown to leaders;
  (c) the L8 floors (6 members, and 0 or at least 3 at each of D and E). These will hide the
      columns in many small groups. Lowering them is a ruling, and the authority would
      object to fewer than 3.
- **Mobile leader screen (D14).** Once `get_led_group_member_points` is cut to names only, the
  mobile "group I lead" screen loses every number it shows today. If the app cannot handle
  NULL, the screen stops working until it moves to letters. The alternative was to keep
  showing leaders their friends' totals until the app is updated. The authority rejected that.
- **Mobile leaderboards (D14).** In small grades and point groups, the lists get shorter or
  disappear, and the "2 students just above you" rows are gone. What remains is the
  points-to-next number. That is the same trade the web home already made (D2).
- **Letter participation rule (D15, L8(c)).** Any point group that half the group never did
  hides its column for that group. The alternative is a column of E's for children who never
  had the chance. The authority chose to hide.
- **Neutral-band floor (§10.10 Q1.3).** In a cohort of 21 to 29, a normal class size, nobody's
  rank is coloured, including 1st place, on that cohort's ranks. The alternative is to colour
  as usual and accept that the plain disc means "bottom few" from across the room. The
  authority chose the floor.
- **Parent linking without a school round-trip (§10.11).** Until the parent invite is built,
  families can link only with a code issued by staff. The alternative is showing the
  permanent code on the child's screen. The authority rejected that, because a classmate who
  copies the code gets the child's whole record.
- **The pre-link confirm (§10.4) is gated on backend work:** code entropy, rate limits, and
  uniform errors. Wrong-child links stay possible until that ships. The alternative was "show
  the name after linking with Undo", which hands a stranger the full record first. The
  authority rejected that alternative.
- **Auto-withdrawing shares on a score change (§10.3)** means a child occasionally finds a
  share gone. The alternative was publishing a corrected, lower score under their name without
  asking. The authority rejected that alternative.

### 10.10 Rank colour system (standing decision #5) — ALLOW-IF

```
SOURCE:   docs/design/VICTORIAN_REMAKE_PLAN.md "## Rank colour system" (R1–R7)
SURFACES: every place a rank numeral is shown: student home, parent child page, teacher,
          admin, DISPLAY
AUDIENCE: the surface's own tier. Colour grants no new tier.
```

**Q1. Does colouring a rank that is already shown disclose anything new?** Not to anyone who
can read the numeral, because the colour is a function of it. But colour carries further
than a numeral. A 28px "23" is legible at arm's length, while a gold or green disc can be
read from across a room. So colour adds exactly one audience: the person who can see the
screen but cannot read it. That person learns the tier band. For tiers 1–20 this is praise,
and it passes the asymmetry test. For the neutral tier it means "not in the top 20", which
is harmless only when "not in the top 20" is a crowd.

The designer's 21+ treatment satisfies "no styling that marks a rank as low" wherever neutral
is the ordinary state: a card disc, a 1px `--border` ring, a `--foreground` numeral, the same
size and weight, and no dimming (R4, R6). It falls short in one place, a cohort of 21 to 29.
That is a normal class size, and per-event ranks (`pointEventRankings[].outOf`) live there.
In a class of 24, the neutral disc means "bottom four", readable from across the room.
Rulings:

1. **The tier comes from the absolute rank only.** Its inputs are the displayed rank and, for
   the gate in rule 3, the cohort size. It never uses rank ÷ N, a percentile, a letter grade
   or points. A cohort-relative scale would let a colour mean "bottom of the class", which is
   the one thing a colour must never mean.
2. **Colour appears only beside the numeral it comes from** (endorses R6). Nothing on its own
   may be coloured by rank: no bar, row tint, avatar ring, chip, notification, favicon or
   background without the numeral on the same element. Rank colour never appears where the
   rank itself is not allowed. That rules out shares and the shared feed (§10.3),
   `StudentChip`/`ParentChip`, and any certificate, export or "share my rank" artifact
   (§10.5).
3. **Neutral-band floor.** For a rank shown with its cohort size N:
   - **N ≤ 20:** colour by tier. There is no neutral band, and last place gets the same colour
     the same rank gets in any cohort (8th of 8 is crimson, exactly like 8th of 600). Nothing
     marks it as last.
   - **21 ≤ N < 30:** **every rank in that cohort renders `none`**, including 1st. Otherwise the
     neutral band (N − 20) would be fewer than `MIN_COHORT_FOR_AGGREGATE` (10) students, a
     group small enough to single out.
   - **N ≥ 30:** colour by tier.
   - **N missing, non-finite or below 1:** `none`. This fails closed, as R1 already does for an
     unknown rank.
   The classifier becomes `rankTier(rank, cohortSize)`. The gate lives inside it, in the one
   shared module (`lib/rankTier.ts`), so no call site can skip it. *Hand-off:* the designer
   amends R1, and senior-developer implements it.
4. **Own screen (STUDENT): ALLOW** under rules 1–3, on every rank the student may see: overall,
   grade, point group, student group and per event. Each rank uses its own cohort's N, so the
   gate is evaluated per cohort.
5. **Parent screen with several children (PARENT): ALLOW** under rules 1–3 on each child's own
   page. The parent may already see every linked child's rank, so colour tells them nothing
   new. Colour does make comparing siblings instant, though, so:
   - the multi-child overview (child picker, `ParentChip`, any list of children) shows no rank,
     and therefore no rank colour (rule 2);
   - children are never ordered by rank or points, and no child is highlighted as "top";
   - each child's ranks use that child's own cohorts. A side-by-side comparison of children
     is not ruled, and defaults to DENY.
6. **TEACHER / ADMIN: ALLOW** under rules 1–3, wherever the numeral is already shown to that
   tier. Colour does not make a projected roster any more permissible than it already was.
7. **The 21+ treatment is endorsed as written**, with one addition. A neutral rank gets the
   same badge element, size and position as a coloured one. Badges may not be left off for
   neutral ranks, and coloured ranks may not get any emphasis beyond the colour itself (no
   animation, glow or larger plate). Otherwise the shape becomes the marker instead of the
   colour.

**Q2. DISPLAY: coloured 1–20 beside plain 21+ when the cut exceeds 20?** **That cannot happen,
and the policy now makes sure it never will.** The cut is
min(N_ABSOLUTE, ⌊P·size⌋, size − K), with N_ABSOLUTE = 10 (§3). No DISPLAY payload carries a
rank above 10, so a wall only ever shows tiers 1–5 and 6–10: never green, never neutral.
- **`N_ABSOLUTE` has a hard ceiling of 20** for as long as the colour system stands (§3.4).
  Above 20, a wall that exists to celebrate everyone on it would be split into a coloured class
  and a plain class. Raising the ceiling is a new ruling, not a configuration change.
- DISPLAY calls `rankTier(rank)` **with no cohort size**. The rule 3 gate is not needed there,
  because no neutral rank is ever shown. The denominator must not reach a DISPLAY payload just
  to feed a colour (§3.3 rule 3).
- A DISPLAY rank above the cut breaks §3 first, and only then becomes a colour question. The
  presets still publish 20 (`app/supaApi/universal/dashboardFilters.ts:35-36`, `:161-162`), and
  `isStudentPublished` (`app/supaApi/universal/publicationCut.ts`) applies the overall and
  point-group limits without taking the minimum against ⌊P·size⌋ and size − K. So green 11–20
  can reach a wall today. That is tracked under §7.4/§8, not raised again here.
- Tied students share a rank and a colour. §3.3 rule 4 shrinks the cut at a tie, so a tie
  never straddles the cut.

**Q3. Rank change and percentile: CONFIRMED uncoloured, and the ruling goes further.**
- **Rank change:** shown on own views only (STUDENT, and PARENT for a linked child). **DENY on
  DISPLAY, in both directions.** "Up 4" on a wall tells the hallway that someone else went
  down, and it publishes the very transitions hard rule 6 forbids. On own views, up and down
  are **styled identically**: the same `--foreground`/`--muted-foreground` colour and the same
  size, told apart only by the glyph and the words ("Up 3", "Down 3"). Green-up with
  neutral-down would let a distant viewer read the direction, which brings the problem back.
  Neither direction may use crimson, red, a destructive, warning or success token, or any
  rank-tier hue. A downward change is never animated. It is still shown, not hidden:
  criticize privately means the student is told.
- **Percentile:** own view only, uncoloured. It is never an input to `rankTier`, and it never
  appears on DISPLAY (§4) or in a share. The legacy `percentileToRating` colours
  (`types/domain.ts:127`) are cohort-relative and shade into red and purple at the bottom.
  They must not be used for any rank, percentile or letter (see also §10.7 L6).
- R6's list is endorsed: no rank colour on points totals, letter grades or negative events.

### 10.11 The student's own `linkCode` — DENY in the payload

```
SURFACE:  getOwnStudentData (api/student.ts:13; field at :44)
          getStudentDataWithContext (api/student.ts:71; field at :122)
          -> Student (types/domain.ts:41; linkCode?: string at :44)
AUDIENCE: STUDENT (own)   SESSION IDENTITY: student via student.linkedUser
CALLERS:  app/student/page.tsx:25 (server); components/home/StudentChip.tsx:16 ("use client");
          app/supaApi/server/dashboard/dashboardApi.ts:362; api/student.ts (internal)
```

**Ruling: DENY.** Hard rule 4 covers the student's own code, for four reasons:
- **It is a key to the student's data, not the student's data.** `linkStudentToParent`
  (`app/supaApi/server/parent/parentApi.ts:30-66`) gives full PARENT access, meaning the whole
  record, to any account that presents the school number and the code. There is no limit on
  the number of parents, no expiry and no notice. Once the student account is claimed, the
  only thing the code still does is make more parents.
- **It crosses the wire and nothing uses it.** `api/student.ts` is a `"use server"` module, so
  `getStudentDataWithContext` is a POST endpoint the browser can call. `StudentChip` calls it
  from the client on the home screen, which puts the code in a browser response body on every
  visit. Nothing in `app/student/**` renders it. Hard rules 1 and 3 apply.
- **A child's phone gets read over their shoulder.** A classmate who copies seven characters
  and the school number becomes a "parent", with every score, trend and rank. Nothing else in
  this system gives a peer that much.
- **The exposure is permanent.** The code is 28 bits and is never rotated (§10.4, D12).

*Required change (senior-developer):* drop `linkCode` from both constructors. Replace
`select("*")` with an explicit column list that leaves out `link_code`. Remove `linkCode?` from
`Student` (`types/domain.ts:44`) so the field cannot come back unnoticed. The other `linkCode?`
(`types/domain.ts:251`) may be filled only for the staff surface that issues codes (hard rule 4).

**How a student's code reaches a parent:**
1. **Staff issue it. This is the only route until route 2 is built.** The admin, or a teacher
   the admin delegates, gives the family the school number and the code, on paper or in a
   message from staff. The code is typed in and never placed in a URL (§10.4). The staff
   issuing screen is the only payload that carries the raw code. The cost: a family cannot
   link without the school. That is the price of the code unlocking the whole record.
2. **"Invite a parent", started by the student: ALLOW-IF every condition holds.** It is a
   *separate* credential, never `link_code`:
   - it is minted by an explicit action on the student's own account screen (not the home
     page), is returned only in that action's response, and is never put in a page payload,
     RSC stream, cache or `localStorage`. It is shown behind a tap-to-reveal;
   - it comes from a CSPRNG, is at least 40 bits (for example, 10 Crockford base-32
     characters, which is 50 bits), and is stored hashed;
   - it is **single-use** and **expires after 72 hours**. Only one may be outstanding: minting
     a new one revokes the old. The student can revoke it at any time;
   - it can only create a parent link. It cannot claim the student account or link a teacher;
   - redeeming it is subject to the §10.4 rate limit and uniform failure;
   - every parent link, from either route, is listed for the admin and can be revoked
     (§10.4). **The student's own screen shows "A parent account was linked on <date>"**, with
     the date only and no email or name. A classmate who copies an invite is then caught by
     the child they took it from.
   Once invites exist, `link_code` becomes claim-only: it links the student's own account and
   does nothing else. Route 1 then mints invites as well, instead of handing out `link_code`.

**Also found, verified against the code:** `linkStudentToParent` fails §10.4 condition 3. It
returns three different messages: "No student data found", "Error getting student data", and
"Error linking student to account", the last when the insert fails, for example when the pair
already exists. It has no rate limit either. *Required change (`backend`):* give it the single
uniform no-match message that `linkStudent` already uses (`app/supaApi/server/linkStudent.ts:7`),
and the shared rate-limit bucket.

### 10.12 Phoenix Student Mobile RPCs (BACKEND_PLAN §1.4, decision S-2) — D14

```
SURFACE:  the 14 functions granted to `authenticated` by 20261014150000_lock_down_function_execute.sql
          (bodies: docs/schema/baseline-2026-10-14/functions.sql)
AUDIENCE: STUDENT for the caller's own row. DISPLAY-equivalent (§9) for every other student's row.
          GROUP LEADER for get_led_group_member_points.
SESSION IDENTITY: auth.uid() -> "user".student_id -> student (auth_current_student(), :54).
          No function takes an actor or a school from the caller. That part is correct and must stay.
```

Only the SQL contract is ruled here. The mobile app lives in another repo. Its screens are
not ruled, but whatever these functions return is ruled, because that is what crosses the
wire. A peer row that reaches a child's phone is ruled the same as a peer row on a wall (§9):
above the cut only, no denominator, no trend.

**General rules for every function below** (backend amends the functions, and keeps their
return signatures so the app keeps running; denied columns become NULL):
- **G1. School scoping.** Any `p_timeframe_id`, `p_point_group_id`, `p_ranking_group_id` or
  `p_grade` must resolve inside the caller's school. Otherwise the function returns 0 rows.
  `timeframe_bounds()` (:1530) takes any id, from any school, and has to be replaced or wrapped.
- **G2. The cut.** Every peer list uses `publication_cut(size)` from
  `20261014150300_publication_cut_functions.sql`. Size means students in that cohort with a total
  above 0 (D19). Ties shrink the list and never extend it (§3.3 rule 4). Each cohort gets its own
  cut. `visibility_config()` (:1574) must no longer act as a limit on rows. Where its columns are
  still returned, `leaderboard_top_*` is read from `publication_cut_policy().n_absolute` (a
  ceiling, not a count) and `rank_lookahead` is 0.
- **G3. Own row.** The caller's own row may appear in any list where `is_current_student`
  is true, at their real rank, with their own `points_change` and `rank_change` (§4 STUDENT;
  D10 says up and down are styled the same). The own row never carries a denominator inside a peer list.
- **G4. Peer identifiers.** A peer's `student_id` is NULL. `is_current_student` is enough for
  the app to find its own row.
- **G5. Zero-point students** are never in a peer list (D19).

| function | field | ruling |
|---|---|---|
| `get_active_timeframe`, `get_all_timeframes` | all columns | ALLOW. Own school's timeframes. |
| `get_available_leaderboard_scopes` | `school`, `grade`, `point_group` scopes | ALLOW-IF that cohort's `publication_cut` is above 0 for the timeframe. A scope with nothing to publish is not listed (§7.5 small cohorts). `point_group` already requires `ranked` (keep). |
| | `student_group`, `ranking_group` scopes | ALLOW-IF the matching leaderboard below would return figures. Otherwise the scope is not listed. |
| `get_category_breakdown` | own per-point-group totals | ALLOW-IF G1 applies. Own data. |
| `get_dashboard_totals` | `student_id`, names, `school_name`, `total_points` | ALLOW. Own data. |
| | `school_rank`, `total_students` | ALLOW (own rank and own denominator, D5), computed over the D19 cohort. Today both count every student, zeros included (:168-169). A zero-point caller gets NULL for both. |
| `get_school_leaderboard` | peer `rank`, `first_name`, `last_name`, `total_points` | ALLOW-IF above the overall cut (G2). Today it is top 10, with no cut, and zero-point students are included (:795-836). |
| | peer `student_id` | DENY (G4) |
| | peer `points_change` | DENY. It is a trend, and a flat or falling week is a decline on a peer-visible list (§4 DISPLAY). |
| | peer `rank_change` | DENY (D10) |
| | the 2 named neighbours above the caller (`rank_lookahead`) | DENY (D2, §9.3). Rows removed. The gap comes only from `points_to_next_rank` (a number, no name). |
| | own row | ALLOW (G3) |
| `get_grade_leaderboard` | same as `get_school_leaderboard`, per grade cohort | Same rulings. Any grade of the caller's school may be requested, each with its own cut. Today a grade of 9 returns all 9 children, last place included (:610). |
| `get_point_group_leaderboard` | same as `get_school_leaderboard`, per point-group cohort | Same rulings, plus ALLOW-IF the point group is in the caller's school and `ranked` (D18). Today neither is checked (:913). |
| `get_my_visibility_snapshot` | `student_id`, `grade`, `led_group_ids` | ALLOW. Own data. |
| | `overall_rank`, `grade_rank`, `category_ranks` | ALLOW. Own ranks, computed over the D19 cohort. NULL when the caller has no points in that cohort. |
| | `leaderboard_top_*`, `rank_lookahead`, `change_window_days` | ALLOW-IF G2 holds (`rank_lookahead` = 0, the top values come from the policy). A heading that states a number ("Top 10") over fewer rows hints at cohort size. Mobile maintainers should not render one. |
| `get_point_history` | own events, `point_value`, `event_date`, names, colour | ALLOW-IF G1 applies. Own data. |
| | `event_rank`, `event_participant_count` | ALLOW (own per-event standing, §10.5). See the §10.12 gap on very small events. Ties already share the better rank (`RANK()`), as required. |
| `get_my_groups` | group id/name, `is_leader`, ranking group id/name, `points_per_student` | ALLOW. Own groups. |
| | `member_count` | ALLOW. The caller is a member and can see the membership. |
| `get_student_group_leaderboard` | `group_id`, `group_name`, `member_count`, `is_leader`, `is_member` | ALLOW. Own group. |
| | `avg_points` | ALLOW-IF `member_count` ≥ `MIN_COHORT_FOR_AGGREGATE` (10), else NULL (hard rule 5). Without the floor, own total + average + count gives the sum of the others, which is exact in a group of 2. |
| `get_ranking_group_leaderboard` | access | **ALLOW-IF the ranking group is in the caller's school and the caller belongs to one of its groups.** Today neither is checked (:1064). Any student can pass any `ranking_group` id from any school with that group's timeframe id and read the group names and averages. |
| | `rank`, `group_id`, `group_name`, `group_points`, `total_score`, `avg_student_points`, `is_current_student_group` | ALLOW-IF every group in the ranking group has ≥ 10 members. A group below the floor gets its name only, NULL figures and NULL rank, and is left out when the others are ranked. Group-versus-group standing describes a group, not a child, so it may be shown, but only where no group is small enough to stand in for one child. |
| | `top_student_points` | DENY. Every member knows who leads their group. This is that child's exact total, set next to the other groups. |
| `get_led_group_member_points` | `first_name`, `last_name` | ALLOW. GROUP LEADER, own led groups only (already checked at :250-255). |
| | `student_id`, `total_points`, `category_breakdown` | **DENY (D13 L2, §4 GROUP LEADER).** Live today: a leader reads every group mate's total and per-category points, sorted highest first (:309). That is the league table §4 forbids. |
| | ordering | Last name, then first name (L6). Never by points. |

**Sequencing for `get_led_group_member_points`.** The leak is live, so it ships with file 1 (S-1),
not after it. Backend rewrites it to return names only: `student_id`, `total_points` and
`category_breakdown` are NULL, and the order is alphabetical. If the mobile app cannot cope with
NULL, the function is revoked instead. Keeping a screen working is not a disclosure ground. Once
the app has a letters screen, the function is revoked for good. The letters reach mobile only
through an `authenticated` wrapper. That wrapper takes **no actor parameter**, resolves the leader
from `auth.uid()` as the student's own account only (never a parent, L11), and returns exactly
the `get_leader_group_letters` shape. The service-role functions take `p_actor_user_id`, and they
must never be granted to `authenticated`, because then the caller would choose the actor (hard
rule 2).

**The other amendments** may be one migration, applied in the same window as file 1 or straight
after it. Until then they are open violations, ranked by severity: (1)
`get_led_group_member_points`; (2) the uncut `get_grade_leaderboard`, which exposes complete small
grades; (3) the neighbours, `rank_change` and peer `points_change` in the school and point-group
leaderboards; (4) the cross-school `get_ranking_group_leaderboard` and `top_student_points`;
(5) unfloored averages; (6) G1 on the own-data functions, low.

**Policy gap (proposed ruling, in force).** Per-event standing in a tiny event: "1st of 2"
tells the caller that the other participant came last, and in a small scorebook group the
caller knows who that is. Proposed: `event_rank` and `event_participant_count` are returned only
when the event has at least `K_HIDDEN + 1` (4) participants, and are otherwise NULL. This applies
equally to the web `pointEventRankings[].outOf` (§10.5).

**Also noted (backend, not disclosure):** these functions use the `"user".student_id` link
model, and the web uses `student."linkedUser"` (BACKEND_PLAN §9). The disclosure requirement is
that `auth_current_student()` resolves only a student's **own** account. If a parent account ever
carries `student_id`, every function above would treat the parent as the child. That means a
parent who is not linked could pass for the child, and the L11 exclusion would fail.

### 10.13 Leader letters: zero points and the day boundary (decisions LL-1, LL-2) — D15, D16

**LL-1. A member with zero points in a point group gets E. RULED.** That covers no
`student_point` rows, a zero total, and a negative total.
- A per-member blank is DENY. In a column where every other row has a letter, a blank marks
  exactly that member (hard rule 6). It also says more than E does: E means "the bottom fifth of
  the school", and a blank means "nothing at all".
- The zero-point E counts toward L8(b) like any other E. A lone zero-pointer, or two, hides the
  whole column. That is the intended result: they cannot be singled out.
- **New condition L8(c): participation.** The column is shown only if **more than half** of
  the listed members (excluding the leader) took part in that point group during the timeframe.
  Taking part means having at least one `student_point` row, of any value, on an event of that
  point group. This handles the "category only some groups do" case. A group that never had the
  category would otherwise show a column of all E's. That breaches no one's privacy, but it is
  a false, unflattering label on every child in the group. A column hidden by L8(c) shows the
  same "Not shown for this group" line as every other hidden column. Participation is captured
  in the snapshot, so it follows L9.
- Letters exist only for `ranked` point groups (D18).
- *Required change (`backend`, `20261014150600_leader_letters.sql`):* keep the
  `coalesce(..., 'E')` at :138. Add a per-(student, point group) participation flag to the
  snapshot, and add L8(c) to `shown` (:209-217). Restrict the snapshot's column list (:106-110) to
  `pg.ranked`. Update the header comment at :10-11. The decision is no longer pending.

**LL-2. UTC day boundary. ALLOWED for now, with two conditions.**
- **Whole days only.** The snapshot taken on date D includes only events with
  `point_event.date < D 00:00 UTC`. Today, `refresh_leader_letters` takes everything up to
  `_ends` at the moment of the first call after midnight (:110, :121). So what a snapshot holds
  depends on when someone first opened the app. That would let a leader who opens the app at
  00:01 and again after the next snapshot bracket a narrower window. With the bound, each
  snapshot holds complete days, whoever triggers it. Late score edits on older events still
  come through on the next day's snapshot, which is fine under L9.
- **School timezone before certain schools.** If 00:00 UTC falls between 07:00 and 15:00 school
  local time, the boundary cuts the school day in two, and the "one batch per day" protection
  L9 depends on gets weaker. That covers Hawaii, the Pacific islands, and most of Asia and
  Oceania. Those schools need a `school.timezone` column, with the boundary at local midnight,
  before letters go live there. For US mainland schools, 00:00 UTC is 16:00–20:00 local, which
  is after the school day, so UTC is acceptable.

### 10.14 Who may pair a display device (decision D-1) — D17

```
SURFACE: display_pairing_approve, display_device_create, display_device_resolve,
         display_device_revoke, display_devices_for_school
         (supabase/migrations/20261014150200_display_devices.sql)
AUDIENCE: STAFF of the school (pairing); DISPLAY (the device)
SESSION IDENTITY: actor "user".id from the staff session, re-checked by is_staff_of_school (:144, :218)
```

**Ruling: any staff member of the school may pair a display. ALLOW-IF the conditions below
hold.** A device can do one thing: render DISPLAY for one school. Every staff member can already
open DISPLAY in their own browser (§4). So letting teachers pair hands them no tier they do not
already hold. Limiting pairing to admins would not take anything off a screen. It would push the
teacher who wants a classroom display back to the fallback R5 forbids: their own staff login,
running unattended on the kiosk. The stricter-sounding option turns out to be the less private one.

Conditions:
1. **A device lasts only as long as its pairer's authority.** `display_device_resolve` returns
   0 rows once the pairer is no longer staff of that school, or once `paired_by_user_id` has
   become NULL through `on delete set null` (:33). An admin of the school can re-confirm such a
   device, which makes that admin its pairer. Today `resolve` (:231-259) checks only
   `revoked_at`, so a 400-day token outlives the teacher who created it.
2. **Admins see every device and can revoke any of them.** The pairer can revoke their own.
   (This is built: :275, :296.)
3. **Converting the kiosk's own browser signs the staff session out in the same response.**
   This is the plan as written (BACKEND_PLAN §4). If it ever fails partway, the device must not
   be created.
4. **The approval comes from a staff session, never a display session.** `getDashboardViewer()`
   must not give a `DisplayContext` to any pairing action.
5. The approval screen shows the school name, so a staff member at two schools cannot pair a
   device to the wrong one by mistake.
6. A student could talk a teacher into approving a code shown on the student's own device. The
   student would end up with a DISPLAY credential at home. That gets them nothing beyond what
   a hallway wall already shows, so condition 1 and admin revocation are enough. No extra
   control is required.

`display_devices_for_school` returns staff names and device metadata, and no student data.
ALLOW as built.

**§7.5 amended:** the trade-off sentence "it takes an admin issuing a display token" now
reads "it takes any staff member approving a pairing code on their own device".

### 10.15 Cut cohort definitions (decisions P-1, P-2) — D18, D19

**P-1. Point-group cohorts exist only for `point_group.ranked = true`. CONFIRMED.** An unranked
point group is one the school chose not to rank. Any figure derived from a rank, including a
cut, a letter or a points-to-next gap, would rank it anyway. This now holds on every surface:
- `display_cut` (:110) and `points_to_next_rank` (:223): built correctly.
- `get_point_group_leaderboard` (mobile, `functions.sql:913`): violation. It has no `ranked`
  check and no school check (§10.12).
- `refresh_leader_letters` (`20261014150600_leader_letters.sql:106-110`): violation. It builds
  letter columns for every point group that has an event.
- A student's own total in an unranked point group (`get_category_breakdown`) is own data,
  not a rank. ALLOW.

**P-2. Cohort size counts only students whose total is above 0. CONFIRMED.** This gives the
smaller size, and so the smaller cut, which is the stricter reading. Students with no points are
hidden anyway, so leaving them out of `size` keeps `size − K_HIDDEN` from counting them as part
of the crowd. Consequences, all ruled:
- **The cohort is the same everywhere.** Cut size, every displayed rank, every own rank, every
  own denominator ("of N", §10.5), the 10-member floor for points-to-next, and the leader-letter
  cohort (L4) all use students with a total above 0 for that cohort and timeframe. A rank from
  one cohort shown next to an N from a different one is a defect.
- **A student with no points has no rank.** On their own view they see "Not ranked yet. Earn
  points to join", never last place or a tied-last place. Their parent sees the same. This
  is a neutral statement of fact, and it is never styled as low (§10.5).
- Students with negative totals are outside the cohort as well. They are never published, and
  on their own view they get the same "not ranked yet" wording.
- `MIN_COHORT_FOR_AGGREGATE` floors on **group averages** (§10.12) count the children the
  average is taken over, which is every member, zeros included. A floor and the figure it guards
  must count the same children.
