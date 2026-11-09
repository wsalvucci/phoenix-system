# Next steps after v2.0.0 (2026-10-15)

Consolidated from the seven agents' top-5 reviews of tag `v2.0.0` (backend, privacy-boundary, designer,
ux-optimizer, senior-developer, qa, lead-developer). Duplicates merged; the number of agents that raised an
item is in brackets.

## Before pushing / deploying v2.0.0
1. **Preview-deploy and click through each role** (admin, teacher, student, parent, paired display) on a Vercel
   preview; run `npm run test:all` and `E2E_SERVER=start npm run test:e2e` at the tag. Server code now runs on the
   anon key and has never seen a real hosted session. [senior-dev, lead, qa, designer]
2. **Visual check / screenshot baselines** for Honor Board (1080p, portrait, 720p, light, reduced motion) and the
   Victorian student screens (320/390/1024, light/dark). Nobody has looked at either restyle. [designer]
3. **Fix the skipped kiosk e2e** (`tests/e2e/display.spec.ts:177`): secure display cookie isn't stored over http,
   so revoke/tamper checks are silently skipped. [qa]

## Mobile app (already broken in production until it ships)
4. **Versioned contract for the 13 student RPCs** (nullable fields, `LeaderboardScreen.kt` key, no
   `get_led_group_member_points`) to the mobile team, plus contract tests and
   `08_mobile_rpc_disclosure.test.sql`. Note: 13 is correct now (leader-points was revoked). [backend, lead, qa]
5. **Parent-as-child bug:** `auth_current_student()` treats a parent account carrying `user.student_id` as the
   child; pick one account-link model (ADR + backfill) and fix G-a whole-UTC-day averages. [privacy, lead]

## Security / disclosure
6. **`updateTeacher` writes any column** with the service client — replace with a typed `TeacherPatch` allow-list
   and a separate unlink action. [backend, senior-dev, lead]
7. **Student pages load every school `student_point` row** (`api/student.ts` ~206/839/934) — move to per-student
   SQL. [backend, privacy, senior-dev]
8. **Delete `getOwnTeacherData` (+ client)** — `"use server"`, `select *`, returns teacher `link_code`; remove
   payload logs at `teacherServerActions.ts:269/:586`. [privacy]
9. **Scope teacher reach** (§7.4 #19): `getAllTimeframePointEvents`, `getSchoolStudents`, `getRankingGroupPoints`
   give any teacher whole-school per-event scores. [privacy]
10. **Private Realtime channel** for `student-points-channel` (anyone with the anon key can force walls to
    reload). [backend, lead]
11. **Link-code regeneration (held 230700):** owner sets a reissue date; then test it, wire `previewLinkCode`
    confirm, drop the School-number field. [backend, privacy, senior-dev, ux, qa]

## Product polish
12. Admin setup checklist + rename "Point Groups"→"Point categories", "Ranking Groups"→"Competitions". [ux]
13. Replace `alert()/confirm()` in admin students and scorebook TA flows with inline errors/dialogs. [ux]
14. Trim the teacher home (internal IDs, controls for <8 groups, empty state). [ux]
15. Parent one-child path straight to the child page. [ux]
16. Rank colors on the admin student page; tokenize ~400 raw Tailwind/recharts colors; readable admin group
    color presets; wire the wax-seal stamp into `AwardBalance`. [designer]

## Housekeeping
17. Index gaps migration (`user.supabase_id` unique, link and school_id indexes). [backend]
18. Remove hardcoded `id = 7` query in `loadSchoolTimeframes`; delete unused `api/core` and `api/v2`. [senior-dev, lead]
19. CI: add lint, pin `supabase/setup-cli`; fix stale TESTING.md finding 2; fifth disclosure audit in §11. [qa, privacy]
