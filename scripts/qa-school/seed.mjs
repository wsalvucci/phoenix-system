#!/usr/bin/env node
// Creates (or tops up) the fictional "QA Test School (not real)" and its six sign-in accounts on the
// Supabase project named by QA_SUPABASE_URL. Idempotent: every row is found by a natural key first and
// only created if missing; existing rows are left as they are, so QA edits survive a re-run. Run
// teardown.mjs, then this script, to get back to the initial state.
//
// Usage (see docs/TESTING.md, "Hosted QA accounts"):
//   node scripts/qa-school/seed.mjs --env-file .env.qa --confirm-school "QA Test School (not real)" \
//     [--credentials-out .env.qa.credentials] [--dry-run]
//
// Not a transaction: PostgREST cannot span one across tables. Every write is confined to the QA school
// and the qa-*@example.test accounts, and a re-run converges, so a run that stops half way is fixed by
// running it again (or by teardown).
import {
  QA_SCHOOL_NAME, QA_EMAIL_PATTERN, fail, parseArgs, loadEnvFile, readConfig, projectRef, banner, requireConfirm,
  serviceClient, must, findQaSchool, reverifySchool, listQaAuthUsers, writeCredentialsFile, checkCredentialsPath,
} from "./lib.mjs";

const args = parseArgs(process.argv.slice(2), {
  values: ["--env-file", "--confirm-school", "--credentials-out"],
  booleans: ["--dry-run"],
});
if (args["env-file"]) loadEnvFile(args["env-file"]);
const cfg = readConfig({ needPassword: true });
const dryRun = Boolean(args["dry-run"]);
banner("QA school seed", cfg, { dryRun });
requireConfirm(args);
// Check the credentials path before writing anything, so a bad path cannot leave a half-reported run.
if (args["credentials-out"]) checkCredentialsPath(args["credentials-out"]);

const db = serviceClient(cfg);
const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const iso = (ms) => new Date(ms).toISOString();

// ---------------------------------------------------------------------------------------------------
// The plan. Everything below is fictional. Totals in the current term, by roster number:
//   1..13 -> 100, 94, 88, ... 28 (all distinct, all > 0), 14 -> an explicit 0 row, 15 -> no rows.
// 13 students with a positive total, so the overall cut is min(10, floor(0.33 * 13), 13 - 3) = 4 names.
// ---------------------------------------------------------------------------------------------------
const ACCOUNTS = [
  { key: "admin", email: "qa-admin@example.test", first: "Quinn", last: "Admin", role: "Admin of the QA school" },
  { key: "teacher", email: "qa-teacher@example.test", first: "Tess", last: "Teacher", role: "Teacher (QA Homeroom A, QA Club; QA Houses ranking group)" },
  { key: "student", email: "qa-student@example.test", first: "Eli", last: "Example", role: "Student #5 Eli Example, rank 5 (just below the published 4)" },
  { key: "parent", email: "qa-parent@example.test", first: "Pat", last: "Parent", role: "Parent of student #5 Eli Example" },
  { key: "leader", email: "qa-leader@example.test", first: "Ben", last: "Sample", role: "Student #2 Ben Sample, leader of QA Homeroom A" },
  { key: "ta", email: "qa-ta@example.test", first: "Cora", last: "Testcase", role: "Student #3 Cora Testcase, teaching assistant (full access) for QA Homeroom A" },
];
for (const a of ACCOUNTS) if (!QA_EMAIL_PATTERN.test(a.email)) fail(`bad QA e-mail ${a.email}`);

const FIRST = ["Ada", "Ben", "Cora", "Dev", "Eli", "Fay", "Gus", "Hana", "Ivy", "Jude", "Kai", "Lena", "Milo", "Nia", "Omar"];
const LAST = ["Example", "Sample", "Testcase", "Placeholder"];
const ROSTER = FIRST.map((first, idx) => {
  const n = idx + 1;
  return {
    n,
    first,
    last: n === 2 ? "Sample" : n === 3 ? "Testcase" : n === 5 ? "Example" : LAST[n % 4],
    grade: 6 + (n % 3),
    powerschool: 99_000_000 + n, // fictional, out of any real PowerSchool range used so far
    total: n <= 13 ? 100 - 6 * (n - 1) : 0,
  };
});
const STUDENT_ACCOUNT = { student: 5, leader: 2, ta: 3 };
const PARENT_OF = 5;

