# UX restructure plan

Author: ux-optimizer. Date: 2026-10-14. Branch: `agent-remediation`. Status: PLAN ONLY, no app code changed.

> **Disclosure rulings (2026-10-14).** Every privacy-boundary question in this plan is ruled in
> `docs/DATA_DISCLOSURE.md` §10 (log entry §0 D1–D7). They are binding, and where they differ
> from the text below, the rulings win.
> - §6 compare: **retired, confirmed** (§10.1). `getSchoolGlobalStats` is deleted.
> - §7 neighbour lists: **removed on both student and parent pages** (§10.2). Own rank and
>   own "of N" stay. `pointsToNextRank` is the only replacement.
> - §4 sharing: sentence **approved with fixed wording**, and sharer name **allowed** (§10.3).
>   The raw score and sorting by points are denied, and shares are limited to the sharer's
>   own groups.
> - §1 "Is this Maya R.?": **allowed only once** codes are unguessable, attempts are rate
>   limited, and errors are uniform (§10.4). Until then, do not build it. `?school=` in URLs
>   is fine. Codes never go in URLs.
> - §7a "Groups you lead": **names only, no letter grades** (§10.7).
> - §5 teacher link code on the home page: **removed** (§10.7).
> - §2 Global tile: **cut DISPLAY, not a full roster**. Change the "Everything on one screen"
>   copy. The switcher and fall-back notice are allowed with conditions (§10.7).

Test used throughout: a person who has never seen Phoenix, has no training, and will not read instructions must succeed first try. Decisions below are made, not offered as options. Where a decision depends on another agent, the dependency is named and the default I will build if they are silent is stated.

Release levels follow `docs/RELEASING.md` (MAJOR = someone must change how they use it or a path is removed/narrowed; MINOR = additive; PATCH = no behaviour change). Note for implementers: `scripts/release.mjs` bumps MAJOR for any `Removed` heading, so reword non-removals under `Changed`.

Relevant `[Unreleased]` already contains a **BREAKING** entry (dashboard login). Items marked MAJOR below should ship in that same release so users absorb one disruption.

---

## 0. Cross-cutting findings (every role hits these)

| # | Finding | Where |
|---|---|---|
| X1 | Nobody can find the parent area. Home offers Student, Teacher, Admin chips only. `/parent` is reachable only by typing the URL. | `app/page.tsx`, `components/home/*` |
| X2 | Nobody can find the dashboards. `grep` finds zero links to `/dashboard` outside `app/dashboard` (one in unrelated tutorial boilerplate). Teachers and admins, the only people now allowed in, have no door. | `app/teacher/page.tsx`, `app/admin/**` |
| X3 | A signed-out visitor sees "Where would you like to go? Your available dashboards appear below." followed by nothing. The only sign-in affordance is a small nav button. Blank state, no next action. | `app/page.tsx` |
| X4 | A signed-in user with no roles sees only "Link student account". A teacher or parent who just signed up is told the wrong thing. | `components/home/StudentChip.tsx` |
| X5 | Native `alert()` / `confirm()` used for admin and scorebook feedback; not styleable, blocks on phones, names nothing. | `admin/.../students/page.tsx:119,150,185,191,199`; scorebook `page.tsx:776` |
| X6 | Chip/page errors are swallowed in production (`return null`) so a failed load looks identical to "you have no access". | `AdminChip.tsx`, `TeacherChip.tsx` |
| X7 | `console.log` of dashboard data in teacher home, admin layout. (Privacy item, listed so it is not forgotten: `app/teacher/page.tsx:36`, `admin/school/[schoolId]/layout.tsx:33`.) | senior-developer |

---

## 1. Onboarding and account linking (P0)

### Current walk, as a first-time parent
1. Open the app, see a marketing headline and an empty "Where would you like to go?" panel (X3).
2. Tap the small "Sign in" in the nav. Login page: **7 interactive elements** (Back, email, password, Sign In, Sign Up, Forgot password, plus the message area), **two competing primary actions** on one form. Email field has no `type="email"`, no autocomplete hints. "Could not authenticate user" for every failure.
3. Sign up, "Check email to continue sign in process". Come back, sign in, land on `/` with a panel that offers "Link student account" (wrong, they are a parent).
4. No path to `/parent`. If they guess it: header with a button "Add student" top-right, body says "No students are linked yet." with no button (dashed empty box, `app/parent/page.tsx:104`). The link form is hidden behind the header button.
5. The form asks for **School ID** (an integer the parent has never heard of) and "Student link code".

Counts: login = 2 decisions (sign in vs sign up) on one screen; parent first screen = 1 hidden decision and 0 visible actions; link form = 2 fields, both opaque.

Student path: `app/linkAccount/student/page.tsx` is two unstyled inputs (`type="number"` School ID, then code), no `<form>` (Enter does nothing), no loading or double-submit guard, empty school stays `-1`/`NaN` and fails server-side with whatever message returns. `app/linkAccount/layout.tsx` title is an unstyled centered div. `app/linkAccount/teacher/page.tsx` has the same defects plus dead imports. `/linkAccount` itself has no index.

### Target structure

**Screen A: Home (signed out).** One question: "Have you used Phoenix before?" Primary button "Sign in", secondary quiet "Create an account". Hide the destinations panel entirely when signed out. Headline copy stays; designer owns look.

**Screen B: Sign in / Create account (`/login`).** Split by mode, same route, `?mode=signup`. Sign in: email, password, one primary "Sign in", quiet links "Create an account" and "Forgot password". Create account: email, password, primary "Create my account". Fix `type="email"`, `autoComplete`, show/hide password. Error copy: "That email and password do not match. Try again or reset your password." Sign-up success gets its own full state: "Check your email, we sent a link to <email>. Open it on this device." with a "Use a different email" action. Preserve a `next` path so a redirect from `/dashboard/*` returns there after login (see section 5).

