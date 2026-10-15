// Signs in once per seed role through the real login form and saves the session cookies, so the other
// specs start already signed in. The sign-in flow itself is asserted in auth.spec.ts.
import { test as setup, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { ROLES, authFile, loginAs } from "./helpers";

mkdirSync("tests/e2e/.auth", { recursive: true });

for (const role of ROLES) {
    setup(`sign in as ${role}`, async ({ page }) => {
        await loginAs(page, role);
        await expect(page).not.toHaveURL(/\/login/);
        await page.context().storageState({ path: authFile(role) });
    });
}