const TIMEFRAME = { name: "QA current term", starts: iso(now - 60 * DAY), ends: iso(now + 60 * DAY) };
const GROUPS = [
  { key: "A", name: "QA Homeroom A", members: [1, 2, 3, 4, 5, 6, 7, 8], teacher: "qa" },
  { key: "B", name: "QA Homeroom B", members: [9, 10, 11, 12, 13, 14, 15], teacher: "unlinked" },
  { key: "C", name: "QA Club", members: [1, 3, 5, 9, 11], teacher: "qa" },
];
const RANKING_GROUP = { name: "QA Houses", groups: ["A", "B"] };
const POINT_GROUPS = [
  { key: "K", name: "Kindness", ranked: true, color: "#2E7D32" },
  { key: "E", name: "Effort", ranked: true, color: "#1565C0" },
  { key: "T", name: "Attendance", ranked: false, color: "#6D4C41" },
];
const UNLINKED_TEACHER = { first: "Una", last: "Unlinked" };

// Point split: attendance = T/5; odd roster numbers also get effort (kindness = T/2, effort = the rest),
// even ones get kindness = T - attendance. Number 14 has a single explicit 0 kindness row.
function split(total, n) {
  if (total === 0) return { K: 0 };
  const a = Math.floor(total / 5);
  if (n % 2 === 1) {
    const k = Math.floor(total / 2);
    return { K: k, E: total - k - a, T: a };
  }
  return { K: total - a, T: a };
}

// ---------------------------------------------------------------------------------------------------
// Find-or-create primitives. In a dry run nothing is written; a missing row gets a placeholder id, and
// anything keyed on a placeholder is known to be missing without asking the database.
// ---------------------------------------------------------------------------------------------------
const counts = { existing: 0, created: 0 };
let placeholderSeq = 0;
const isPlaceholder = (v) => typeof v === "string" && v.startsWith("new:");
const placeholder = (table) => `new:${table}:${++placeholderSeq}`;

async function ensureRow(table, match, insert = {}, { idColumn = "id", label } = {}) {
  const desc = label ?? `${table} ${JSON.stringify(match)}`;
  const unknown = Object.values(match).some(isPlaceholder);
  if (!unknown) {
    let q = db.from(table).select(idColumn ?? "*");
    for (const [k, v] of Object.entries(match)) q = v === null ? q.is(k, null) : q.eq(k, v);
    const rows = must(await q.limit(2), `find ${desc}`);
    if (rows.length > 1) fail(`more than one ${desc}; resolve by hand`);
    if (rows.length === 1) {
      counts.existing++;
      return idColumn ? rows[0][idColumn] : true;
    }
  }
  counts.created++;
  if (dryRun) {
    console.log(`  would create ${desc}`);
    return idColumn ? placeholder(table) : true;
  }
  const row = { ...match, ...insert };
  const q = db.from(table).insert(row);
  const data = must(idColumn ? await q.select(idColumn).single() : await q, `create ${desc}`);
  return idColumn ? data[idColumn] : true;
}

async function ensureUpdate(table, id, values, desc) {
  if (isPlaceholder(id)) return;
  const row = must(await db.from(table).select(Object.keys(values).join(", ")).eq("id", id).single(), `read ${desc}`);
  const differs = Object.entries(values).some(([k, v]) => row[k] !== v);
  if (!differs) return;
  if (dryRun) {
    console.log(`  would set ${desc}: ${JSON.stringify(values)}`);
    return;
  }
  must(await db.from(table).update(values).eq("id", id), `update ${desc}`);
}

// ---------------------------------------------------------------------------------------------------
// Guards on accounts that already exist: a qa-* account must not already hold any role outside the QA
// school, or this script would be granting a QA password access to something real.
// ---------------------------------------------------------------------------------------------------
async function assertUserConfinedToSchool(userRow, schoolId, email) {
  const outside = [];
  if (userRow.admin_id !== null) {
    const pairs = must(await db.from("admin_school_pair").select("school_id").eq("admin_id", userRow.admin_id), "admin schools");
    if (pairs.some((p) => p.school_id !== schoolId)) outside.push("admin of another school");
  }
  const teachers = must(await db.from("teacher").select("school_id").eq("linked_user", userRow.id), "teacher links");
  if (teachers.some((t) => t.school_id !== schoolId)) outside.push("teacher in another school");
  const students = must(await db.from("student").select("school_id").eq("linkedUser", userRow.id), "student links");
  if (students.some((s) => s.school_id !== schoolId)) outside.push("student in another school");
  const kids = must(await db.from("user_student_pair").select("student:student_id (school_id)").eq("user_id", userRow.id), "parent links");
  if (kids.some((k) => k.student?.school_id !== schoolId)) outside.push("parent of a student in another school");
  if (outside.length) fail(`${email} is already ${outside.join(", ")}; it will not be reused`);
}

