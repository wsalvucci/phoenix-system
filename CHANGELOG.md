# Changelog

All notable changes to Phoenix System. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning: [SemVer](https://semver.org/). Rules for writing entries: `docs/RELEASING.md`.

## [Unreleased]

### Added
- When a student's points have gone up since they last looked, the total on their page counts up and the gold rule beneath it shimmers once. Reduced-motion settings skip it.
- Students see friendly messages when there are no recent points, no categories, no groups to share with, or nothing shared with them yet.
- Teachers and admins can open the hallway displays from a new "Open hallway display" link on the teacher home and the school admin page.
- The display menu (`/dashboard`) now names your school, lets staff with several schools switch between them, and carries the school into every display. If you ask for a school you cannot open, it says so and shows your own.
- Parents and guardians now have a home entry: "Your children" with how many are connected, and a "Connect my child" button when none are.
- A signed-in account with no role yet is asked "Who is using Phoenix?" (student, parent or guardian, teacher) instead of only being offered a student link.
- Database support for hallway display devices: a screen is paired once from a staff member's own signed-in phone or laptop, shows one school's dashboards only, and can be revoked by an admin. Screens are not switched over yet.
- Database support for dashboard leaderboards that show only the top of each cohort (overall, grade, category, team), never a count, and for a "points to the next rank" figure on student and parent pages.
- A shared score is automatically stopped from being shared when a teacher changes it, and the student is told on their next visit (database side; the notice is not shown on screen yet).
- Database support for longer, unguessable link codes, a limit on wrong link-code attempts, a parent-link list and revoke button for admins, and a "Your account was linked to a parent on <date>" note for students.
- Database support for "Groups You Lead" category letters (S, A to E), from a once-a-day snapshot with small-group hiding.
- "Groups You Lead" letters cover ranked categories only, count only whole days up to midnight UTC, and hide a category column unless more than half the group took part in it (database side).

### Changed
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
- **BREAKING:** When migration `20261014230700_regenerate_link_codes` is applied, every student and teacher link code is replaced with a new 10-character code, and every code already handed out stops working. Accounts that are already linked stay linked. Admins must reissue codes to families and teachers who have not linked yet.

### Removed
- **BREAKING:** The student compare page (`/student/compare`) and its school-wide ranking endpoint are retired. The old address redirects to `/student`.

### Security
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

### Fixed
- The Recent points list on the student page no longer re-checks sharing status over and over.

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
