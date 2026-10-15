// Display pairing, end to end: a kiosk with no account shows a code, staff approve it from their own
// session, the kiosk then shows only its school's boards, and loses them when revoked or when its pairer
// stops being staff (docs/DATA_DISCLOSURE.md D17). Tests run in order and share the kiosk.
import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { authFile, settle } from "./helpers";
import { serviceClient } from "../helpers/localStack";

const db = serviceClient();

async function cleanDevices() {
    await db.from("display_device").delete().eq("school_id", 1);
    await db.from("display_pairing_request").delete().not("id", "is", null);
}

/** Starts a kiosk page and returns the 8-character code it shows. */
async function kioskCode(kiosk: Page): Promise<string> {
    await kiosk.goto("/display");
    const box = kiosk.locator('[aria-label^="Pairing code"]');
    await expect(box).toBeVisible({ timeout: 30_000 });
    const code = ((await box.innerText()) ?? "").replace(/[^0-9A-Z]/gi, "");
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
    return code;
}

async function approve(staff: Page, code: string, label: string) {
    await staff.goto("/display/pair?school=1");
    await staff.getByLabel("Screen name").fill(label);
    await staff.getByLabel("Code on the screen").fill(code);
    await staff.getByRole("button", { name: /Pair as a display for Example Academy/ }).click();
    await expect(staff.getByRole("status").filter({ hasText: "Paired." })).toBeVisible();
}

