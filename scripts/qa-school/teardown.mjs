#!/usr/bin/env node
// Removes "QA Test School (not real)" and the qa-*@example.test accounts from the Supabase project
// named by QA_SUPABASE_URL. Deletes ONLY:
//   * rows whose school is the QA school (found by exact name, at most one), and rows that hang off
//     those rows (scores, group memberships, pairs, shares, devices, letters);
//   * auth users whose e-mail matches qa-*@example.test and whose account holds no role outside the
//     QA school (any that do are reported and kept);
//   * admin rows used only by those accounts and paired only with the QA school.
// Idempotent: a second run finds nothing and deletes nothing.
//
// Usage (see docs/TESTING.md, "Hosted QA accounts"):
//   node scripts/qa-school/teardown.mjs --env-file .env.qa --confirm-school "QA Test School (not real)" [--dry-run]
import {
  QA_SCHOOL_NAME, QA_EMAIL_PATTERN, parseArgs, loadEnvFile, readConfig, banner, requireConfirm,
  serviceClient, must, findQaSchool, reverifySchool, listQaAuthUsers,
} from "./lib.mjs";

const args = parseArgs(process.argv.slice(2), { values: ["--env-file", "--confirm-school"], booleans: ["--dry-run"] });
if (args["env-file"]) loadEnvFile(args["env-file"]);
const cfg = readConfig({ needPassword: false });
const dryRun = Boolean(args["dry-run"]);
banner("QA school teardown", cfg, { dryRun });
requireConfirm(args);

const db = serviceClient(cfg);
const ids = (rows, col = "id") => [...new Set(rows.map((r) => r[col]))];
const CHUNK = 200;

async function selectIn(table, columns, col, values) {
  const out = [];
  for (let i = 0; i < values.length; i += CHUNK) {
    out.push(...must(await db.from(table).select(columns).in(col, values.slice(i, i + CHUNK)), `read ${table}`));
  }
  return out;
}

/** Deletes rows of `table` where `col` is in `values`, after re-verifying the school. Prints a count. */
async function deleteIn(table, col, values, schoolId, what) {
  if (values.length === 0) return;
  if (dryRun) {
    console.log(`  would delete ${what ?? table} (${col} in ${values.length} id(s))`);
    return;
  }
  await reverifySchool(db, schoolId);
  let n = 0;
  for (let i = 0; i < values.length; i += CHUNK) {
    const { count, error } = await db.from(table).delete({ count: "exact" }).in(col, values.slice(i, i + CHUNK));
    if (error) throw new Error(`delete ${table}: ${error.message}`);
    n += count ?? 0;
  }
  console.log(`  deleted ${n} ${what ?? table} row(s)`);
}

