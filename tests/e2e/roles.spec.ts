// Each role's main screens must load, show that role's own data, and raise no database or server errors.
// Signed in through stored sessions from auth.setup.ts.
import { test, expect, type Page } from "@playwright/test";
import { authFile, RLS_ERROR, settle, watchProblems } from "./helpers";
import type { Role } from "../helpers/localStack";

/** Opens a route as the current session and fails on page errors, server 5xx and RLS-looking text. */
async function openClean(page: Page, route: string, opts: { allow5xx?: boolean } = {}): Promise<string> {
    const problems = watchProblems(page);
    await page.goto(route);
    const text = await settle(page);
    expect(problems.pageErrors, `page errors on ${route}`).toEqual([]);
    // The home page probes every role loader and the ones that do not apply answer 500 (docs/TESTING.md, finding 3).
    if (!opts.allow5xx) expect(problems.badResponses, `5xx responses on ${route}`).toEqual([]);
    expect(text, `error text on ${route}`).not.toMatch(RLS_ERROR);
    return text;
}

test.describe("admin", () => {
    test.use({ storageState: authFile("admin") });

    test("schools list shows their school and its counts", async ({ page }) => {
        const text = await openClean(page, "/admin");
        expect(text).toContain("Example Academy");
        expect(text).not.toContain("Sample Prep");
        expect(text).toMatch(/Students\s*40/);
    });

    test("school home loads students, groups and top performers", async ({ page }) => {
        const text = await openClean(page, "/admin/school/1");
        expect(text).toContain("Example Academy - Admin Dashboard");
        expect(text).toMatch(/Total Students\s*40/);
        expect(text).toContain("Ada Sample");
        for (const group of ["Homeroom A", "Homeroom B", "Math Club"]) expect(text).toContain(group);
    });

    for (const sub of ["students", "teachers", "groups", "pointGroups", "rankingGroups", "timeframes", "displays"]) {
        test(`school section /${sub} loads without errors`, async ({ page }) => {
            const text = await openClean(page, `/admin/school/1/${sub}`);
            expect(text).toContain("School Administration");
        });
    }

    test("dashboard hub and pairing page load", async ({ page }) => {
        expect(await openClean(page, "/dashboard")).toContain("Rotating highlights");
        expect(await openClean(page, "/display/pair?school=1")).toContain("Pair a display for Example Academy");
    });
});

test.describe("teacher", () => {
    test.use({ storageState: authFile("teacher1") });

    test("home lists only their own groups", async ({ page }) => {
        const text = await openClean(page, "/teacher");
        expect(text).toContain("Tara Teacher");
        expect(text).toContain("Homeroom A");
        expect(text).toContain("Math Club");
        expect(text).not.toContain("Homeroom B");
        expect(text).not.toContain("Sample Homeroom");
    });

    test("scorebook shows the students of their group with points", async ({ page }) => {
        const text = await openClean(page, "/teacher/group/1");
        expect(text).toContain("Homeroom A");
        expect(text).toContain("Example, Dev");
        expect(text).toContain("Kindness A week 1");
        // Students of Homeroom B are not in this scorebook.
        expect(text).not.toContain("Example, Uma");
    });

    test("can open the dashboard hub for their school", async ({ page }) => {
        expect(await openClean(page, "/dashboard")).toContain("Example Academy");
    });
});

test.describe("second teacher", () => {
    test.use({ storageState: authFile("teacher2") });

    test("sees Homeroom B and not Homeroom A", async ({ page }) => {
        const text = await openClean(page, "/teacher");
        expect(text).toContain("Homeroom B");
        expect(text).not.toContain("Homeroom A");
    });
});

