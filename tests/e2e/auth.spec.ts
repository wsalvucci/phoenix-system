import { test, expect } from "@playwright/test";
import { ACCOUNTS, PASSWORD } from "../helpers/localStack";
import { ROLES, loginAs, settle } from "./helpers";

// No stored session in this file: every test starts signed out.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("sign-in", () => {
    for (const role of ROLES) {
        test(`${role} can sign in and sees their own address on the home page`, async ({ page }) => {
            await loginAs(page, role);
            await expect(page.getByText(`Hey, ${ACCOUNTS[role]}!`)).toBeVisible();
        });
    }

    test("a wrong password is refused with a plain message", async ({ page }) => {
        await page.goto("/login");
        await page.getByLabel("Email").fill(ACCOUNTS.student);
        await page.getByLabel("Password").fill(PASSWORD + "x");
        await page.getByRole("button", { name: "Sign In" }).click();
        await expect(page.getByText(/email and password do not match/i)).toBeVisible();
        await expect(page).toHaveURL(/\/login/);
    });

    test("an unknown account gets the same message as a wrong password", async ({ page }) => {
        await page.goto("/login");
        await page.getByLabel("Email").fill("nobody@example.test");
        await page.getByLabel("Password").fill(PASSWORD);
        await page.getByRole("button", { name: "Sign In" }).click();
        await expect(page.getByText(/email and password do not match/i)).toBeVisible();
    });

    test("sign-in returns to the page that asked for it", async ({ page }) => {
        await loginAs(page, "admin", "/dashboard");
        await expect(page).toHaveURL(/\/dashboard$/);
    });

    test("sign-in will not redirect to another site", async ({ page }) => {
        await loginAs(page, "student", "https://evil.example/steal");
        expect(new URL(page.url()).origin).toBe(new URL(test.info().project.use.baseURL ?? page.url()).origin);
    });

    test("logging out ends the session", async ({ page }) => {
        // Own account: sign-out revokes every session of the account, which would break the stored ones.
        await loginAs(page, "logout");
        await page.getByRole("button", { name: /logout/i }).click();
        await page.waitForURL(/\/login/);
        await page.goto("/dashboard");
        await expect(page).toHaveURL(/\/login/);
    });
});

test.describe("signed out", () => {
    test("the home page offers sign-in and no data", async ({ page }) => {
        await page.goto("/");
        await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
        const text = await settle(page);
        expect(text).not.toMatch(/Example Academy|Sample Prep|Ada Sample/);
    });

    test("/dashboard sends the visitor to sign in and remembers where they were going", async ({ page }) => {
        await page.goto("/dashboard/global?school=1");
        await expect(page).toHaveURL(/\/login\?next=/);
        expect(decodeURIComponent(page.url())).toContain("/dashboard/global?school=1");
    });

    for (const route of ["/admin", "/admin/school/1", "/teacher", "/teacher/group/1", "/parent", "/parent/7", "/student"]) {
        test(`${route} shows no data to a signed-out visitor`, async ({ page }) => {
            await page.goto(route);
            const text = await settle(page);
            expect(text).not.toMatch(/Example Academy|Sample Prep|Ada Sample|Gus Placeholder|Homeroom A|Top Performers/);
        });
    }

    test("the kiosk pairing screen is reachable without an account", async ({ page }) => {
        await page.goto("/display");
        await expect(page.getByRole("heading", { name: "Pair this screen" })).toBeVisible();
    });

    test("the pairing page for staff asks a signed-out visitor to sign in", async ({ page }) => {
        await page.goto("/display/pair");
        await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
        expect(await settle(page)).not.toMatch(/Example Academy/);
    });
});