async function main() {
  const school = await findQaSchool(db);
  const qaAuth = await listQaAuthUsers(db);
  if (!school && qaAuth.size === 0) {
    console.log(`Nothing to do: no school named "${QA_SCHOOL_NAME}" and no qa-*@example.test accounts.`);
    return;
  }

  const S = school?.id ?? null;
  const studentIds = S ? ids(must(await db.from("student").select("id").eq("school_id", S), "students")) : [];
  const teacherIds = S ? ids(must(await db.from("teacher").select("id").eq("school_id", S), "teachers")) : [];
  const groupIds = S ? ids(must(await db.from("student_group").select("id").eq("school_id", S), "groups")) : [];
  const adminPairs = S ? must(await db.from("admin_school_pair").select("admin_id").eq("school_id", S), "admin pairs") : [];

  // Which qa-* accounts are safe to delete: none of their roles may point outside the QA school.
  const userRows = qaAuth.size
    ? await selectIn("user", "id, supabase_id, admin_id", "supabase_id", [...qaAuth.values()].map((u) => u.id))
    : [];
  const deletable = [];
  for (const [email, au] of qaAuth) {
    if (!QA_EMAIL_PATTERN.test(email)) continue; // listQaAuthUsers already filters; belt and braces
    const ur = userRows.find((r) => r.supabase_id === au.id);
    const outside = [];
    if (ur) {
      if (ur.admin_id !== null) {
        const p = must(await db.from("admin_school_pair").select("school_id").eq("admin_id", ur.admin_id), "admin schools");
        if (p.some((x) => x.school_id !== S)) outside.push("admin elsewhere");
      }
      const t = must(await db.from("teacher").select("school_id").eq("linked_user", ur.id), "teacher links");
      if (t.some((x) => x.school_id !== S)) outside.push("teacher elsewhere");
      const s = must(await db.from("student").select("school_id").eq("linkedUser", ur.id), "student links");
      if (s.some((x) => x.school_id !== S)) outside.push("student elsewhere");
      const k = must(await db.from("user_student_pair").select("student:student_id (school_id)").eq("user_id", ur.id), "parent links");
      if (k.some((x) => x.student?.school_id !== S)) outside.push("parent of a student elsewhere");
    }
    if (outside.length) console.log(`  KEEPING ${email}: ${outside.join(", ")}. Unlink it by hand if it should go.`);
    else deletable.push({ email, authId: au.id, user: ur ?? null });
  }

  // Admin rows that only the deletable QA accounts use and that are paired with no other school.
  const deletableUserIds = new Set(deletable.map((d) => d.user?.id).filter(Boolean));
  const candidateAdmins = ids([...adminPairs, ...deletable.filter((d) => d.user?.admin_id != null).map((d) => ({ admin_id: d.user.admin_id }))], "admin_id");
  const adminIds = [];
  for (const a of candidateAdmins) {
    const pairs = must(await db.from("admin_school_pair").select("school_id").eq("admin_id", a), "admin pairs");
    const holders = must(await db.from("user").select("id").eq("admin_id", a), "admin holders");
    if (pairs.every((p) => p.school_id === S) && holders.every((h) => deletableUserIds.has(h.id))) adminIds.push(a);
    else console.log(`  keeping admin ${a}: used outside the QA school or by a non-QA account (its QA school pair still goes)`);
  }

  console.log(school ? `School ${S} "${QA_SCHOOL_NAME}":` : `No school named "${QA_SCHOOL_NAME}".`);
  console.log(`  ${studentIds.length} students, ${teacherIds.length} teachers, ${groupIds.length} groups`);
  console.log(`  ${deletable.length} qa-*@example.test account(s) to delete: ${deletable.map((d) => d.email).join(", ") || "none"}`);
  console.log("");

  if (S !== null) {
    // Children first, so no ON DELETE SET NULL lands on a NOT NULL column (student, teacher and class
    // all reference school that way) and no RESTRICT (scorebook copy log) blocks the run.
    await deleteIn("scorebook_event_copy_operation", "student_group_id", groupIds, S, "scorebook copy log");
    await deleteIn("leader_letter_run", "school_id", [S], S, "leader-letter run (and its letters)");
    await deleteIn("display_pairing_request", "approved_school_id", [S], S, "display pairing request");
    await deleteIn("display_device", "school_id", [S], S, "display device");
    // Point events (and their scores, shares and share withdrawals) of the QA groups.
    await deleteIn("point_event", "student_group_id", groupIds, S, "point event (and its scores)");
    // Mobile-model links ("user".student_id has no foreign key) that point at a QA student.
    if (studentIds.length) {
      if (dryRun) console.log(`  would clear "user".student_id where it points at a QA student`);
      else {
        await reverifySchool(db, S);
        for (let i = 0; i < studentIds.length; i += CHUNK) {
          must(await db.from("user").update({ student_id: null }).in("student_id", studentIds.slice(i, i + CHUNK)), "clear user.student_id");
        }
      }
    }
    // Students: cascades their remaining scores, memberships, leader and TA rows, parent links.
    await deleteIn("student", "id", studentIds, S, "student");
    await deleteIn("teacher", "id", teacherIds, S, "teacher");
    await deleteIn("student_group", "id", groupIds, S, "student group (and its templates)");
    const classIds = ids(must(await db.from("class").select("id").eq("school_id", S), "classes"));
    await deleteIn("class", "id", classIds, S, "class");
    // School: cascades admin_school_pair, school_admins, timeframes, ranking groups, point groups.
    await deleteIn("school", "id", [S], S, "school");
  }

  // Accounts last. Deleting the auth user cascades public."user" and link_attempt.
  for (const d of deletable) {
    if (dryRun) {
      console.log(`  would delete auth user ${d.email}`);
      continue;
    }
    if (!QA_EMAIL_PATTERN.test(d.email)) throw new Error(`internal: refusing to delete ${d.email}`);
    const { error } = await db.auth.admin.deleteUser(d.authId);
    if (error) throw new Error(`delete auth user ${d.email}: ${error.message}`);
    console.log(`  deleted auth user ${d.email}`);
  }
  if (adminIds.length) {
    if (dryRun) console.log(`  would delete ${adminIds.length} QA-only admin row(s)`);
    else {
      const { count, error } = await db.from("admin").delete({ count: "exact" }).in("id", adminIds);
      if (error) throw new Error(`delete admin: ${error.message}`);
      console.log(`  deleted ${count ?? 0} admin row(s)`);
    }
  }

  console.log(`\n${dryRun ? "Dry run complete; nothing was deleted." : "Teardown complete."}`);
}

main().catch((e) => {
  console.error(`\nFAILED: ${e.message}`);
  console.error("Only QA rows were touched. Re-run teardown to finish.");
  process.exit(1);
});
