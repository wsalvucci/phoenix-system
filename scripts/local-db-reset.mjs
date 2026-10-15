// Resets the LOCAL Supabase database (migrations + supabase/seed.sql) after confirming that the stack
// being reset answers on localhost. Never passes --linked, --db-url or a project ref.
import { execFileSync, spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

let raw;
try {
  raw = execFileSync("supabase", ["status", "-o", "env"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
} catch {
  console.error("The local Supabase stack is not running. Start it with: supabase start");
  process.exit(1);
}
const dbUrl = raw.match(/^DB_URL="?(.*?)"?$/m)?.[1];
let host = "";
try {
  host = new URL(dbUrl).hostname;
} catch {
  // fall through
}
if (!["127.0.0.1", "localhost"].includes(host)) {
  console.error(`Refusing to reset: DB_URL is not local (${dbUrl}).`);
  process.exit(1);
}

const reset = spawnSync("supabase", ["db", "reset"], { cwd: root, stdio: "inherit" });
if (reset.status !== 0) process.exit(reset.status ?? 1);
const env = spawnSync("node", ["scripts/test-env.mjs"], { cwd: root, stdio: "inherit" });
process.exit(env.status ?? 0);
