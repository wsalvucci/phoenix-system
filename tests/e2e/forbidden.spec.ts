// Routes a role must not be able to use. A refusal is a redirect, a sign-in prompt, or a page with none of
// the protected data. The data check matters most: a spinner or an error is acceptable, a leak is not.
import { test, expect, type Page } from "@playwright/test";
import { authFile, settle } from "./helpers";

const ADMIN_DATA = /Example Academy|Sample Prep|Total Students|Top Performers|Ada Sample|Manage School/;
const TEACHER_DATA = /Homeroom A|Homeroom B|Math Club|Houses|Example, Dev|Placeholder, Cora/;
const SCHOOL_1_PEOPLE = /Ada Sample|Ben Testcase|Gus Placeholder|Dev Example/;
/** Same, without the seed student's own name, for checks made while signed in as that student. */
const OTHER_PEOPLE = /Ada Sample|Ben Testcase|Dev Example|Eli Sample/;

async function visit(page: Page, route: string): Promise<string> {
    await page.goto(route);
    return settle(page);
}

test.describe("student", () => {
    test.use({ storageState: authFile("student") });

    for (const route of ["/admin", "/admin/school/1", "/admin/school/1/students", "/admin/school/1/student/1"]) {
        test(`cannot use ${route}`, async ({ page }) => {
            expect(await visit(page, route)).not.toMatch(ADMIN_DATA);
        });
    }

    for (const route of ["/teacher", "/teacher/group/1", "/teacher/rankingGroup/1"]) {
        test(`cannot use ${route}`, async ({ page }) => {
            expect(await visit(page, route)).not.toMatch(TEACHER_DATA);
        });
    }

    test("is sent home from the staff dashboards", async ({ page }) => {
        for (const route of ["/dashboard", "/dashboard/global?school=1", "/dashboard/featured?school=1", "/dashboard/mobile?school=1", "/dashboard/topCards?school=1"]) {
            await page.goto(route);
            await page.waitForURL((u) => !u.pathname.startsWith("/dashboard"));
            const text = await settle(page);
            expect(text, route).not.toMatch(OTHER_PEOPLE);
        }
    });

    test("cannot pair a display", async ({ page }) => {
        const text = await visit(page, "/display/pair?school=1");
        expect(text).not.toContain("Pair a display for Example Academy");
    });

    test("cannot open the parent page of a child they are not the parent of", async ({ page }) => {
        const text = await visit(page, "/parent/7");
        expect(text).not.toMatch(/Gus's group leaders|Where Gus stands/);
    });
});

test.describe("parent", () => {
    test.use({ storageState: authFile("parent") });

    test("cannot open a child that is not linked to them", async ({ page }) => {
        await page.goto("/parent/8");
        await page.waitForURL((u) => !u.pathname.startsWith("/parent/8"));
        expect(await settle(page)).not.toMatch(/Hana Example/);
    });

    test("cannot open a child of another school", async ({ page }) => {
        const text = await visit(page, "/parent/41");
        expect(text).not.toMatch(/Una Sample/);
    });

    test("cannot use staff routes or dashboards", async ({ page }) => {
        expect(await visit(page, "/admin")).not.toMatch(ADMIN_DATA);
        expect(await visit(page, "/teacher")).not.toMatch(TEACHER_DATA);
        await page.goto("/dashboard/global?school=1");
        await page.waitForURL((u) => !u.pathname.startsWith("/dashboard"));
    });
});

test.describe("teacher", () => {
    test.use({ storageState: authFile("teacher1") });

    for (const route of ["/admin", "/admin/school/1", "/admin/school/1/students", "/admin/school/1/teachers"]) {
        test(`cannot use admin route ${route}`, async ({ page }) => {
            expect(await visit(page, route)).not.toMatch(ADMIN_DATA);
        });
    }

    test("cannot open another teacher's group scorebook", async ({ page }) => {
        const text = await visit(page, "/teacher/group/2");
        expect(text).not.toMatch(/Homeroom B/);
        expect(text).not.toContain("Example, Uma");
    });

    test("cannot open a group of another school", async ({ page }) => {
        const text = await visit(page, "/teacher/group/5");
        expect(text).not.toMatch(/Sample Homeroom|Sample, /);
    });

    test("dashboard falls back to their own school, never another", async ({ page }) => {
        await page.goto("/dashboard?school=2");
        const text = await settle(page);
        expect(text).toContain("Example Academy");
        expect(text).not.toContain("Sample Prep");
    });
});

test.describe("second teacher", () => {
    test.use({ storageState: authFile("teacher2") });

    test("cannot open the first teacher's scorebook", async ({ page }) => {
        const text = await visit(page, "/teacher/group/1");
        expect(text).not.toMatch(/Example, Dev|Kindness A week 1/);
    });
});

test.describe("admin of another school", () => {
    test.use({ storageState: authFile("admin2") });

    test("sees only their own school in the list", async ({ page }) => {
        const text = await visit(page, "/admin");
        expect(text).toContain("Sample Prep");
        expect(text).not.toContain("Example Academy");
    });

    for (const sub of ["", "/students", "/teachers", "/groups", "/pointGroups", "/timeframes", "/displays"]) {
        test(`cannot read school 1 at /admin/school/1${sub}`, async ({ page }) => {
            const text = await visit(page, `/admin/school/1${sub}`);
            expect(text).not.toMatch(SCHOOL_1_PEOPLE);
            expect(text).not.toMatch(/Homeroom A|Homeroom B|Math Club|Example Academy - Admin Dashboard/);
        });
    }

    test("cannot read a school 1 student page", async ({ page }) => {
        const text = await visit(page, "/admin/school/1/student/1");
        expect(text).not.toMatch(/Ada Sample/);
    });

    test("dashboard shows only their own school even when asked for school 1", async ({ page }) => {
        await page.goto("/dashboard/global?school=1");
        const text = await settle(page);
        expect(text).not.toMatch(SCHOOL_1_PEOPLE);
    });

    test("cannot pair a display for school 1", async ({ page }) => {
        const text = await visit(page, "/display/pair?school=1");
        expect(text).not.toContain("Pair a display for Example Academy");
    });
});

test.describe("account with no role", () => {
    test.use({ storageState: authFile("newuser") });

    for (const route of ["/admin", "/admin/school/1", "/teacher", "/teacher/group/1", "/parent/7", "/dashboard/global?school=1"]) {
        test(`cannot use ${route}`, async ({ page }) => {
            const text = await visit(page, route);
            expect(text).not.toMatch(ADMIN_DATA);
            expect(text).not.toMatch(TEACHER_DATA);
            expect(text).not.toMatch(SCHOOL_1_PEOPLE);
        });
    }
});
