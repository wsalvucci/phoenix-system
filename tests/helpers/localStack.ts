// Shared by the RLS tests (vitest) and the Playwright suite. Loads .env.test.local, which is written by
// `npm run test:env` from the LOCAL Supabase stack, and refuses to run against anything that is not local.
import { config } from "dotenv";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

config({ path: resolve(__dirname, "../../.env.test.local"), override: true });

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const PASSWORD = process.env.E2E_PASSWORD ?? "Passw0rd!test";

export function assertLocalStack(): void {
    let host = "";
    try {
        host = new URL(SUPABASE_URL).hostname;
    } catch {
        // fall through
    }
    if (!ANON_KEY || !SERVICE_KEY || !["127.0.0.1", "localhost"].includes(host)) {
        throw new Error(
            `Refusing to run: NEXT_PUBLIC_SUPABASE_URL must be a local stack (got "${SUPABASE_URL}"). ` +
                "Start it with `supabase start`, then run `npm run test:env`.",
        );
    }
}

/** Fictional seed accounts (supabase/seed.sql). All share PASSWORD. */
export const ACCOUNTS = {
    admin: "admin@example.test",
    admin2: "admin2@example.test",
    teacher1: "teacher1@example.test",
    teacher2: "teacher2@example.test",
    student: "student@example.test",
    leader: "leader@example.test",
    ta: "ta@example.test",
    zero: "zero@example.test",
    parent: "parent@example.test",
    newuser: "newuser@example.test",
    logout: "logout@example.test",
} as const;
export type Role = keyof typeof ACCOUNTS;

export function anonClient(): SupabaseClient {
    assertLocalStack();
    return createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** A client signed in as one seed account, using the anon key exactly like the cookie client in the app. */
export async function signedIn(role: Role): Promise<SupabaseClient> {
    const client = anonClient();
    const { error } = await client.auth.signInWithPassword({ email: ACCOUNTS[role], password: PASSWORD });
    if (error) throw new Error(`sign-in as ${role} failed: ${error.message}`);
    return client;
}

/** Service-role client, for reading ground truth in tests only. */
export function serviceClient(): SupabaseClient {
    assertLocalStack();
    return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