test.describe("student", () => {
    test.use({ storageState: authFile("student") });

    test("sees their own points, standing and shares", async ({ page }) => {
        const text = await openClean(page, "/student");
        expect(text).toContain("Gus Placeholder");
        expect(text).toMatch(/YOUR POINTS[\s\S]*70/);
        expect(text).toMatch(/7th of 36 students/);
        expect(text).toContain("Recent points");
        expect(text).toContain("Kindness A week 1");
    });

    test("is told that a parent is linked, and which group leader sees their letters", async ({ page }) => {
        const text = await openClean(page, "/student");
        expect(text).toMatch(/A parent account was linked on/);
        expect(text).toMatch(/Theo E\., who leads Homeroom A/);
    });

    test("sees gaps to the next rank as numbers, with no names", async ({ page }) => {
        const text = await openClean(page, "/student");
        expect(text).toMatch(/10 points to move up/);
        // The students just above (Eli, Fay at 80) must not be named anywhere on the page.
        expect(text).not.toMatch(/Eli Sample|Fay Testcase/);
    });

    test("other students' names appear only inside the published cut", async ({ page }) => {
        const text = await openClean(page, "/student");
        // Zero-point students are never named to a peer.
        for (const name of ["Mona Placeholder", "Nico Example", "Leo Testcase", "Kira Sample"]) expect(text).not.toContain(name);
    });

    test("can open the link screens", async ({ page }) => {
        expect(await openClean(page, "/linkAccount/student")).toContain("Connect your student account");
    });
});

test.describe("group leader", () => {
    test.use({ storageState: authFile("leader") });

    test("sees the letter grades of the group they lead", async ({ page }) => {
        const text = await openClean(page, "/student");
        expect(text).toContain("Groups you lead");
        expect(text).toContain("Homeroom A");
        expect(text).toMatch(/Dev Example\s+S/);
        expect(text).toMatch(/Effort: Not shown for this group/);
        // Letters, not points: the member rows carry no point totals.
        expect(text).not.toMatch(/Dev Example\s+\d/);
    });
});

test.describe("teaching assistant", () => {
    test.use({ storageState: authFile("ta") });

    test("sees the scorebooks they help with", async ({ page }) => {
        const text = await openClean(page, "/student");
        expect(text).toContain("Scorebooks you help with");
        expect(text).toContain("Homeroom A");
    });
});

test.describe("student with no points", () => {
    test.use({ storageState: authFile("zero") });

    test("is shown as not ranked yet, not as last", async ({ page }) => {
        const text = await openClean(page, "/student");
        expect(text).toContain("Not ranked yet");
        expect(text).not.toMatch(/\d+(st|nd|rd|th) of \d+ students/);
    });
});

test.describe("parent", () => {
    test.use({ storageState: authFile("parent") });

    test("lists the linked child and opens their page", async ({ page }) => {
        const list = await openClean(page, "/parent");
        expect(list).toContain("Gus Placeholder");
        const child = await openClean(page, "/parent/7");
        expect(child).toContain("Gus Placeholder");
        expect(child).toMatch(/70\s*points/);
        expect(child).toContain("Recent points");
    });
});

test.describe("account with no role yet", () => {
    test.use({ storageState: authFile("newuser") });

    test("is offered the link screens, and sees no data", async ({ page }) => {
        const home = await openClean(page, "/");
        expect(home).toMatch(/Who is using Phoenix\?|student|parent/i);
        const student = await openClean(page, "/student");
        expect(student).toContain("Connect your student account");
        const parent = await openClean(page, "/parent");
        expect(parent).toContain("Connect my child");
    });
});

test.describe("home page for every signed-in role", () => {
    const expectations: Array<[Role, RegExp]> = [
        ["admin", /Administration/],
        ["teacher1", /Teacher dashboard/],
        ["student", /See my points/],
        ["parent", /child|Your children|See/i],
    ];
    for (const [role, pattern] of expectations) {
        test(`${role} sees their destinations`, async ({ browser }) => {
            const context = await browser.newContext({ storageState: authFile(role) });
            const page = await context.newPage();
            const problems = watchProblems(page);
            await page.goto("/");
            await expect(page.locator("body")).toContainText(pattern, { timeout: 30_000 });
            await settle(page);
            // The home page used to call every role loader and log a 500 for each role the user lacks.
            expect(problems.badResponses).toEqual([]);
            await context.close();
        });
    }
});
