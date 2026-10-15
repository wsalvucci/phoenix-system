import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";
import { resolve } from "node:path";

// End-to-end suite against `next dev` (default) or `next start` (E2E_SERVER=start, after `npm run build`),
// pointed at the LOCAL Supabase stack. Environment comes from .env.test.local (npm run test:env) and is
// passed explicitly to the server, so a production .env.local can never leak in.
config({ path: resolve(__dirname, ".env.test.local"), override: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
let host = "";
try {
    host = new URL(supabaseUrl).hostname;
} catch {
    // handled below
}
if (!["127.0.0.1", "localhost"].includes(host) || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
        `Refusing to run e2e: NEXT_PUBLIC_SUPABASE_URL must be the local stack (got "${supabaseUrl}"). ` +
            "Run `supabase start` and `npm run test:env` first.",
    );
}

const PORT = Number(process.env.E2E_PORT ?? 3100);
const useBuild = process.env.E2E_SERVER === "start";

export default defineConfig({
    testDir: "./tests/e2e",
    // Tests share one seeded database and a few of them change it (pairing, linking), so run in order.
    fullyParallel: false,
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    timeout: 60_000,
    expect: { timeout: 15_000 },
    reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
    use: {
        baseURL: `http://localhost:${PORT}`,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
    },
    projects: [
        { name: "setup", testMatch: /auth\.setup\.ts/ },
        { name: "chromium", use: { ...devices["Desktop Chrome"] }, dependencies: ["setup"], testIgnore: /auth\.setup\.ts/ },
    ],
    webServer: {
        command: useBuild ? `npx next start -p ${PORT}` : `npx next dev -p ${PORT}`,
        url: `http://localhost:${PORT}/login`,
        // Never adopt a server that is already listening: it could be configured for another database.
        reuseExistingServer: false,
        timeout: 240_000,
        env: {
            ...(process.env as Record<string, string>),
            NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
            SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
            LINK_RATE_LIMIT_SECRET: process.env.LINK_RATE_LIMIT_SECRET ?? "",
            NEXT_TELEMETRY_DISABLED: "1",
        },
    },
});
