# Orchestrator backlog

Things the main session wants to tell or ask the product owner, surfaced one at a time. Most urgent first.

## Decisions needed
- **QA test accounts on hosted previews (owner wants this, 2026-10-15):** proposed separate Supabase staging project seeded from `supabase/seed.sql` (fictional school + 11 accounts), Vercel Preview env pointed at it. Awaiting go-ahead (new project; may cost).
- **Production web is stale:** the last prod build of master (8b390a9) failed on Node 20; live site is an older deployment.
- **Preview:** `preview/v2.0.0` pushed 2026-10-15 (commit 022dafb, tag not pushed). Owner adding Preview `LINK_RATE_LIMIT_SECRET`, then redeploy preview; then role click-through.
- **Dependabot:** GitHub reports 44 vulnerabilities on the default branch (2 critical, 23 high) — triage dependency upgrades.
- DONE 2026-10-14: `20261014230655` (revoke API-role table writes) applied by owner; verified 0 anon/authenticated write grants, 0 anon-executable functions; 230700 still held.
- **Drop legacy `point_conversion_rule*` tables + template columns** (BACKEND_PLAN §9) — destructive; code no longer uses them after P-3/D20. Needs owner approval + a backup first.
- ~~P-3~~ ANSWERED 2026-10-14: stored totals everywhere; legacy conversion rule removed; only per-event direct formulas (rarely used). Backend doing D20.
- DONE 2026-10-14: `LINK_RATE_LIMIT_SECRET` set by owner in Vercel and `.env.local` (local verified 64 chars, gitignored).
- **L-2** rate-limit numbers (5 fails/user/hr, 20/IP) — approve or change.
- Not wired yet: D20 dashboards → `display_cut` (blocked on P-3), `/display` routes + pairing screen (needs UX), #25 admin parent-link UI, `previewLinkCode` confirm step. Follow-ups: G-b floor in SQL `points_to_next_rank`; `api/student.ts` loads every school student_point; `updateTeacher` takes arbitrary column name.
- **QA early check FAIL (2 blocking):** (a) 230700 — now moved to `supabase/held/`; generators being fixed by backend. (b) `package.json` version baseline — ACCEPTED by owner 2026-10-14 (noted in RELEASING.md). Report: scratchpad/qa-report-1.md.
- **Smoke test needed:** `utils/supabase/server.ts` now uses the anon key, so server actions enforce RLS; needs a per-role click-through (admin/teacher/student/parent) on a real session.
- **Baseline migration `20260912000000` has guarded `drop table ... cascade`** (no-op on prod, already recorded) — owner sign-off per QA destructive-DDL rule.
1. DONE 2026-10-14: `20261014223115` (lock-down) and `20261014223157` (leader points) applied to live via MCP; verified anon 0/46, authenticated 14/46. Repo files renamed to match recorded versions; remaining files moved to `20261014230xxx`.
1a. Owner approved applying 230100–230650 (incl. mobile 230650, accepting mobile error screens). Pending: method (MCP transcription of ~100KB vs owner pastes into SQL editor / CLI `db push`).
- Web follow-up (senior-dev): 4-participant rule on event "of N" (`RecentEventsWithRankings.tsx:124`, `page.tsx:204`) — after ux branch merges.
2. **Record baseline migration on prod without running it** (`supabase migration repair --status applied 20260912000000`) — needs the Supabase CLI; owner would run it, or skip.
3. **Apply 150100–150600** (helpers, display devices, cut functions, share withdrawal, link codes + rate limits, leader letters), then regenerate types.
4. **Link-code regeneration `150700`** — breaks every code already handed out; needs a reissue date/plan. First switch the two TS generators (`api/admin/teachers.ts:155`, `adminTeachersApi.ts:19`).
5. **`LINK_RATE_LIMIT_SECRET`** — new server env var needed (Vercel) before 150500's TS wrapper ships; rate limits proposed at 5 fails/user/hr, 20/IP.
6. **Dashboard totals will change** once wired to SQL: backend sums stored points; current dashboard re-applies the old conversion rule on top (the suspected double-conversion bug). Backend recommends stored points are truth.
7. **Two account-link models** coexist: web uses `student.linkedUser`, mobile uses `user.student_id` (same split for teachers). New functions follow web. Needs a convergence decision eventually.
8. **21–29 cohort gate** (D8): rank colours suppressed in cohorts of 21–29 — owner may want to review (§10.9). Optional: leader-letter teacher switch / member opt-out.
9. **Push `v1.0.0` tag / cut 2.0.0** — nothing pushed; release after qa.

## Waiting on agents
- designer: Phases 0–1 + rank-colour tokens.
- privacy-boundary: mobile-app RPC disclosure (§1.4 of BACKEND_PLAN), zero-points letter, who pairs displays, backend's cut choices.
- After: senior-developer for `lib/rankTier.ts` + call-site migration + TS wrappers for new RPCs (after types regen from applied DB); ux-optimizer markup; designer Phases 2–4; qa.

## UX follow-ups (from priority 1–2 build)
- Wax-seal stamp on points award needs the seal moved out of a server component (designer wired count-up + shimmer only).
- Human eyes: award animation light/dark, Victorian screens at 320/390/1024, 40px seal, Fraunces numerals.
- `linkStudentToParent` returns no student id → parent lands on `/parent`, not the child page; one-child auto-redirect not built.
- `/login?next=` return path from dashboard layout not wired; login sign-in/create-account mode split not built.
- `getDashboardSchools()` has no `fellBack` flag (page derives it).
- School-number field on link screen stays until unique codes (150700) apply.

## FYI (no action)
- Rank-colour rollout done; metallic gradients on mobile/featured rows replaced by flat tier fills.
- Backend fixed in code (not deployed): `utils/supabase/server.ts` used the **service-role key for the cookie client**, so every no-session request had full DB access. Now anon key. `supabaseServiceClient.ts` was a callable `"use server"` export; now a plain guarded module.
- A sibling **Phoenix Student Mobile** app calls 14 student RPCs as `authenticated`; grants preserved.
- Concept art in `docs/design/concepts/`; brand primary moved burgundy → ink sapphire.
- Leftovers: `api/v2`/`api/core` nearby lists (unused); `loadSchoolTimeframes` hardcoded timeframe 7; index gaps + legacy tables proposed in BACKEND_PLAN §8–9.

## 2026-11-09 resume
- Merged `agent/sd-authz-holes` (cross-school authz fixes + QA-school seed/teardown) to local master after QA PASS-WITH-NOTES (tsc, 66 unit, 157 pgTAP, 490 RLS, 144 e2e, build). Not pushed.
- **Release level:** the QA-scripts "Added" entry makes this **2.1.0**, not 2.0.1 (QA recommends 2.1.0). Needs owner OK to cut + push.
- **Before release:** check production for student TAs linked only via mobile `user.student_id` (no `student.linkedUser`); they now lose TA access.
- Nit (backlog for backend): `scripts/qa-school/seed.mjs` resets a QA user's password before `assertUserConfinedToSchool`; swap order.
- Backend-owned: no DB constraint stops pair tables mixing two schools (actions refuse it now).
- **Worktree cleanup blocked:** removing 15 clean, merged agent worktrees + merged branches was denied by the auto-mode classifier; needs owner to allow or run `git worktree remove` themselves.