// ---------------------------------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------------------------------
async function main() {
  // 1. School
  let school = await findQaSchool(db);
  let schoolId;
  if (school) {
    schoolId = school.id;
    console.log(`Found school ${schoolId} "${QA_SCHOOL_NAME}".`);
  } else if (dryRun) {
    schoolId = placeholder("school");
    console.log(`  would create school "${QA_SCHOOL_NAME}"`);
  } else {
    school = must(await db.from("school").insert({ name: QA_SCHOOL_NAME }).select("id, name").single(), "create school");
    schoolId = school.id;
    console.log(`Created school ${schoolId} "${QA_SCHOOL_NAME}".`);
  }
  if (!isPlaceholder(schoolId)) await reverifySchool(db, schoolId);

  // point_template_type is a global lookup table with no school. Reuse the first existing type; never
  // create one, because teardown could not tell a QA type from a real one.
  const types = must(await db.from("point_template_type").select("id, name").order("id").limit(1), "template types");
  if (types.length === 0) fail("no point_template_type rows exist; create one in the app first");
  const templateTypeId = types[0].id;

  // 2. Timeframe (active), groups, ranking group, point groups
  const timeframeId = await ensureRow(
    "school_timeframes",
    { school_id: schoolId, name: TIMEFRAME.name },
    { starts_at: TIMEFRAME.starts, ends_at: TIMEFRAME.ends, active: true },
  );
  if (!isPlaceholder(timeframeId)) {
    // Keep the term current on re-runs months later: only ever widen it, never move it.
    const tf = must(await db.from("school_timeframes").select("starts_at, ends_at, active").eq("id", timeframeId).single(), "read timeframe");
    const patch = {};
    if (!tf.active) patch.active = true;
    if (Date.parse(tf.ends_at) < now + 14 * DAY) patch.ends_at = TIMEFRAME.ends;
    if (Date.parse(tf.starts_at) > now - 7 * DAY) patch.starts_at = TIMEFRAME.starts;
    if (Object.keys(patch).length) {
      if (dryRun) console.log(`  would update timeframe ${timeframeId}: ${JSON.stringify(patch)}`);
      else must(await db.from("school_timeframes").update(patch).eq("id", timeframeId), "update timeframe");
    }
  }

  const groupId = {};
  for (const g of GROUPS) {
    groupId[g.key] = await ensureRow(
      "student_group",
      { school_id: schoolId, name: g.name },
      { timeframe_id: timeframeId, archived: false },
    );
  }
  const rankingGroupId = await ensureRow("ranking_group", { school_id: schoolId, name: RANKING_GROUP.name }, { timeframe_id: timeframeId });
  for (const k of RANKING_GROUP.groups) {
    await ensureRow("ranking_group_pair", { ranking_group_id: rankingGroupId, student_group_id: groupId[k] }, {}, { idColumn: null });
  }
  const pointGroupId = {};
  for (const p of POINT_GROUPS) {
    pointGroupId[p.key] = await ensureRow("point_group", { school_id: schoolId, name: p.name }, { ranked: p.ranked, color: p.color });
  }

  // 3. Roster and group membership
  const studentId = {};
  for (const s of ROSTER) {
    studentId[s.n] = await ensureRow(
      "student",
      { school_id: schoolId, powerschool_id: s.powerschool },
      { first_name: s.first, last_name: s.last, grade: s.grade, birthdate: `201${2 + (s.n % 2)}-0${1 + (s.n % 9)}-15` },
      { label: `student #${s.n} ${s.first} ${s.last}` },
    );
  }
  for (const g of GROUPS) {
    for (const n of g.members) {
      await ensureRow("student_group_pair", { student_id: studentId[n], student_group_id: groupId[g.key] }, {}, { idColumn: null });
    }
  }

  // 4. Auth accounts and their public."user" rows (the handle_new_user trigger normally makes those)
  const existingAuth = await listQaAuthUsers(db);
  const userId = {};
  for (const a of ACCOUNTS) {
    let authId = existingAuth.get(a.email)?.id;
    if (authId) {
      counts.existing++;
      if (!dryRun) {
        const { error } = await db.auth.admin.updateUserById(authId, { password: cfg.password, email_confirm: true });
        if (error) throw new Error(`reset password for ${a.email}: ${error.message}`);
      } else {
        console.log(`  would reset the password of existing ${a.email}`);
      }
    } else if (dryRun) {
      counts.created++;
      console.log(`  would create auth user ${a.email} (e-mail confirmed)`);
      authId = placeholder("auth");
    } else {
      counts.created++;
      const { data, error } = await db.auth.admin.createUser({
        email: a.email,
        password: cfg.password,
        email_confirm: true,
        user_metadata: { qa_school: QA_SCHOOL_NAME },
      });
      if (error) throw new Error(`create auth user ${a.email}: ${error.message}`);
      authId = data.user.id;
    }

    let userRow = null;
    if (!isPlaceholder(authId)) {
      userRow = must(await db.from("user").select("id, admin_id, student_id").eq("supabase_id", authId).maybeSingle(), `user row for ${a.email}`);
      if (userRow) await assertUserConfinedToSchool(userRow, isPlaceholder(schoolId) ? -1 : schoolId, a.email);
    }
    if (!userRow) {
      if (dryRun) {
        userRow = { id: placeholder("user"), admin_id: null };
      } else {
        userRow = must(await db.from("user").insert({ supabase_id: authId }).select("id, admin_id, student_id").single(), `create user row for ${a.email}`);
      }
    }
    await ensureUpdate("user", userRow.id, { first_name: a.first, last_name: a.last }, `name of ${a.email}`);
    userId[a.key] = userRow.id;
    a.userRow = userRow;
  }

  // 5. Admin: admin row + admin_school_pair
  const adminUser = ACCOUNTS.find((a) => a.key === "admin").userRow;
  let adminId = adminUser.admin_id;
  if (adminId === null) {
    counts.created++;
    if (dryRun) {
      console.log("  would create an admin row for qa-admin@example.test");
      adminId = placeholder("admin");
    } else {
      adminId = must(await db.from("admin").insert({}).select("id").single(), "create admin").id;
      must(await db.from("user").update({ admin_id: adminId }).eq("id", adminUser.id), "link admin");
    }
  }
  await ensureRow("admin_school_pair", { admin_id: adminId, school_id: schoolId }, {}, { idColumn: null });

  // 6. Teachers: the QA teacher (linked) and an unlinked colleague who owns Homeroom B
  const qaTeacherId = await ensureRow(
    "teacher",
    { school_id: schoolId, linked_user: userId.teacher },
    { first_name: "Tess", last_name: "Teacher" },
    { label: "teacher Tess Teacher (linked to qa-teacher)" },
  );
  const otherTeacherId = await ensureRow(
    "teacher",
    { school_id: schoolId, first_name: UNLINKED_TEACHER.first, last_name: UNLINKED_TEACHER.last, linked_user: null },
    {},
    { label: "teacher Una Unlinked (no account)" },
  );
  for (const g of GROUPS) {
    const t = g.teacher === "qa" ? qaTeacherId : otherTeacherId;
    await ensureRow("teacher_student_group_pair", { teacher_id: t, group_id: groupId[g.key] }, {}, { idColumn: null });
  }
  await ensureRow("teacher_ranking_group_pair", { teacher_id: qaTeacherId, ranking_group_id: rankingGroupId }, {}, { idColumn: null });

  // 7. Student, leader and TA accounts (web model student."linkedUser", mobile model "user".student_id),
  //    the parent link, the leader and the TA.
  for (const [key, n] of Object.entries(STUDENT_ACCOUNT)) {
    const sid = studentId[n];
    const uid = userId[key];
    if (!isPlaceholder(sid)) {
      const row = must(await db.from("student").select("linkedUser").eq("id", sid).single(), `student #${n}`);
      if (row.linkedUser !== null && row.linkedUser !== uid) fail(`student #${n} is linked to another account (user ${row.linkedUser})`);
    }
    await ensureUpdate("student", sid, { linkedUser: uid }, `student #${n} linked account`);
    await ensureUpdate("user", uid, { student_id: sid }, `qa-${key} mobile student link`);
  }
  await ensureRow("user_student_pair", { user_id: userId.parent, student_id: studentId[PARENT_OF] }, {}, { idColumn: null });
  await ensureRow("student_group_leaders", { student_id: studentId[STUDENT_ACCOUNT.leader], group_id: groupId.A }, {}, { idColumn: null });
  await ensureRow("teaching_assistant", { student_id: studentId[STUDENT_ACCOUNT.ta], group_id: groupId.A }, { full_access: true });

  // 8. Templates and events: one per (point group, homeroom), three days old (before the UTC day start
  //    the leader-letter snapshot uses).
  const eventId = {};
  for (const hk of ["A", "B"]) {
    for (const p of POINT_GROUPS) {
      const name = `QA ${p.name} ${hk}`;
      const templateId = await ensureRow(
        "point_template",
        { student_group_id: groupId[hk], name },
        { template_type_id: templateTypeId, point_group_id: pointGroupId[p.key], conversion_rule_value: 0, max_input_value: 100 },
      );
      eventId[`${p.key}${hk}`] = await ensureRow(
        "point_event",
        { student_group_id: groupId[hk], name: `${name} week 1` },
        { template_id: templateId, point_group_id: pointGroupId[p.key], date: iso(now - 3 * DAY), max_input: 100 },
      );
    }
  }

  // 9. Scores. The unique (student_id, point_event_id) index makes these naturally idempotent.
  const homeroomOf = (n) => (GROUPS[0].members.includes(n) ? "A" : "B");
  for (const s of ROSTER) {
    if (s.n === 15) continue; // no rows at all
    const parts = split(s.total, s.n);
    for (const [pk, value] of Object.entries(parts)) {
      if (value === undefined) continue;
      await ensureRow(
        "student_point",
        { student_id: studentId[s.n], point_event_id: eventId[`${pk}${homeroomOf(s.n)}`] },
        { point_value: value, input_score: value },
        { label: `score ${value} for student #${s.n} (${pk})` },
      );
    }
  }

  // 10. Student #5 shares their kindness score into Homeroom A, pinned.
  if (!isPlaceholder(studentId[5]) && !isPlaceholder(eventId.KA)) {
    const sp = must(await db.from("student_point").select("id").eq("student_id", studentId[5]).eq("point_event_id", eventId.KA).maybeSingle(), "share source");
    if (sp) await ensureRow("shared_point", { student_point_id: sp.id, shared_group_id: groupId.A }, { pinned: true });
    else if (dryRun) console.log("  would share student #5's kindness score into QA Homeroom A");
  } else {
    console.log("  would share student #5's kindness score into QA Homeroom A");
  }

  if (!isPlaceholder(schoolId)) await reverifySchool(db, schoolId);

  // Report
  console.log(`\n${dryRun ? "Plan" : "Done"}: ${counts.created} ${dryRun ? "to create" : "created"}, ${counts.existing} already present.`);
  console.log(`\nAccounts on ${projectRef(cfg.host)} (password: the QA_PASSWORD you supplied):`);
  for (const a of ACCOUNTS) console.log(`  ${a.email.padEnd(26)} ${a.role}`);
  console.log(`\nRoster: ${ROSTER.length} fictional students; the overall board publishes 4 names.`);

  if (args["credentials-out"]) {
    if (dryRun) {
      console.log(`\nWould write credentials to ${args["credentials-out"]} (mode 0600).`);
    } else {
      const lines = [
        `# QA sign-in accounts for "${QA_SCHOOL_NAME}" on project ${projectRef(cfg.host)}.`,
        `# Written by scripts/qa-school/seed.mjs on ${new Date().toISOString()}. Gitignored (.env.qa*). Never commit.`,
        `QA_PASSWORD=${cfg.password}`,
        ...ACCOUNTS.map((a) => `QA_${a.key.toUpperCase()}_EMAIL=${a.email}`),
      ];
      const path = writeCredentialsFile(args["credentials-out"], lines);
      console.log(`\nWrote credentials to ${path} (mode 0600).`);
    }
  }
}

main().catch((e) => {
  console.error(`\nFAILED: ${e.message}`);
  console.error("Nothing outside the QA school was touched. Re-run to finish, or run teardown.mjs.");
  process.exit(1);
});
