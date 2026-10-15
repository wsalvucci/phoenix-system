# Changelog

All notable changes to Phoenix System. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning: [SemVer](https://semver.org/). Rules for writing entries: `docs/RELEASING.md`.

## [Unreleased]

### Added
- Operators can create and later remove a clearly fictional "QA Test School (not real)" with six test sign-in accounts for checking hosted deploys (`scripts/qa-school/`, see `docs/TESTING.md`).

### Security
- An admin of one school can no longer change or delete another school's point categories, terms or competitions (ranking groups), or add and remove their teachers and groups, by row number. Every admin change is now checked against the school that owns the record.
- Creating a competition or point category no longer works for someone who is not an admin of that school.
- A teacher can no longer open another group's teaching-assistant roster or scorebook by having an account number that matches a student's number. Assistant access is checked against the student linked to the signed-in account.
- Granting a teaching assistant access, scoring a competition event, or choosing a point category now rejects groups, events and categories that belong to a different group or school.
- Editing a teacher from the admin screens can change only the name. Unlinking a teacher's account is a separate, admin-checked action, and the old open-ended teacher update, the unused own-teacher lookup that returned link codes, and several score-payload log lines were removed.

## [2.0.0] - 2026-10-15

### Added
- When a student's points have gone up since they last looked, the total on their page counts up and the gold rule beneath it shimmers once. Reduced-motion settings skip it.
- Students and parents see "N points to move up" for the whole school, the grade and each category. Grade and category gaps show only when at least 10 students there have points, and nothing shows at first place. No other student is named.
- A student who shared a score that a teacher later changed is told on their next visit: "Your shared score for <assignment> changed, so it is no longer shared."
- Student group leaders see one letter (S, or A to E) per member for each ranked category under "Groups you lead", refreshed once a day. A category is shown as "Not shown for this group" when the group is small, under half took part, or one or two members would stand out at D or E.
- Members of a led group, and their parents, now see "<Leader>, who leads <Group>, can see your letter grade (S, or A to E) for each category", with the member's own letters.
- Students see friendly messages when there are no recent points, no categories, no groups to share with, or nothing shared with them yet.
- Teachers and admins can open the hallway displays from a new "Open hallway display" link on the teacher home and the school admin page.
- The display menu (`/dashboard`) now names your school, lets staff with several schools switch between them, and carries the school into every display. If you ask for a school you cannot open, it says so and shows your own.
- Parents and guardians now have a home entry: "Your children" with how many are connected, and a "Connect my child" button when none are.
- A signed-in account with no role yet is asked "Who is using Phoenix?" (student, parent or guardian, teacher) instead of only being offered a student link.
- Database support for hallway display devices: a screen is paired once from a staff member's own signed-in phone or laptop, shows one school's dashboards only, and can be revoked by an admin.
- Database support for dashboard leaderboards that show only the top of each cohort (overall, grade, category, team), never a count, and for a "points to the next rank" figure on student and parent pages.
- A shared score is automatically stopped from being shared when a teacher changes it, and the student is told on their next visit (database side).
- Database support for longer, unguessable link codes, a limit on wrong link-code attempts, a parent-link list and revoke button for admins, and a "Your account was linked to a parent on <date>" note for students.
- Database support for "Groups You Lead" category letters (S, A to E), from a once-a-day snapshot with small-group hiding.
- "Groups You Lead" letters cover ranked categories only, count only whole days up to midnight UTC, and hide a category column unless more than half the group took part in it (database side).
- Hallway screens can be paired without signing in on them: open `/display` on the screen, then type the code it shows into "Pair a display" (`/display/pair`) from your own signed-in phone or laptop. A paired screen shows only its own school's displays, with its name and "Paired by" on the display menu.
- Staff signed in on the screen itself can instead choose "Turn this browser into a display"; they are signed out of that browser in the same step and stay signed in on their other devices.
- Admins have a new Displays page under each school to see every paired screen, remove one, or keep on a screen that was paused because the person who paired it is no longer staff there. Teachers see and can remove the screens they paired. The display menu has a "Pair a new display" tile.
- Admins see the parent accounts linked to each student on the student's page and can remove any of them. Students see "A parent account was linked on <date>" on their own page.
- For QA and operators: a repeatable test suite (`npm run test:all`) that starts a local database with fictional data (an admin, two teachers, 40 students, a parent, a group leader, a teaching assistant), checks database permissions and the leaderboard cut, and signs in as each role in a browser to confirm what each can and cannot open. It runs in GitHub Actions and never touches the live project. Guide: `docs/TESTING.md`.

### Changed
- A paired hallway screen now opens the rotating highlights directly instead of stopping at the display menu. Staff still see the menu at `/dashboard`.
- The display menu now says "Choose a screen to show", describes each screen in plain words, and lists three screens instead of four.
- "Top cards" is now the same screen as "Top students" (the Hall of Honor). Old `/dashboard/topCards` bookmarks and kiosk URLs go there automatically.
- The upcoming-events slide now reads "Events where you can earn points".
- Hallway displays have a new look, the Honor Board: warm gold-and-cream (or dark) boards with ranked medals, a gold frame and a podium for first to third place, replacing the scrolling list. The overall, category, grade, spotlight and upcoming-events screens, the pairing screen, the phone view and the display menu share it. The display's "N shown" count and "Leader pinned" note are gone, a screen can be set to light with `?mode=light`, and animation respects reduced-motion settings.
- **BREAKING:** The hallway displays (featured, global, phone view and top cards) now show only the top of each list: overall, each grade and each ranked category, cut by the same rule as the mobile app (at most 10 per list, never a student with no points, and tied students shown together or not at all). Points are the stored scores, so some totals change. Student counts, "vs. last month" rank changes, the "Moving up" panel, the team standings panels and the per-student category colours are gone.
- **BREAKING:** Ranks on the student page and the parent child page now count only students with points this timeframe, and tied students share the better rank, the same as the mobile app. A student with no points shows "Not ranked yet" instead of a last-place rank. Categories show a rank only for ranked categories, and an assignment with fewer than 4 students shows no rank. "Points to move up" for the whole school needs at least 10 ranked students.
- Opening a display link while signed out now takes you to sign-in and then straight back to that display. A wrong password says so plainly and keeps your place; the email box now suggests saved emails and shows the right phone keyboard.
- The older `/dashboard/feature` address keeps its school when it forwards to the featured display.
- In the scorebook, "Add New Point Event" is now "Add an assignment", and deleting one names it and says how many saved scores go with it. The duplicate "Open Unified Scorebook" button, which opened this same page, is gone.
- Student pages have a new look: a printed prize-certificate style with a framed name card, a gilt points total, serif headings, ruled lists and a text-only tab bar, in light and dark. The old cyan console look and its sparkle effect are gone, along with an unused 3D library.
- Mobile app totals, ranks and group averages now count only the chosen timeframe; some used every point ever earned. A student with no points this timeframe is shown as not ranked yet instead of last (migration `20261014230650`).
- The student page now leads with your name and points, then Recent points, By category, Where you stand, and any roles you have. Labels like "Performance overview" and "Student record" are gone.
- Student tabs are now "My points" and "Shared with me". Shared with me explains it shows points students in your groups chose to show you.
- Sharing a point now says who will see it before you commit, and shows a short confirmation ("Shared with Band", "Stopped sharing"). Students in one group share with a single tap; others get a button that says what it will do, such as "Share with 2 groups".
- Students who are not ranked yet see "Not ranked yet" instead of a rank.
- The parent page for a child now shows their name and points first, then Recent points, By category, and standing. The percentile tile is removed.
- Student, parent and teacher account linking is now one screen: type the code from your school, press Enter or the button. The school number can be passed as `?school=<id>`. The code is never put in a link.
- The display menu describes the whole-school screen as "Whole-school highlights on one screen" and also lists the phone view and top cards.
- Signed-out visitors see "Have you used Phoenix before?" with Sign in and Create an account, instead of an empty list of destinations.
- The parent page is now "Your children"; adding a child opens the connect screen instead of an inline form, and the empty state has a button.
- Rank colours are now the same on every screen and readable in light and dark. In a school or group of 21 to 29 students every rank shows in the neutral colour.
- **BREAKING:** The student's own link code is no longer sent to the student's browser. Families get the code from school staff.
- Linking a parent or teacher account now gives one message for every failure and no longer repeats or logs the code.
- **BREAKING:** Every `/dashboard/*` screen (featured, global, mobile, top cards) now requires a teacher or admin login. Hallway displays need a signed-in staff browser.
- Dashboards show the signed-in staff member's school instead of a fixed school; staff with several schools can pick one with `?school=<id>`.
- `/dashboard/feature` now redirects to `/dashboard/featured`.
- Dark mode colour tokens across the app.
- Added shared colour and type tokens for the upcoming student redesign (paper, ink, brass and a single set of rank colours that read in light and dark). Nothing on screen changes yet.
- **BREAKING:** "Groups You Lead" on the student page now lists group and member names only. Letter grades and grade levels for group members are no longer shown.
- **BREAKING:** The student home page and the parent child page no longer list nearby students by name. Own rank and "of N" figures stay.
- **BREAKING:** Teaching assistants no longer see teacher notes, PowerSchool ids, or other-group memberships in the scorebook, and score cells are no longer colour-coded for them. Their saves leave existing notes untouched.
- **BREAKING:** The teacher home no longer shows the teacher's link code. Ask an admin to reissue a code if an account must be re-linked.
- **BREAKING:** Students can only share a score with groups they belong to.
- The "Shared with me" list no longer shows the raw quiz score and is ordered by when it was shared, then by name, instead of by points.
- Tied scores on an event now share the same rank on the student page.
- Linking a student account now gives the same message for a wrong code, wrong school, or an already-linked student, and no longer repeats the code back.
- The login page accepts an optional `next` address and only follows it when it stays on this site.

### Removed
- **BREAKING:** The student compare page (`/student/compare`) and its school-wide ranking endpoint are retired. The old address redirects to `/student`.

### Security
- **BREAKING:** Signed-out visitors and signed-in accounts can no longer add, change or delete any database row directly with the public app key; only the server and the student functions can. Nothing in the web or mobile app changes. Operators: migration `20261014230655` needs the product owner's approval before it is applied to the live database.
- A paired screen stops showing displays as soon as it is removed or its pairer stops being staff at that school, and then shows a new pairing code rather than a staff sign-in form.
- Removed three unused dashboard server endpoints that returned any school's student points, rankings and nearby students without checking who was asking.
- Hallway display data no longer carries student ids, every student's score on every assignment, or last-month figures; the list cut is applied in the database only, with no adjustable settings.
- A student's birthdate and gender are no longer sent to the browser on the home screen or the student pages; nothing there shows them.
- Removed console logging of student and dashboard data from the teacher home and the admin school layout.
- Dashboards no longer show a student who is missing from a point group's ranking, and small grades now hide at least three students and round their share down.
- Removed two unused school-wide statistics endpoints (student and teacher versions) and an unused global dashboard endpoint that could return school rosters.
- Removed browser and server console logging of student and dashboard data from the student compare page and dashboard timeframe lookup.
- Removed unused server code that could return a whole school's student list (including link codes), a group-leader league table, and an old featured-dashboard roster, so none of it can be switched on by accident.
- Dashboard and student-stats server actions now check who is calling and only return data for that caller's own schools, students, or linked children.
- Parents can no longer read a student they are not linked to.
- Teaching assistants are checked for group membership before acting on a group.
- Removed server logging that could expose the database service client and dashboard payloads.
- Removed an unused `eval` path from point conversion.
- Database functions can no longer be called without signing in, and signed-in accounts can call only the student functions the mobile app uses. Closes a hole that let anyone create a school and attach it to an admin.
- Admin lookups of a school's point groups and student groups now return only the requested school's groups, instead of every school the admin manages.
- Fixed a rule on the legacy class-enrolment table that let an admin of any school manage it for every school.
- Requests with no signed-in session now run with public-level database access instead of full access. This closes a teacher link-code lookup that worked without signing in.
- **BREAKING:** In the student mobile app, a group leader can no longer read group members' points or category totals (migration `20261014223157`). The leader's group screen shows an error until the mobile app is updated.
- **BREAKING:** Mobile app leaderboards (school, grade, category) now show only the top of each list under the same rules as the hallway displays, never students with no points, and no names just above your own; other students' ids and weekly changes are no longer sent. Group averages need at least 10 members, the "top student" figure is gone, team rankings are limited to your own school and teams you belong to, and "Nth of N" on an event needs at least 4 participants (migration `20261014230650`). Needs a mobile app update released at the same time.
- Hallway displays stop working if the staff member who paired them is no longer staff at that school, until an admin of the school re-confirms them (database side).
- **BREAKING:** Connecting a student, parent or teacher account is now limited to 5 wrong codes per account and 20 per network each hour, after which the screen says "Too many tries". Two people can no longer claim the same teacher account at once. Deploy step: the server setting `LINK_RATE_LIMIT_SECRET` must be set first, or every connect attempt says "Linking is not available right now".
- New teacher accounts, and teacher codes reissued when an admin unlinks a teacher, now get a 10-character code from a secure generator instead of a short guessable one.

### Fixed
- A score that takes points away now shows as "-5" instead of "+-5" on the student, parent and admin student pages.
- The home page no longer makes the server log errors for every role you do not have; it checks your roles first and loads only those.
- The administration and teacher pages now say "You do not have access" with a link home when opened with the wrong kind of account, instead of loading forever.
- Point totals on the admin school and student pages now use the score each student was given. An old template rule is no longer applied a second time on top, so totals for assignments made from such a template may change.
- The Recent points list on the student page no longer re-checks sharing status over and over.
- Building a fresh local database from the migration files no longer stops at the first file on current Supabase images. On the live database the added lines do nothing.

## [1.0.0] - 2026-09-12

Baseline release: the state of `master` when versioning began. Summary of work since June 2024:

### Added
- Admin management of schools, classes, teachers, and students.
- Student, parent, teacher, and admin portals with account linking via link codes.
- Point groups, ranking groups, timeframes, and letter grades.
- Featured, global, mobile, and top-card dashboards with rank changes.
- Teaching assistants and student leader tools.
- Scorebook with CSV import (batched, with error reporting), event duplication, and bulk score entry.
- Student point sharing.
- Point conversion formulas.
- Victorian-styled student page with monthly trends and a three.js scene.
