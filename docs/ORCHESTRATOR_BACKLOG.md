# Orchestrator backlog

Things the main session wants to tell or ask the product owner, surfaced one at a time. Most urgent first.

## Decisions needed
- **QA early check FAIL (2 blocking):** (a) 230700 — now moved to `supabase/held/`; generators being fixed by backend. (b) `package.json` `"version": "1.0.0"` set by hand as the release baseline — owner to accept explicitly. Report: scratchpad/qa-report-1.md.
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
