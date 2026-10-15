// Dashboards are the DISPLAY tier (docs/DATA_DISCLOSURE.md): only rows that survive the publication cut,
// never a count, a denominator or an id. Ground truth comes from public.display_cut, called with the
// service role for the admin of school 1.
import { test, expect, type Page } from "@playwright/test";
import { authFile, settle, watchProblems, RLS_ERROR } from "./helpers";
import { serviceClient } from "../helpers/localStack";

type CutRow = { display_rank: number; first_name: string; last_name: string; grade: number; total_points: number };

async function truth() {
    const db = serviceClient();
    const { data: admin } = await db.from("user").select("id").eq("admin_id", 1).single();
    const actor = admin!.id as number;
    const cut = async (kind: string, id: number | null): Promise<CutRow[]> => {
        const { data, error } = await db.rpc("display_cut", {
            p_school_id: 1, p_timeframe_id: 1, p_cohort_kind: kind, p_cohort_id: id, p_actor_user_id: actor,
        });
        if (error) throw new Error(`display_cut(${kind}) failed: ${error.message}`);
        return data as CutRow[];
    };
    const overall = await cut("overall", null);
    const grades = new Map<number, CutRow[]>();
    for (const g of [6, 7, 8, 9]) grades.set(g, await cut("grade", g));
    const groups = new Map<number, CutRow[]>();
    for (const pg of [1, 2]) groups.set(pg, await cut("point_group", pg));

    const name = (r: CutRow) => `${r.first_name} ${r.last_name}`;
    const published = new Set<string>([
        ...overall.map(name),
        ...[...grades.values()].flat().map(name),
        ...[...groups.values()].flat().map(name),
    ]);
    const { data: students } = await db.from("student").select("first_name, last_name").eq("school_id", 1);
    const everyone = (students ?? []).map((s) => `${s.first_name} ${s.last_name}`);
    return { overall, grades, groups, published, hidden: everyone.filter((n) => !published.has(n)), name };
}

/** Collects the body of every server-action response the page receives. */
function captureActions(page: Page): string[] {
    const bodies: string[] = [];
    page.on("response", async (res) => {
        if (res.request().method() !== "POST") return;
        try {
            bodies.push(await res.text());
        } catch {
            // body not available (redirect, aborted)
        }
    });
    return bodies;
}

const COUNT_PATTERNS: Array<[string, RegExp]> = [
    ["an 'of N' denominator", /\bof \d+\b/i],
    ["a student count", /\b\d+\s+students?\b/i],
    ["a ranked count", /\b\d+\s+(ranked|participants|members)\b/i],
    ["a percentile", /percentile|top \d+\s*%/i],
    ["a cohort size", /out of \d+|\bN = \d+/i],
];

const BOARDS = [
    "/dashboard/global?school=1",
    "/dashboard/featured?school=1",
    "/dashboard/mobile?school=1",
];

for (const who of ["admin", "teacher1"] as const) {
    test.describe(`dashboards as ${who}`, () => {
        test.use({ storageState: authFile(who) });

        for (const route of BOARDS) {
            test(`${route} loads without errors`, async ({ page }) => {
                const problems = watchProblems(page);
                await page.goto(route);
                // Wait for real content (a board renders its scene after a server action), not for the network.
                await expect.poll(async () => (await settle(page)).length, { timeout: 30_000 }).toBeGreaterThan(100);
                const text = await settle(page);
                expect(problems.pageErrors).toEqual([]);
                expect(problems.badResponses).toEqual([]);
                expect(text).not.toMatch(RLS_ERROR);
            });

            test(`${route} names only students inside the publication cut`, async ({ page }) => {
                const t = await truth();
                await page.goto(route);
                // Boards rotate and scroll; wait for at least one published name, then read the whole page.
                await expect(page.locator("body")).toContainText(t.name(t.overall[0]), { timeout: 30_000 });
                const text = await settle(page);
                for (const hidden of t.hidden) {
                    expect(text, `${hidden} is outside every cut and must not appear on ${route}`).not.toContain(hidden);
                }
            });

            test(`${route} shows no counts or denominators`, async ({ page }) => {
                await page.goto(route);
                const text = await settle(page);
                for (const [label, pattern] of COUNT_PATTERNS) {
                    expect(text, `${route} must not show ${label}`).not.toMatch(pattern);
                }
            });
        }

        test("the whole-school board lists exactly the overall cut, in rank order, with shared ranks", async ({ page }) => {
            const t = await truth();
            await page.goto("/dashboard/global?school=1");
            await expect(page.locator("body")).toContainText(t.name(t.overall[0]), { timeout: 30_000 });
            const text = await settle(page);
            // Overall board: positions of each name in the page text follow the cut's order.
            const positions = t.overall.map((r) => text.indexOf(t.name(r)));
            expect(positions.every((p) => p >= 0)).toBe(true);
            expect([...positions].sort((a, b) => a - b)).toEqual(positions);
            // The tie at the cut boundary (55 points) is dropped whole. The rebuilt Honor Board shows only the overall
            // scene, so those two appear nowhere on the page.
            expect(text).not.toContain("Jude Testcase");
            expect(text).not.toContain("Kai Placeholder");
            expect(t.overall).toHaveLength(9);
            expect(t.overall.filter((r) => r.display_rank === 5)).toHaveLength(2);
        });

        test("server responses behind the whole-school board carry no ids or counts", async ({ page }) => {
            const bodies = captureActions(page);
            await page.goto("/dashboard/global?school=1");
            await settle(page);
            const all = bodies.join("\n");
            expect(all.length).toBeGreaterThan(0);
            expect(all).toContain("Ada");
            expect(all, "student ids").not.toMatch(/student_?id/i);
            expect(all, "cohort sizes").not.toMatch(/cohort_?size|total_?students|participants|member_?count/i);
            expect(all, "cut internals").not.toMatch(/n_absolute|p_ratio|k_hidden|link_?code|supabase_?id/i);
        });
    });
}

test.describe("retired boards", () => {
    test.use({ storageState: authFile("admin") });

    test("/dashboard/topCards redirects to the whole-school board", async ({ page }) => {
        await page.goto("/dashboard/topCards?school=1");
        await page.waitForURL(/\/dashboard\/global/);
        expect(new URL(page.url()).pathname).toBe("/dashboard/global");
    });
});

test.describe("the hub", () => {
    test.use({ storageState: authFile("admin") });

    test("offers every board and the pairing entry", async ({ page }) => {
        await page.goto("/dashboard");
        await settle(page);
        for (const label of ["Rotating highlights", "Top students", "Phone view", "Pair a new display"]) {
            await expect(page.locator("body")).toContainText(label);
        }
    });
});