**Screen C: Home (signed in, no role yet) = "Who is using Phoenix?"** One question, three large tap targets (>=44px, stacked on phone):
- "I'm a student" -> `/linkAccount/student`
- "I'm a parent or guardian" -> `/linkAccount/parent`
- "I'm a teacher" -> `/linkAccount/teacher`
(Admins are provisioned by staff; no self-serve button. Existing admin chip still appears when applicable.)

**Screen C2: Home (signed in, has roles).** Role chips ordered by what they came for: the person's own role first. Add `ParentChip` (shows "Your children" with the count). Never show the "Link student account" prompt to someone who already has a teacher or parent role; show it as a quiet text link "Link a student account" below the chips. Chip load failure shows a one-line retry, not silence (X6). Loading chips: keep the existing skeleton blocks.

**Screen D: Link (`/linkAccount/{student|parent|teacher}`), one shared component.**
- Heading by outcome: "Connect your student account" / "Connect your child" / "Connect your teacher account".
- Field 1: "Code from your school" (monospace, auto-uppercase/trim, `autocapitalize=characters`, `inputMode=text`).
- Field 2: "School number" only when not prefilled from the URL (`?school=12`), then shown as a read-only line "School 12 (change)". Helper text in plain words: "Your school gave you this on a letter or email."
- It is a real `<form>`: Enter submits. Button label by outcome: "Connect account" / "Connect my child". Loading state "Connecting...". Disabled until both fields non-empty, with the reason shown, not silent.
- Errors map to one fix each: wrong code -> "That code did not match. Check for look-alike letters (O/0, I/1) or ask your school for a new one." Network -> "Could not reach Phoenix. Try again." with the button still enabled.
- Success: for parent, go to the child's page directly (`/parent/<id>`), not to a list. For student, `/student`. For teacher, `/teacher`.
- Parent already linked? From `/parent`, "Add another child" opens this same screen (no second form implementation).

**Student with no link (`/student`).** Replace "Student Data Not Found" (reads as a failure) with "Connect your student account" and one button to `/linkAccount/student`. Keep the second error state, but add a "Try again" button (currently a dead end).

### What this removes/defers and costs
- Removes the inline link form from `/parent` (replaced by the shared screen). Cost: one extra page transition for "add another child".
- The School number field stays until backend confirms whether `link_code` is unique across schools. If unique, the server can resolve the school from the code alone and the field disappears (one decision removed). I will build the prefilled-school-URL version now and not wait.

### Needs from others
- **backend / senior-developer (decision requested, not blocking):** is `link_code` unique across schools? If yes, add a lookup-by-code variant of `linkStudent` / `linkStudentToParent` / `linkTeacher`. If no, nothing changes.
- **senior-developer:** login `next` redirect must be validated as a same-origin relative path (open-redirect risk), in `app/login/page.tsx` server action.
- **privacy-boundary:** (1) I want a "Is this Maya R.?" confirm step before a parent/student link commits (catches mistyped codes linking the wrong child). This needs a server call that returns a child's name from a code BEFORE linking, i.e. a pre-link disclosure to someone who does not yet have a relationship. Request a ruling; until ruled I will not build it. (2) Confirm that a school number in a URL is not a credential (`?school=` carries no secret; the code is never put in a URL).
- **admin side (me, MINOR):** `admin/school/[schoolId]/students` gets a "Copy family sign-up link" button producing `/linkAccount/parent?school=<id>` and a student one. Link codes themselves stay typed, never URL-embedded.
- **designer:** home hub and link screens are student/parent-facing; styling comes from the Victorian remake plan.

### Priority and release
P0. Items: home split (A, C, C2) = **MINOR** (new parent entry, new screens). Shared link screen + copy fixes = **PATCH** each, but bundle as MINOR with the parent entry. Login mode split and error copy = PATCH. Family sign-up link in admin = MINOR.

---

## 2. Dashboard access and picking a school (P0)

### Current walk
- A teacher or admin has no link to `/dashboard` anywhere (X2).
- `/dashboard` (`app/dashboard/page.tsx`): two big tiles, "Global: A large, all encompassing dashboard" and "Featured: A more detailed, multi-page dashboard that transitions between screens". No school shown, tiles drop `?school`. `mobile` and `topCards` are not listed at all. Uses a hard-coded font and hover-only shadow.
- School switching exists only as a hidden URL parameter `?school=<id>` (`useDashboardSchool.ts`). A multi-school staff member cannot discover it. An invalid or unauthorized id silently falls back to the default school, so a user can believe they are viewing school B while looking at school A. Neither the hub nor the display says which school is shown.
- `/dashboard/feature` redirect (`feature/page.tsx`) drops the query string, so a bookmarked `?school=` is lost.
- `app/dashboard/layout.tsx`: not signed in -> `/login` (no return path). Signed in but not staff -> silent redirect to `/` with no explanation. A student or parent following a shared link just lands on home confused.
- Display error states exist on `featured` and `global` (reconnecting + retry). `topCards` shows raw `Error: {message}`. `isError` from `useDashboardSchool` is ignored: if the school lookup itself fails, the screen shows "Great things are happening." forever.
- Kiosk: a hallway TV whose session expires is bounced to a login form that needs a keyboard. Unresolved; owned by backend (device token).

### Target structure

**Entry points (the missing door).** Teacher home: a quiet "Open hallway display" link in the header area. Admin school Home: same, passing `?school=<this school>`. Both are one tap, not primary (the primary on those screens remains the group/school work).

