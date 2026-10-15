import type { Page, ConsoleMessage, Response } from "@playwright/test";
import { ACCOUNTS, PASSWORD, type Role } from "../helpers/localStack";

export const ROLES = Object.keys(ACCOUNTS) as Role[];
export const authFile = (role: Role) => `tests/e2e/.auth/${role}.json`;

/** Signs in through the real form. */
export async function loginAs(page: Page, role: Role, next?: string): Promise<void> {
    await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
    await page.getByLabel("Email").fill(ACCOUNTS[role]);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 60_000 });
}

/** Text that means the database refused a query or the server fell over. */
export const RLS_ERROR = /permission denied|row-level security|violates row-level|42501|PGRST\d+|JWT expired|Internal Server Error|Application error/i;

export type Problems = { console: string[]; pageErrors: string[]; badResponses: string[] };

/** Collects errors while a page loads. Call before navigating. */
export function watchProblems(page: Page): Problems {
    const problems: Problems = { console: [], pageErrors: [], badResponses: [] };
    page.on("console", (msg: ConsoleMessage) => {
        if (msg.type() !== "error") return;
        const text = msg.text();
        // Failed resource loads are reported through badResponses; the console line carries no detail.
        if (/Failed to load resource/i.test(text)) return;
        problems.console.push(text);
    });
    page.on("pageerror", (err) => problems.pageErrors.push(err.message));
    page.on("response", (res: Response) => {
        if (res.status() >= 500) problems.badResponses.push(`${res.status()} ${res.request().method()} ${res.url()}`);
    });
    return problems;
}

/** Waits until the network is quiet, then returns the visible text. */
export async function settle(page: Page): Promise<string> {
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);
    return (await page.locator("body").innerText()).trim();
}