test.describe.serial("display pairing", () => {
    let kioskContext: BrowserContext;
    let kiosk: Page;
    let adminContext: BrowserContext;
    let admin: Page;

    test.beforeAll(async ({ browser }) => {
        await cleanDevices();
        kioskContext = await browser.newContext();
        kiosk = await kioskContext.newPage();
        adminContext = await browser.newContext({ storageState: authFile("admin") });
        admin = await adminContext.newPage();
        admin.on("dialog", (d) => d.accept());
    });

    test.afterAll(async () => {
        await kioskContext?.close();
        await adminContext?.close();
        await cleanDevices();
        // Teacher 1 is relinked by the lapse test; make sure of it if that test died half way.
        const { data: teacherUser } = await db.from("user").select("id").eq("supabase_id", "00000000-0000-4000-8000-000000000003").single();
        if (teacherUser) await db.from("teacher").update({ linked_user: teacherUser.id }).eq("id", 1);
    });

    test("an unpaired screen shows a code and no data", async () => {
        await kioskCode(kiosk);
        const text = await settle(kiosk);
        expect(text).toContain("Pair this screen");
        expect(text).not.toMatch(/Example Academy|Ada Sample/);
    });

    test("a non-staff session cannot approve the code", async ({ browser }) => {
        const code = await kioskCode(kiosk);
        const ctx = await browser.newContext({ storageState: authFile("student") });
        const page = await ctx.newPage();
        await page.goto("/display/pair?school=1");
        await settle(page);
        // No school to pair for: the form is not offered at all.
        await expect(page.getByLabel("Code on the screen")).toHaveCount(0);
        await ctx.close();
        const { data } = await db.from("display_pairing_request").select("approved_at").eq("user_code", code).single();
        expect(data?.approved_at).toBeNull();
    });

    test("staff of another school cannot approve it either", async ({ browser }) => {
        const code = await kioskCode(kiosk);
        const ctx = await browser.newContext({ storageState: authFile("admin2") });
        const page = await ctx.newPage();
        await page.goto("/display/pair?school=1");
        await settle(page);
        await expect(page.getByRole("heading", { name: /Pair a display for Sample Prep/ })).toBeVisible();
        await page.getByLabel("Screen name").fill("Wrong school");
        await page.getByLabel("Code on the screen").fill(code);
        await page.getByRole("button", { name: /Pair as a display for Sample Prep/ }).click();
        // The code is approved only for their own school, so the kiosk would show Sample Prep, never Example Academy.
        await ctx.close();
        const { data } = await db.from("display_pairing_request").select("approved_school_id").eq("user_code", code).single();
        expect(data?.approved_school_id === null || data?.approved_school_id === 2).toBe(true);
        // Reset: forget that request so the next test starts a clean code.
        await db.from("display_pairing_request").delete().eq("user_code", code);
    });

    test("an admin approves the code and the kiosk opens its school's displays", async () => {
        const code = await kioskCode(kiosk);
        await approve(admin, code, "Main hallway");
        // A newly paired screen opens the rotating featured board directly.
        await kiosk.waitForURL(/\/dashboard\/featured/, { timeout: 45_000 });
        await expect(kiosk.locator("body")).toContainText("Ada Sample", { timeout: 30_000 });
        // A display is not staff: its hub has no pairing entry.
        await kiosk.goto("/dashboard");
        await expect(kiosk.locator("body")).toContainText("Example Academy", { timeout: 30_000 });
        expect(await settle(kiosk)).not.toContain("Pair a new display");
    });

    test("the paired screen shows its own school's cut and nothing outside it", async () => {
        await kiosk.goto("/dashboard/global?school=1");
        await expect(kiosk.locator("body")).toContainText("Ada Sample", { timeout: 30_000 });
        const text = await settle(kiosk);
        for (const hidden of ["Mona Placeholder", "Nico Example", "Kira Sample", "Leo Testcase"]) expect(text).not.toContain(hidden);
        expect(text).not.toMatch(/\bof \d+\b|\b\d+\s+students?\b/i);
    });

    test("the paired screen ignores a request for another school", async () => {
        await kiosk.goto("/dashboard/global?school=2");
        await expect(kiosk.locator("body")).toContainText("Ada Sample", { timeout: 30_000 });
        const text = await settle(kiosk);
        expect(text).not.toMatch(/Sample Prep|Una Sample|Vera Sample|Yuri Sample/);
    });

    test("the paired screen cannot reach staff or family pages", async () => {
        for (const route of ["/admin", "/admin/school/1", "/teacher", "/teacher/group/1", "/parent", "/student"]) {
            await kiosk.goto(route);
            const text = await settle(kiosk);
            expect(text, route).not.toMatch(/Total Students|Top Performers|Homeroom A|Ada Sample|Your points are|Rank [0-9]/i);
        }
        await kiosk.goto("/display/pair");
        expect(await settle(kiosk)).not.toContain("Pair a display for Example Academy");
    });

    test("the staff list shows the device, and removing it sends the screen back to pairing", async () => {
        await admin.goto("/display/pair?school=1");
        await expect(admin.getByText("Main hallway")).toBeVisible();
        await admin.getByRole("button", { name: "Remove" }).click();
        await expect(admin.getByText("Removed", { exact: true })).toBeVisible();
        await expect(admin.getByRole("button", { name: "Remove" })).toHaveCount(0);
        await kiosk.goto("/dashboard");
        await kiosk.waitForURL(/\/display$/, { timeout: 30_000 });
        await expect(kiosk.locator('[aria-label^="Pairing code"]')).toBeVisible({ timeout: 30_000 });
    });

    test("a display lapses when the staff member who paired it stops being staff", async ({ browser }) => {
        const { data: teacherUser } = await db.from("user").select("id").eq("supabase_id", "00000000-0000-4000-8000-000000000003").single();
        const teacherCtx = await browser.newContext({ storageState: authFile("teacher1") });
        const teacher = await teacherCtx.newPage();
        try {
            const code = await kioskCode(kiosk);
            await approve(teacher, code, "Teacher hall");
            await kiosk.waitForURL(/\/dashboard/, { timeout: 45_000 });
            await expect(kiosk.locator("body")).toContainText("Ada Sample", { timeout: 30_000 });

            // The teacher leaves the school.
            await db.from("teacher").update({ linked_user: null }).eq("id", 1);
            await kiosk.goto("/dashboard/global?school=1");
            await kiosk.waitForURL(/\/display$/, { timeout: 30_000 });
            const text = await settle(kiosk);
            expect(text).not.toContain("Ada Sample");

            // An admin sees it flagged and keeps it on.
            await admin.goto("/display/pair?school=1");
            await expect(admin.getByText("Teacher hall")).toBeVisible();
            await admin.getByRole("button", { name: "Keep it on, paired by me" }).click();
            await expect(admin.getByRole("button", { name: "Keep it on, paired by me" })).toHaveCount(0);
            await kiosk.goto("/dashboard");
            await expect(kiosk.locator("body")).toContainText("Example Academy", { timeout: 30_000 });
            expect(new URL(kiosk.url()).pathname).toBe("/dashboard");
        } finally {
            await db.from("teacher").update({ linked_user: teacherUser!.id }).eq("id", 1);
            await teacherCtx.close();
        }
    });

    test("a paired screen cannot be made to use another school's data by editing its cookie", async () => {
        const cookies = await kioskContext.cookies();
        const display = cookies.find((c) => c.name === "__Host-phx_display");
        test.skip(!display, "no display cookie in this browser (secure cookie not stored over http)");
        await kioskContext.addCookies([{ ...display!, value: "A".repeat(43) }]);
        await kiosk.goto("/dashboard/global?school=1");
        await kiosk.waitForURL(/\/display$/, { timeout: 30_000 });
        expect(await settle(kiosk)).not.toContain("Ada Sample");
    });
});