**`/dashboard` hub, one question: "Which display do you want to open?"**
- Header line shows the school name ("Showing: Lincoln Middle") and, only when the caller is staff of more than one school, a school switcher (a select; changing it re-renders the hub tiles with the new `?school`). One school -> no switcher, nothing to decide.
- Tile 1 (primary): "Featured board" - "Rotating highlights for a hallway screen."
- Tile 2: "Full school board" (global route) - "Everything on one screen."
- Quiet row below: "Phone view" (mobile), "Top cards".
- All tiles carry `?school=`. Tiles are real links with >=44px targets and visible focus, not hover shadows.
- Decision on Global: keep it listed (now staff-only, the full-roster view is legitimate), unless privacy-boundary rules otherwise on the tier question in `DATA_DISCLOSURE.md` §7.5. I do not hide it on my own.

**Displays.** Show the school name in a small corner label on each display so a mis-selected school is visible at a glance. `isError` from school resolution gets its own state: "We could not find your school. Open the Dashboard menu and pick one." with a link to the hub.

**Redirects.**
- `/dashboard/feature` redirect preserves the query string.
- Layout: not signed in -> `/login?next=<requested path>`. Signed in non-staff -> `/?notice=staff-only`; home shows a dismissible banner: "That screen is for teachers and administrators."
- Invalid `?school=` -> the hub and displays show the fallback school name plus a one-line notice "You do not have access to school 7, showing Lincoln Middle instead." (needs the resolver to report that it fell back; see below).

### Needs from others
- **backend / senior-developer:** `getDashboardSchoolId` currently returns only an id. I need (a) the caller's school list with names (id, name) for the switcher, and (b) a flag when the requested id was rejected. That is a new return shape; I will not change it myself. Requested contract: `getDashboardSchools(): Promise<{ schools: {id:number; name:string}[]; selectedId:number; fellBack:boolean }>`. Default if not delivered: ship the hub with the school name unresolved (no switcher) and keep the silent fallback; document as known gap.
- **backend (open, owned by them):** display-device token for kiosks. UX requirement for that design: a display must be pairable in one step by a signed-in staff member (e.g. staff taps "Pair a display" on the hub, gets a short code; display opens `/display` and types or scans it), show the school and "Paired by <teacher>", and be revocable from the same screen. Hub gets a "Pair a new display" tile when this exists. No keyboard login on a TV.
- **privacy-boundary:** the `?school=` switch for a multi-school admin is within the ADMIN tier ("their own schools"). Teachers with more than one school: confirm TEACHER tier may do this (the changelog says "staff with several schools").
- **designer:** hub tiles and corner label styling.

### Priority and release
P0 for entry points and hub (a feature nobody can reach is a defect). Entry links + hub switcher = **MINOR**. Redirect query preservation, `next` return path, staff-only notice = **PATCH**. Kiosk pairing = **MINOR** (new capability), and likely **MAJOR** the day the existing "signed-in browser on the TV" workaround is withdrawn.

---

## 3. Bulk score entry (P1)

All in `app/teacher/group/[groupId]/page.tsx` (2602 lines, one component; `app/scorebook/group/[groupId]/page.tsx` is a one-line re-export of it).

### Current walk (teacher mid-class, 30 students waiting)
1. Scorebook header: **up to 7 controls** (back link, timeframe select, "Add New Point Event", "Open Unified Scorebook", "More actions" with 4 items), plus the table's own point-group filter, two toggles and a focus-student mode. Roughly **15+ interactive elements** before any score is typed.
2. "Open Unified Scorebook" links to `/scorebook/group/<id>`, which renders the same component. It does nothing different. Dead/confusing control.
3. To enter scores for one assignment: find the column, tap the small blue "Edit" (`text-xs px-2 py-1`, under the 44px target) in the column header -> big modal (`w-3/4`).
4. Edit modal asks **9 things**: name, date, max score, point group, conversion formula (these 5 are almost never what the teacher came to change), then "Bulk point preview" textarea, then per-student inputs. Scores are the reason they opened the modal and are below the fold.
5. Bulk text expects `last_name,first_name,point`. A teacher pasting from a spreadsheet gets tabs, not commas, and usually "First Last". Result: "Line 1: expected last_name,first_name,point" for every line.
6. "Apply to preview" fills the student list below but "Nothing has been saved". Then scroll down, find Save. Two-stage, and the Save button is disabled with no stated reason when any draft is empty.
7. Overwrite: bulk apply can replace existing scores; no statement of how many existing scores will change. No confirmation (principle 7).
8. Delete (`confirmDeletePointEventDialog`): "Are you sure you want to delete this point event?" Does not name the event or say how many students' scores are lost.
9. The whole scorebook returns "Use a larger screen" under 768px (`MIN_WIDTH`). A teacher with a phone cannot enter a single score.
10. Table dims every non-hovered cell to 0.7 opacity (`table-cell-dimmed`) and un-dims on hover only: legibility loss on all touch devices, and hover-only affordance (principle 9).
11. Modals are `w-1/2` / `w-3/4`, fixed overlays; unusable on a narrow screen even once the width gate is lifted.

### Target structure

Split "edit event details" from "enter scores". Different intent, different screen.

**Screen 1: Scorebook (group).** Header = back, group name, timeframe (defaults to the active timeframe, already true at line 456; keep), one primary button "Add an assignment" (renamed from "Add New Point Event"; vocabulary: users call these assignments/quizzes, "point event" is internal), "More" menu for the rest. Delete "Open Unified Scorebook". Move point-group filter, show-percent, and focus-student into one collapsed "View options" control, closed by default. Remove the permanent 0.7 dimming; highlight row/column on tap-focus instead of hover.

Event column header: the column name is itself the tap target (>=44px) opening Screen 2. Remove separate tiny Edit/Delete buttons from the header; Delete moves to inside Screen 2 under "More" (principle 2: destructive behind explicit affordance).

