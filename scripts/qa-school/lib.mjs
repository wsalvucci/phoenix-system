// Shared helpers for scripts/qa-school/seed.mjs and teardown.mjs. See docs/TESTING.md, "Hosted QA accounts".
//
// Safety model:
//   * Configuration only from QA_* environment variables, optionally loaded from an explicit --env-file.
//     Nothing reads .env.local or any other file implicitly.
//   * Every run prints the target project ref first and needs --confirm-school with the exact school name.
//   * The only school either script will touch is the one named exactly QA_SCHOOL_NAME, and there must be
//     at most one of it.
//   * The only auth users either script creates, changes or deletes match QA_EMAIL_PATTERN.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, chmodSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

export const QA_SCHOOL_NAME = "QA Test School (not real)";
export const QA_EMAIL_DOMAIN = "@example.test";
// qa-<anything>@example.test. example.test is a reserved TLD (RFC 2606), so no real person has one.
export const QA_EMAIL_PATTERN = /^qa-[a-z0-9.-]+@example\.test$/;

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function fail(message) {
  console.error(`\nREFUSING: ${message}`);
  process.exit(1);
}

/** Minimal --flag value / --flag parser. Unknown flags are an error so a typo never means "no safety". */
export function parseArgs(argv, { values = [], booleans = [] }) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const eq = arg.indexOf("=");
    const name = eq > -1 ? arg.slice(0, eq) : arg;
    if (booleans.includes(name)) {
      if (eq > -1) fail(`${name} takes no value`);
      out[name.slice(2)] = true;
    } else if (values.includes(name)) {
      const value = eq > -1 ? arg.slice(eq + 1) : argv[++i];
      if (value === undefined || value.startsWith("--")) fail(`${name} needs a value`);
      out[name.slice(2)] = value;
    } else {
      fail(`unknown argument ${arg}`);
    }
  }
  return out;
}

/** Loads KEY=VALUE lines from an explicitly named file into process.env (already-set variables win). */
export function loadEnvFile(path) {
  let text;
  try {
    text = readFileSync(resolve(path), "utf8");
  } catch (e) {
    fail(`cannot read --env-file ${path}: ${e.message}`);
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}

/** Reads and checks QA_SUPABASE_URL, QA_SUPABASE_SERVICE_ROLE_KEY and (optionally) QA_PASSWORD. */
export function readConfig({ needPassword }) {
  const url = process.env.QA_SUPABASE_URL;
  const key = process.env.QA_SUPABASE_SERVICE_ROLE_KEY;
  const password = process.env.QA_PASSWORD;
  if (!url) fail("QA_SUPABASE_URL is not set");
  if (!key) fail("QA_SUPABASE_SERVICE_ROLE_KEY is not set");
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    fail(`QA_SUPABASE_URL is not a URL`);
  }
  if (needPassword) {
    if (!password) fail("QA_PASSWORD is not set");
    if (password.length < 12) fail("QA_PASSWORD must be at least 12 characters");
    if (password === "Passw0rd!test") fail("QA_PASSWORD must not be the public local-seed password");
  }
  return { url, key, password, host: parsed.hostname };
}

/** "abcd1234" for https://abcd1234.supabase.co, "LOCAL (127.0.0.1)" for a local stack. */
export function projectRef(host) {
  if (["127.0.0.1", "localhost", "::1"].includes(host)) return `LOCAL (${host})`;
  const m = host.match(/^([a-z0-9]+)\.supabase\.(co|in)$/);
  return m ? m[1] : `unknown (host ${host})`;
}

export function banner(scriptName, cfg, { dryRun }) {
  console.log(`${scriptName}${dryRun ? " (dry run: no writes)" : ""}`);
  console.log(`  Target project ref: ${projectRef(cfg.host)}`);
  console.log(`  Target URL host:    ${cfg.host}`);
  console.log(`  School:             "${QA_SCHOOL_NAME}"`);
  console.log("");
}

export function requireConfirm(args) {
  if (args["confirm-school"] === undefined) {
    fail(`pass --confirm-school "${QA_SCHOOL_NAME}" to confirm the target school`);
  }
  if (args["confirm-school"] !== QA_SCHOOL_NAME) {
    fail(`--confirm-school "${args["confirm-school"]}" does not match "${QA_SCHOOL_NAME}"; only that school may be touched`);
  }
}

export function serviceClient(cfg) {
  // Service role on purpose: creating auth users and writing rows across a whole school is an
  // operator task with no signed-in caller. RLS denies everything to the API roles (D25), and this
  // key never leaves the operator's shell. It is never printed.
  return createClient(cfg.url, cfg.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** Throws on a PostgREST error, returns data. */
export function must({ data, error }, what) {
  if (error) throw new Error(`${what}: ${error.message}${error.details ? ` (${error.details})` : ""}`);
  return data;
}

/** Finds the QA school. Returns null if absent, refuses if ambiguous or if the name check fails. */
export async function findQaSchool(db) {
  const rows = must(await db.from("school").select("id, name").eq("name", QA_SCHOOL_NAME), "look up QA school");
  if (rows.length > 1) {
    fail(`${rows.length} schools are named "${QA_SCHOOL_NAME}" (ids ${rows.map((r) => r.id).join(", ")}); resolve by hand`);
  }
  if (rows.length === 0) return null;
  assertQaSchoolRow(rows[0]);
  return rows[0];
}

/** Re-reads a school by id and refuses unless it is still exactly the QA school. */
export async function reverifySchool(db, schoolId) {
  const row = must(await db.from("school").select("id, name").eq("id", schoolId).maybeSingle(), "re-verify school");
  if (!row) fail(`school ${schoolId} disappeared during the run`);
  assertQaSchoolRow(row);
}

function assertQaSchoolRow(row) {
  if (row.name !== QA_SCHOOL_NAME) fail(`school ${row.id} is named "${row.name}", not "${QA_SCHOOL_NAME}"`);
}

/** Every auth user whose e-mail matches QA_EMAIL_PATTERN, keyed by lower-case e-mail. Paginates. */
export async function listQaAuthUsers(db) {
  const found = new Map();
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`list auth users: ${error.message}`);
    for (const u of data.users) {
      const email = (u.email ?? "").toLowerCase();
      if (QA_EMAIL_PATTERN.test(email)) found.set(email, u);
    }
    if (data.users.length < 1000) break;
  }
  return found;
}

/**
 * Writes the credentials file with mode 0600. Refuses a path inside the repository that git would not
 * ignore, so the password cannot be committed by accident.
 */
export function checkCredentialsPath(path) {
  const abs = resolve(path);
  if (abs.startsWith(REPO_ROOT + "/")) {
    try {
      execFileSync("git", ["check-ignore", "-q", abs], { cwd: REPO_ROOT, stdio: "ignore" });
    } catch {
      fail(`--credentials-out ${path} is inside the repository and not gitignored; use a .env.qa* name or a path outside the repo`);
    }
  }
  return abs;
}

export function writeCredentialsFile(path, lines) {
  const abs = checkCredentialsPath(path);
  writeFileSync(abs, lines.join("\n") + "\n", { mode: 0o600 });
  chmodSync(abs, 0o600);
  return abs;
}
