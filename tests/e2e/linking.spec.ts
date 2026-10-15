// Account linking through the real forms: uniform failure, rate limit, and a successful link.
// These tests change the seeded data and restore it afterwards.
import { test, expect, type Page } from "@playwright/test";
import { authFile, settle } from "./helpers";
import { serviceClient } from "../helpers/localStack";
import { LINK_NO_MATCH_MESSAGE, LINK_RATE_LIMITED_MESSAGE } from "../../lib/linkCode";

const db = serviceClient();

async function restore() {
    await db.from("link_attempt").delete().not("id", "is", null);
    await db.from("student").update({ linkedUser: null }).in("id", [39]);
    await db.from("teacher").update({ linked_user: null }).eq("id", 3);
    const { data: parent } = await db.from("user").select("id").eq("supabase_id", "00000000-0000-4000-8000-000000000009").single();
    if (parent) await db.from("user_student_pair").delete().eq("user_id", parent.id).eq("student_id", 40);
}

async function submit(page: Page, kind: "student" | "parent" | "teacher", school: string, code: string) {
    await page.goto(`/linkAccount/${kind}`);
    await page.getByLabel("Code from your school").fill(code);
    await page.getByLabel("School number").fill(school);
    await page.getByRole("button", { name: /Connect/ }).click();
}

test.describe.serial("linking", () => {
    test.beforeAll(restore);
    test.afterAll(restore);

    test.describe("student account", () => {
        test.use({ storageState: authFile("newuser") });

        test("a wrong code, a wrong school and an empty match all give the same answer", async ({ page }) => {
            const seen = new Set<string>();
            for (const [school, code] of [["1", "NOPE000000"], ["2", "STUD39ABCD"], ["1", "ZZZZZZZZZZ"]]) {
                await submit(page, "student", school, code);
                const alert = page.locator("form [role=alert]");
                await expect(alert).toBeVisible();
                seen.add((await alert.innerText()).split(" Check for look-alike")[0]);
            }
            expect([...seen]).toEqual([LINK_NO_MATCH_MESSAGE]);
        });

        test("the right code links the account and shows the student", async ({ page }) => {
            await db.from("link_attempt").delete().not("id", "is", null);
            await submit(page, "student", "1", "stud-39 abcd");
            await page.waitForURL(/\/student$/, { timeout: 30_000 });
            const text = await settle(page);
            expect(text).toContain("Mona Placeholder");
            const { data } = await db.from("student").select("linkedUser").eq("id", 39).single();
            expect(data?.linkedUser).not.toBeNull();
        });

        test("a code that is already linked looks like any other miss", async ({ browser }) => {
            const ctx = await browser.newContext({ storageState: authFile("parent") });
            const page = await ctx.newPage();
            await submit(page, "student", "1", "STUD39ABCD");
            await expect(page.locator("form [role=alert]")).toContainText(LINK_NO_MATCH_MESSAGE);
            await ctx.close();
        });
    });

    test.describe("parent account", () => {
        test.use({ storageState: authFile("parent") });

        test("five misses lock the account out, even for the right code", async ({ page }) => {
            await db.from("link_attempt").delete().not("id", "is", null);
            for (let i = 0; i < 5; i++) {
                await submit(page, "parent", "1", `WRONG0000${i}`);
                await expect(page.locator("form [role=alert]")).toContainText(LINK_NO_MATCH_MESSAGE);
            }
            await submit(page, "parent", "1", "PARENT7K3M");
            await expect(page.locator("form [role=alert]")).toContainText(LINK_RATE_LIMITED_MESSAGE);
            const { count } = await db.from("user_student_pair").select("*", { count: "exact", head: true }).eq("student_id", 40);
            expect(count).toBe(0);
        });

        test("after the lockout is cleared the right code links the child", async ({ page }) => {
            await db.from("link_attempt").delete().not("id", "is", null);
            await submit(page, "parent", "1", "PARENT7K3M");
            await page.waitForURL(/\/parent$/, { timeout: 30_000 });
            await expect(page.locator("body")).toContainText("Nico Example", { timeout: 30_000 });
        });
    });

    test.describe("teacher account", () => {
        test.use({ storageState: authFile("newuser") });

        test("a teacher code links a teacher", async ({ page }) => {
            await db.from("link_attempt").delete().not("id", "is", null);
            await submit(page, "teacher", "1", "TCH3CDE777");
            await page.waitForURL(/\/teacher$/, { timeout: 30_000 });
            await expect(page.locator("body")).toContainText("Una Unlinked", { timeout: 30_000 });
        });
    });
});