**Screen 2: Enter scores for "<event name>" (full-screen on phone, large modal on desktop).** One question: "What did each student get?"
- Top: event name and date as a static line with "Edit details" quiet link (opens Screen 3).
- Primary body: student list, name left, score input right (inputMode numeric, >=44px rows), "-> N points" converted value only shown when a conversion formula exists.
- Above the list, one quiet affordance "Paste from a spreadsheet" opening Screen 2b.
- Sticky footer: primary "Save scores for 28 students" (count live), secondary "Cancel". If a score is blank, Save stays enabled and says "3 students have no score yet. Save anyway?" inline (empty = no score, not an error) - requires backend confirmation of whether blank is representable; see below. Disabled-reason text must always be shown.
- Unsaved-change guard on Cancel/back: "Discard the 12 scores you entered?" (progress legible, back path that does not silently lose data).

**Screen 2b: Paste from a spreadsheet (a sheet over Screen 2, not a second modal stack).** One question: "Paste your list".
- Accept tab-separated and comma-separated; accept either `Last, First` or `First Last` ordering in the name column (detect per list by trying both; if ambiguous, ask once "Is the first name first?").
- Show an instant preview table under the textarea: matched rows green with "Jordan Smith -> 30 (60 points)", problem rows listed with the line and the one fix ("Not found: 'Garcia, Avry'. Did you mean Avery Garcia?" using exact-match first, then near-match suggestion).
- Primary: "Fill in 24 scores" (label by outcome). It writes into Screen 2's list; it does not save.
- Overwrite honesty: if it would replace existing non-empty scores, the primary button says "Fill in 24 scores (replaces 6 existing)" and the list marks those rows. This is the confirmation naming exactly what changes.
- The formula error "Fix the conversion formula first" should link to Screen 3 rather than leave the user in the paste screen.

**Screen 3: Assignment details.** Name (first, autofocus), date (default today), points available. Point group preselected: the only one, else last-used (persist in `localStorage` per group). "Convert scores with a formula" is a collapsed "Advanced" toggle, default off, and the field says "Example: score x 2" instead of exposing `x*2` syntax first. Max score default: blank with placeholder, not `0` (0 is a valid-looking wrong answer). Primary: "Create assignment" / "Save changes". Single question per step is satisfied because it is create-or-edit only; scores are not on this screen.

**Delete.** In Screen 3 under "More": "Delete assignment...". Confirmation text: `Delete "Quiz 4" and the scores of 28 students? This cannot be undone.` Button "Delete assignment", not "Delete". (Names the event, names the count.)

**Import from spreadsheet (More menu).** Currently a modal showing a format spec (4 bullet lines of CSV rules) then a file input. A beginner cannot satisfy "First row: Point Event IDs". Make it a 3-step flow with progress ("Step 2 of 3"): (1) "Download the spreadsheet" (the existing export, big button, one sentence), (2) "Upload your filled-in spreadsheet", (3) "Review changes" showing counts ("14 scores will change in 3 assignments; 0 students not found") with primary "Import 14 changes". Back path keeps the chosen file. Label in the menu: "Import scores from a spreadsheet".

**Mobile.** Lift the 768px gate. On <768px the Scorebook shows the event list (one card per assignment: name, date, "N of M scored") that opens Screen 2. The wide grid stays for tablet+. (This is the structure change that matters most for "teacher mid-class".)

**Empty / loading / error.**
- No events: "No assignments yet. Add your first one." with the primary button inline (today the table renders with nothing).
- No students: "No students are in this group yet. Ask your administrator to add them."
- Loading: skeleton table rows (use `components/LoadingLayout.tsx`), not the full-screen spinner modal overlay (`loadingScreen`, fixed inset-0) which also blocks the header.
- Save failure: inline banner at the top of the sheet: "Could not save. Your scores are still here. Try again." with retry.

### Needs from others
- **senior-developer:** the page is a 2602-line client component with ~35 `useState`. Splitting into Screen 1/2/2b/3 and the import wizard is a refactor; the data-access calls (`newGetScorebookData`, `editPointEvent`, `deletePointEvent`, `createPointEvent`, import actions) stay as is. I will do the restructure inside the existing file layout first (extract sibling components, same imports) and not touch server actions. If a split into route segments is wanted, that is a lead-developer call.
- **backend:** (a) Is a blank score representable (null) versus 0? `editPointEvent` seems to require every student's input (the page blocks Save on empty drafts). If blank is not representable I will keep requiring a value and default empty rows to 0 only after an explicit "Fill empty with 0" action - not silently. (b) Delete event: provide the count of affected student scores for the confirm text (can derive client-side from loaded data; no query change needed).
- **privacy-boundary:** no new student data surfaces (teacher already sees own group). Near-match name suggestion operates only on the already-loaded group roster. No ruling needed.
- **designer:** nothing visual blocks the structure; replace the hover-dim with a focus style.

### Priority and release
P1 (largest daily-use impact, highest effort). In implementation order:
1. Remove dead "Open Unified Scorebook" button; rename labels; remove permanent dimming; delete confirmation naming event and count. **PATCH** (word under `Changed`, not `Removed`, to avoid a spurious MAJOR; the route still works).
2. Tab/First-Last paste support + preview table + overwrite count. **MINOR** (new accepted input) or PATCH if judged a fix; choose MINOR.
3. Split details from scores (Screens 2/3). **PATCH** (same capability, reorganized), unless it is judged to change workflows enough to warrant MINOR; choose MINOR for the user-visible change.
4. Mobile event-card view, lift width gate. **MINOR**.
5. Import wizard with change counts. **MINOR**.

---

## 4. Point sharing (P1, student)

Files: `app/student/SharePointModal.tsx`, `app/student/RecentEventsWithRankings.tsx`, `app/student/SharedPointsTab.tsx`, `app/student/StudentTabs.tsx`.

### Current walk, as a student
1. On the dashboard, recent events each have a share control that is an emoji `🔗` with only an aria-label (`RecentEventsWithRankings.tsx:34,134`). It does not say "share" or what happens.
2. Tap -> modal "Share Points" / event name / checkbox list of groups. No sentence says who will see the point. A first-timer cannot tell whether this posts to the world.
3. Parent group checkbox silently checks all child groups (helper line "N subgroups included" is the only hint).
4. Unchecking a pre-checked group = unshare, but nothing says so. Save label is just "Save". Success closes the modal with no confirmation; the student must infer success from a small "Shared" badge.
5. Empty state: "You are not in any groups." dead end, no explanation of what a group is or who adds them.
6. Tab is named "Shared points", and its subtitle "Recent points that students chose to share." Ambiguous: points I shared, or shared with me? It is the latter.
7. Tab bar: 2 buttons, fine. On the share modal: 1 title, 1 close, N groups (+ children), 2 buttons.

### Target structure
- Control: a text button "Share" with icon, not an icon alone. Label by outcome in the modal.
- Modal title: `Share "Quiz 4" with your groups`. One sentence under it: "People in the groups you pick will see that you earned these points." (Wording needs privacy-boundary approval since it states who sees what.)
- Default: if the student is in exactly one group, show a single large toggle row "Share with <group>" - one decision, one tap, instant save with a confirmation toast "Shared with Band". No Save step for the single-group case.
- Multiple groups: checkbox list as today, but the primary button reads by outcome and count: "Share with 2 groups", "Stop sharing" when everything is unchecked on an already-shared point, "Update sharing" when mixed. Disabled with reason ("Pick at least one group") only when nothing changed.
- Parent/child group: label the parent row "Band (includes 3 smaller groups)" and let the student expand to deselect a child.
- Success: close and show toast; the event row's "Shared" badge shows the list of group names on tap.
- Empty (no groups): "You are not in any groups yet. Your teacher adds students to groups, so there is nothing to share with right now." with a close button.
- Tab rename: "Shared with me". Subtitle: "Points your classmates chose to show you." (Pending privacy-boundary on the sharer's name display, below.)
- Loading is already a skeleton in the tab; keep. Modal loading text "Loading groups..." becomes a 3-row skeleton.

### Needs from others
- **privacy-boundary:** (1) approve the plain-language disclosure sentence ("who will see"), (2) rule on the `SharedPointData.sharer` first/last name shown to recipients, and what a recipient learns (points, event name, date?) - the tab currently shows sharer names; flatter/praise-only framing is consistent with the policy ("praise publicly") but the field list needs a ruling because it is peer-to-peer.
- **senior-developer:** single-group instant toggle uses the existing `shareStudentPoint` / `unshareStudentPoint`; no contract change. `Promise.all` of separate share/unshare calls can partially succeed; the current error ("Some operations failed") leaves the UI in an inconsistent state. A batch action would fix it; that is a contract change, so I only request it, and show "Some changes did not save. Check your groups and try again." in the meantime.
- **designer:** the Victorian remake owns the modal and tab styling. Structure contract below in section 8.

### Priority and release
P1. Labels, toast, empty state, tab rename, button count labels: **PATCH**. Single-group instant toggle: **PATCH** (same capability, fewer steps). Disclosure sentence: PATCH after privacy ruling.

---

## 5. Scorebook setup (P1, admin and teacher)

"Scorebook setup" = what must exist before a teacher can score: timeframe, point groups, student group with students, teacher assigned, then events.

### Current walk, as a first-time admin
- Admin school Home (`admin/school/[schoolId]/page.tsx`, 368 lines): management tiles for Student Management, Group Management, Point Categories, Ranking Groups, Teacher Management, Timeframes, plus Recent Students and Student Groups. Six equal tiles; nothing says what order to do them in or what is already done.
- Sidebar nav: 7 items (Home, Student Groups, Students, Teachers, Point Groups, Ranking Groups, Timeframes). Labels are internal: "Point Groups", "Ranking Groups".
- Students page: header with two buttons (Bulk Import CSV, Add Student), required fields signalled with `*` in placeholders only (placeholders vanish while typing), native `alert('Please fill in all required fields')` without naming which, `confirm()` delete, CSV spec described as "PowerSchool" columns.
- Teacher first run: Teacher home shows groups; if none, "No groups found." with no instruction (who creates groups, what to do). It also shows "Teacher ID", "School ID", and the teacher's own link code in large type among the quick stats (the link code is a credential; shown to the teacher it belongs to, not changed here).
- Teacher home controls: 2 search boxes + 4 selects (sort by name/ID, ASC/DESC) for what is often <10 groups. Cards show "Group ID: 12" and "Ranking Group ID" - internal vocabulary.
- Duplicate events (end of year): modal with Advance by, Unit, Destination timeframe, search, point-group filter, event checklist. Good structure (defaults destination, shows count in button, "new events will have blank scores") but opened from the "More actions" menu where a first-timer will not look at year rollover.

### Target structure
**Admin school Home = setup checklist (when incomplete).** One question: "What should I do next?" A vertical list of 6 steps in dependency order, each with a done/not-done state and a count, the first incomplete step highlighted as the one primary button:
1. Set up the school year (Timeframes)
2. Add subjects or categories students earn points in (Point Groups)
3. Add students (Students)
4. Create classes or teams (Student Groups)
5. Add teachers (Teachers)
6. Optional: Combine classes into a competition (Ranking Groups)
When all are done, the checklist collapses to a one-line "Setup complete" and the existing tiles remain. Counts come from the data this page already loads (`getAdminSchoolDashboardData`); no new query. Labels: sidebar keeps stable nouns but each tile gains a one-line plain description ("Categories like Math or Behavior that points are earned in"). Rename "Point Groups" -> "Point categories" in the UI (the home tile already says "Point Categories"), "Ranking Groups" -> "Competitions". Keep route paths.

**Students page.** Replace `alert()` with inline field errors under the field ("First name is required"); real labels above fields; one primary "Add student" and the bulk import as a quiet secondary; delete confirmation names the student and what is lost (their points and links) in an in-page dialog, not `confirm()`. Bulk import becomes 3 steps with progress: choose file, review ("48 students ready, 2 need attention"), import.

**Teacher home.** Default to the teacher's own active groups, hide archived behind the existing toggle; remove ID display and sort controls unless the count of groups exceeds 8 (progressive disclosure threshold decided: show search/sort only when there are more than 8 groups; the dashboard stays one tap). Empty state: "You are not assigned to any groups yet. Ask your school administrator to add you to a group; once they do, it will show up here." Ranking group section hidden entirely when empty (it is an advanced concept; absence is not an error). Remove the "Quick Stats" row of Teacher ID / School ID (internal) from the primary area; keep it in a small "Your account" disclosure (needed for support calls and for the link code).

**Group scorebook first run.** Covered in section 3 (empty state with "Add your first assignment").

**Year rollover.** Promote "Duplicate events" to a banner when the active timeframe has no events and a previous timeframe does: "Start the new term with last term's assignments? [Copy 18 assignments]". Primary button opens the existing duplicate modal with everything preselected (its defaults are already good). This is a default-not-ask change; it adds a banner, no data change (events and timeframes are already loaded on the page).

### Needs from others
- **backend:** none for the checklist if the dashboard data already carries counts (verify `getAdminSchoolDashboardData` shape; if it lacks teacher/ranking-group counts, request them - read-only additions).
- **senior-developer:** teacher groups page restructure shares code with section 3.
- **privacy-boundary:** none new. Do confirm that displaying a teacher's own link code in the page is acceptable (existing behavior; not a new surface).
- **designer:** checklist visual (done/active/locked).

### Priority and release
P2 (admin setup is infrequent but first-run failure is total). Checklist = **MINOR**. Inline errors and in-page dialogs = **PATCH**. Teacher home simplification = **PATCH**. Year-rollover banner = **MINOR**. Renames = **PATCH**.

---

## 6. The student compare page (`/student/compare`) (P0 decision, P2 work)

### Facts
- `app/student/compare/page.tsx` is linked from nowhere (`grep` finds no inbound `/student/compare` link). A user can only reach it by typing the URL.
- It calls `getSchoolGlobalStats(schoolId, null)` for the whole school, adapts it to a legacy shape with fabricated values ("lastMonthRank: s.rank, // We don't have this data", `gradeRank: s.rank`, `pointGroups: []`), and passes the entire school roster (every student, name, total, rank) to a client component, so it crosses the wire to a student's browser. `CompareContainer` also reads `globalData.students[0].id` unguarded (crash on an empty school), has `console.log` of student rows, and renders a bare "Loading..." forever if the student has no data.
- `DATA_DISCLOSURE.md` §7.4 #6 flags `getSchoolGlobalStats` as a no-cut, no-auth full ranked roster and says delete it "if compare is being retired". The doc contains no explicit ruling on compare itself (privacy-boundary said it is ruling now).
- STUDENT tier: "may see their own position... may not see another student's beyond what is PUBLIC." A full roster violates that regardless of UX.

### Decision (UX)
Retire `/student/compare`. Reason from the beginner test: it has no entry point, cannot be explained in one sentence ("compare with whom?"), shows placeholder data that is wrong by construction, and its only purpose (rank against peers) is already served by the student's own standing. No flow depends on it. If privacy-boundary rules differently, I will not rebuild it as is; the replacement would be "How you compare with your grade" using aggregate only (no names), which needs their approval of the aggregate and the 10-student floor (§3.4).

Replacement behavior: the route redirects to `/student`.

### Needs from others
- **privacy-boundary:** final ruling (they are ruling now). If "retire", also delete `getSchoolGlobalStats` per §7.4 #6. Re-read this section when their ruling lands; I will update it, not re-decide.
- **senior-developer:** remove `app/student/compare/**`; verify nothing else imports `getSchoolGlobalStats`.

### Release
Removing a reachable-by-URL page = **MAJOR** per RELEASING.md ("removing a page"). Bundle with the existing BREAKING dashboard entry.

---

## 7. Student and parent home pages (hierarchy) (P1)

### 7a. Student home (`app/student/page.tsx`)
Current order: header (identity, avatar, kicker "Student profile", seals, then point balance), then label "01 / PERFORMANCE OVERVIEW - YOUR CURRENT STANDING" (internal), then "Overall Ranking" card (rank, "of N students", 5-row Nearby Students list with full peer names and points), "Grade N Ranking" card (same, again), optional "Quick Actions" (only TA scorebooks, but named generically), optional "Groups You Lead" (letter grades per student), "Point Group Rankings" (per-category ordinal, "of N", 3 nearby peers each), then recent events with the share button. Decorations: seals, avatar, kicker, topline "PHOENIX / STUDENT RECORD", tabs.

Count: ~**25+ named people** and ~12 rank numbers before the first recent event. The student came to see their points; the points are in the header (good), but "what did I just earn" is the 5th section.

Target order (structure contract also in section 8):
1. **Points now**: total points, timeframe, and one line of standing: "#7 in your grade" (own rank; own denominator is allowed for the student tier). Largest element.
2. **What you earned recently**: last 5 events, each with name, points, date, and a "Share" button. (Move up from the bottom.)
3. **Where your points come from**: categories with points (the existing `PointDistribution`), letter grade per category, tap to expand to the category's own recent events.
4. **Where you stand**: one compact card: overall rank and grade rank, with the movement since last month (existing `StudentMonthlyTrends`). Peer name lists are not shown here (see dependency).
5. **Roles** (only if applicable): "Scorebooks you help with" (TA) and "Groups you lead". Rename "Quick Actions" -> "Scorebooks you help with".
Tabs: "Dashboard" -> "My points", "Shared points" -> "Shared with me".
Remove internal labels ("01 / PERFORMANCE OVERVIEW", "PHOENIX / STUDENT RECORD", "STUDENT RECORD" seal) - the designer decides whether decorative equivalents come back, but no jargon.

### 7b. Parent child page (`app/parent/[studentId]/page.tsx`)
Current: points total (right-aligned in header), three cards ("Overall rank #n of N", "Grade rank", "Percentile"), then a table "Nearby students" listing other children by name.

Target: (1) Child's name and total points, largest. (2) "Recent points": last events with points and dates (same `getStudentDashboardDataById` payload that the student view uses, which already includes `pointEventRankings`; parent tier is documented as "everything the student sees"). (3) "By category". (4) Standing as one line ("#7 in Grade 6"), no percentile jargon (the "Percentile 91%" tile is a derived stat nobody asked for, and its inverse is a "bottom 9%" shame statistic). (5) Nothing about other children by name.
Parent index: if exactly one child is linked, redirect `/parent` straight to `/parent/<id>` (default, do not ask); with more than one, show the child cards (rename "View progress" -> "See <first name>'s progress"). The index remains the place for "Add another child". The empty state is the link screen (section 1). Page title "Parent Dashboard" -> "Your children".

### Needs from others
- **privacy-boundary (blocking for the roster bits):** `DATA_DISCLOSURE.md` PARENT tier says "Comparative views ('nearby students') are a disclosure of other children to this parent and must be justified or cut." I recommend cut on the parent page (no justification from the parent's goal) and rule requested for the student page, where the same names/points of 5 neighbours x 2 lists + 3 per category are shown to a peer. Both are STUDENT/PARENT-visible per field and `DATA_DISCLOSURE.md` says "Unruled is denied". My default if no ruling: remove named neighbour lists on both pages, keep own rank and "of N" (own denominator allowed) on the student page. On the parent page "of N" also stays, because the PARENT tier is "everything the student sees".
- **senior-developer:** sections reorder only; but "recent events at top" needs `pointEventRankings` in the first render. It is already fetched (`getStudentDashboardData`), and `RecentEventsWithRankings` is loaded via `dynamic(..., { ssr: false })`, so the section lazy-loads after the page; with it moved to position 2 it needs a skeleton of its own height to avoid layout jump (UX owns the skeleton).
- **designer:** coordinate in section 8.

### Release
Reorder, rename, remove jargon: **PATCH**. Removing neighbour name lists (if privacy-boundary rules cut): **MAJOR** (a role loses access to data). Parent auto-redirect for one child: **PATCH**.

---

## 8. Student-surface structure contract for the designer

This section is the structure I need honored in the rebuild; it has been reconciled with `docs/design/VICTORIAN_REMAKE_PLAN.md` (see "Coordination with the designer" at the end, which records where the two plans differ and who wins).

Per student screen:
1. One H1: the student's name or "My points". One primary number: total points. No second competing number at the same size.
2. Section order: Points now -> Recent earnings -> Categories -> Standing -> Roles. Anything that is not about the student's own points goes below.
3. No section titled with an index or code ("01 /"). Section headings are plain nouns: "Recent points", "By category", "Where you stand".
4. Primary action per screen: on My points it is "Share" on a recent earning (one per row, text + icon, >=44px). On Shared with me there is none (read-only).
5. Mobile first: single column, no horizontal scroll, tab bar at the bottom (as now) with thumb-reachable targets >=44px, safe-area padding preserved (`StudentTabs`).
6. Every list has an empty state in plain words and a skeleton: Recent points empty = "No points yet this term. Points your teachers award will show up here."
7. No state conveyed by color alone (rank colors via `rankToColor` also need the ordinal text, already present).
8. 3D scene / sparkle decoration (`SparkleBackground`, three.js) must be optional and must not delay first content; first content paints before the scene.

Designer-owned: palette, type, motion, ornament, the Victorian theme itself.

---

## 9. Priority order (build sequence)

| # | Item | Why now | Release |
|---|---|---|---|
| 1 | Dashboard entry points + hub with school name/links (section 2, no switcher) | A staff-only feature with no door | MINOR |
| 2 | Home hub: sign-in split, role router, ParentChip, shared link screen (section 1) | First-run failure for every parent | MINOR |
| 3 | Compare retired (section 6) | Roster crossing the wire to a student; ruling pending | MAJOR (bundle with dashboard login) |
| 4 | Scorebook quick wins: delete dead button, delete confirm names event+count, paste tab/First-Last, overwrite count (section 3 items 1-2) | Daily teacher flow; low risk | PATCH/MINOR |
| 5 | Dashboard `next` return path, staff-only notice, `isError` handling, feature redirect keeps query (section 2) | Cheap, closes silent failures | PATCH |
| 6 | Point sharing language, toast, single-group toggle, empty states (section 4) | Needs privacy sentence first | PATCH |
| 7 | Student/parent home reorder, jargon removal (section 7) | Waits on privacy ruling for neighbour lists; the parent one-child redirect can go first | PATCH (MAJOR if lists cut) |
| 8 | Scorebook restructure: details vs scores, mobile card view, import wizard (section 3 items 3-5) | Largest effort | MINOR |
| 9 | Admin checklist, inline errors, teacher home trim, rollover banner (section 5) | Infrequent but total-failure first run | MINOR/PATCH |
| 10 | School switcher and kiosk pairing (section 2) | Blocked on backend contracts | MINOR |

---

## 10. Open dependencies (who owes what)

| Owner | Needs to deliver | Blocks |
|---|---|---|
| privacy-boundary | Ruling on `/student/compare` (retire vs aggregate) | Item 3 |
| privacy-boundary | Ruling on named nearby-student lists on student page and parent page | Item 7 neighbour part |
| privacy-boundary | Approve "who will see this" sentence; ruling on sharer name shown to recipients | Item 6 |
| privacy-boundary | Whether a pre-link "Is this Maya R.?" confirm may reveal a name from a code | Section 1 confirm step (not built until ruled) |
| backend / senior-developer | `getDashboardSchools()` returning school list, selected id, `fellBack` flag | School switcher (item 10) |
| backend | Kiosk display-device token with one-step pairing from a signed-in staff browser (UX requirements in section 2) | Hallway displays long-term |
| backend | Is `link_code` unique across schools? | Removing the School number field |
| backend | Is a blank score representable versus 0? | Screen 2 blank-row behavior |
| senior-developer | `next` redirect validated same-origin in login action | Item 5 |
| senior-developer | Remove `console.log` of student/dashboard data (X7) | n/a (privacy hygiene) |
| designer | Victorian remake plan matches section 8 order | Items 6-7 |

## 11. What I verified and what I did not

Read in full: home page and chips, login, link pages and layout, parent pages, student page and share modal/tab/tabs, compare page and the head of its container, dashboard layout/hub/hook/feature alias, teacher home, scorebook add/edit/delete/duplicate/import/bulk code paths. Skimmed only: admin school home, admin students page (headings, alerts, import), TA management modal, `RecentEventsWithRankings` internals, `topCards`/`mobile` pages, the remaining admin pages (groups, timeframes, point groups, ranking groups, teachers, editGroup). Those admin pages are not yet walked screen by screen; section 5 findings about them are from headings and grep, and need a proper pass before implementation.

No app code, DB, or CHANGELOG was touched. Nothing here has been built or type-checked.

## Coordination with the designer (reconciled after reading `VICTORIAN_REMAKE_PLAN.md`)

The designer's plan landed while this one was being finished. Read in full. Rulings, so neither plan has to be re-litigated:

1. **Section order (mine wins, it is structure).** Designer's section 4 assumes identity, balance, standing, breakdown, recent events. Final order is: identity + point balance (one block, as the designer drew it) -> **Recent points** -> By category -> Where you stand -> Roles. Recent points move above Standing and Breakdown. Everything the designer specified for each block's look stands; only the sequence changes. The ledger-row treatment they defined for recent events is exactly right for position 2.
2. **Tabs.** Stay two tabs. Labels become "My points" and "Shared with me" (was "Dashboard" and "Shared points"). Designer's bottom nav sizing is unaffected.
3. **Compare.** Retired (section 6, pending privacy-boundary). Designer drops compare from Phase 4, drops the `max-w-5xl` compare exception, and does not style `CompareContainer`. If privacy-boundary rules otherwise, this section is reopened before they style it.
4. **Neighbour rows.** Designer's plan to build the neighbour-less Standing first is adopted. My default (section 7) is also neighbour-less until privacy-boundary approves rows.
5. **"of N students" for the student's own view.** Agreed: allowed for the STUDENT tier per `DATA_DISCLOSURE.md` section 4. Not shown on any PUBLIC surface.
6. **Empty and error copy (they asked for it, to style once):**
   - No points this term: "No points yet this term. Points your teachers award will show up here."
   - Not connected: heading "Connect your student account", body "Enter the code your school gave you.", button "Connect account".
   - Load failure: heading "We could not load your points.", body "Check your connection and try again.", button "Try again".
   - Shared with me, empty: "Nothing shared yet. When classmates share points with you, they appear here."
   - Share modal, no groups: "You are not in any groups yet. Your teacher adds students to groups, so there is nothing to share with right now."
7. **Freeze request.** Structure for `app/student/page.tsx`, `StickyHeader.tsx`, `StudentTabs.tsx`, `RecentEventsWithRankings.tsx`, `SharedPointsTab.tsx`, `SharePointModal.tsx` is implemented first by me (sections 4 and 7a), then designer Phases 2-4 start on that markup. Designer Phases 0-1 (tokens, primitives) proceed now in parallel. I will not touch classes beyond what moves; I will use their `ui.tsx` primitives where they exist and plain markup where they do not yet.
8. **Shared link screen.** The designer lists `app/linkAccount/student` in their Phase 4. The link screen is now one shared component (section 1) covering student, parent and teacher; they restyle that single component, not three pages. It also gives them the parent surface early, so their Phase 6 (carry `.theme-victorian` to parent) is a natural follow-up and I support it: parent page structure in section 7b is ready for it.
9. **Layout shift.** Moving Recent points to position 2 while `RecentEventsWithRankings` is `dynamic(..., { ssr: false })` needs a same-height skeleton; I build the skeleton structure, they style it.
10. **Release level.** Their styling is PATCH. Mine are PATCH/MINOR as per-item above, with the compare removal and any neighbour-list removal as MAJOR. The combined release takes the highest level; all MAJOR items ride with the existing BREAKING dashboard-login entry.
11. **Backend ask they raised** (`previousTotalPoints` for the award animation): UX agrees it is nice-to-have; not on my critical path; needs a disclosure check as they said (own data only, so STUDENT tier).
