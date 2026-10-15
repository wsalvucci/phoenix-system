// Role-level checks through the real API (PostgREST), signed in the way the app's cookie client is:
// anon key plus the user's JWT, so every request runs as `anon` or `authenticated` under RLS.
// Needs the local stack: `supabase start`, `npm run test:env`. See docs/TESTING.md.
import { beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { anonClient, assertLocalStack, serviceClient, signedIn, type Role } from "../helpers/localStack";

const STUDENT_RPCS: Array<[string, Record<string, unknown>]> = [
    ["get_active_timeframe", {}],
    ["get_all_timeframes", {}],
    ["get_available_leaderboard_scopes", { p_timeframe_id: 1 }],
    ["get_category_breakdown", { p_timeframe_id: 1 }],
    ["get_dashboard_totals", { p_timeframe_id: 1 }],
    ["get_grade_leaderboard", { p_grade: 7, p_timeframe_id: 1 }],
    ["get_my_groups", { p_timeframe_id: 1 }],
    ["get_my_visibility_snapshot", { p_timeframe_id: 1 }],
    ["get_point_group_leaderboard", { p_point_group_id: 1, p_timeframe_id: 1 }],
    ["get_point_history", { p_timeframe_id: 1, p_page: 1, p_page_size: 5 }],
    ["get_ranking_group_leaderboard", { p_ranking_group_id: 1, p_timeframe_id: 1 }],
    ["get_school_leaderboard", { p_timeframe_id: 1 }],
    ["get_student_group_leaderboard", { p_group_id: 1, p_timeframe_id: 1 }],
];

// Server-only RPCs (service_role). Argument names must match so the failure is the grant, not the lookup.
const SERVER_ONLY_RPCS: Array<[string, Record<string, unknown>]> = [
    ["display_cut", { p_school_id: 1, p_timeframe_id: 1, p_cohort_kind: "overall", p_cohort_id: null, p_actor_user_id: 1, p_display_device_id: null }],
    ["points_to_next_rank", { p_actor_user_id: 5, p_student_id: 7, p_timeframe_id: 1 }],
    ["redeem_link_code", { p_actor_user_id: 10, p_school_id: 1, p_code: "STUD39ABCD", p_purpose: "student_claim", p_client_key: "k".repeat(32) }],
    ["preview_link_code", { p_actor_user_id: 10, p_school_id: 1, p_code: "STUD39ABCD", p_purpose: "student_claim", p_client_key: "k".repeat(32) }],
    ["get_leader_group_letters", { p_actor_user_id: 6 }],
    ["get_led_group_member_points", { p_group_id: 1, p_timeframe_id: 1 }],
    ["display_pairing_start", { p_device_secret_hash: "\\x" + "00".repeat(32) }],
    ["display_device_resolve", { p_token_hash: "\\x" + "00".repeat(32) }],
    ["is_staff_of_school", { p_user_id: 1, p_school_id: 1 }],
    ["get_schools_as_admin", {}],
    ["publication_cut", { p_size: 12 }],
];

const READABLE_TABLES = [
    "user", "student", "teacher", "school", "student_group", "student_point", "point_event", "point_group",
    "school_timeframes", "student_group_pair", "teacher_student_group_pair", "admin", "admin_school_pair",
    "user_student_pair", "ranking_group", "shared_point", "point_template", "student_group_leaders",
    "teaching_assistant",
];
const SERVER_ONLY_TABLES = [
    "display_device", "display_pairing_request", "link_attempt", "parent_link_revocation", "leader_letter",
    "leader_letter_run", "shared_point_withdrawal", "scorebook_event_copy_operation",
];

const PERMISSION_DENIED = (code: string | undefined) => code === "42501" || code === "PGRST202" || code === "PGRST301";

beforeAll(() => assertLocalStack());

describe("anon (no session)", () => {
    it.each(STUDENT_RPCS)("cannot execute %s", async (fn, args) => {
        const { data, error } = await anonClient().rpc(fn, args);
        expect(data).toBeNull();
        expect(PERMISSION_DENIED(error?.code)).toBe(true);
    });

    it.each(SERVER_ONLY_RPCS)("cannot execute %s", async (fn, args) => {
        const { data, error } = await anonClient().rpc(fn, args);
        expect(data).toBeNull();
        expect(PERMISSION_DENIED(error?.code)).toBe(true);
    });

    it.each(READABLE_TABLES)("reads no rows from %s", async (table) => {
        const { data } = await anonClient().from(table).select("*").limit(5);
        expect(data ?? []).toHaveLength(0);
    });

    it.each(SERVER_ONLY_TABLES)("has no access to %s", async (table) => {
        const { data, error } = await anonClient().from(table).select("*").limit(5);
        expect(data ?? []).toHaveLength(0);
        expect(error === null || PERMISSION_DENIED(error.code)).toBe(true);
    });

    it("cannot write a score", async () => {
        const { error } = await anonClient().from("student_point").insert({ student_id: 1, point_event_id: 1, point_value: 999 });
        expect(error?.code).toBe("42501");
    });
});

const SIGNED_IN_ROLES: Role[] = ["admin", "admin2", "teacher1", "teacher2", "student", "leader", "ta", "parent", "newuser"];

describe.each(SIGNED_IN_ROLES)("authenticated as %s", (role) => {
    let client: SupabaseClient;
    beforeAll(async () => {
        client = await signedIn(role);
    });

    it.each(SERVER_ONLY_RPCS)("cannot execute server-only %s", async (fn, args) => {
        const { data, error } = await client.rpc(fn, args);
        expect(data).toBeNull();
        expect(PERMISSION_DENIED(error?.code)).toBe(true);
    });

    it.each(SERVER_ONLY_TABLES)("has no access to %s", async (table) => {
        const { data, error } = await client.from(table).select("*").limit(5);
        expect(data ?? []).toHaveLength(0);
        expect(error === null || PERMISSION_DENIED(error.code)).toBe(true);
    });

    it("cannot write a score for anyone", async () => {
        const { data, error } = await client
            .from("student_point")
            .insert({ student_id: 7, point_event_id: 1, point_value: 999 })
            .select();
        expect(data ?? []).toHaveLength(0);
        expect(error?.code).toBe("42501");
        const { data: after } = await serviceClient().from("student_point").select("id").eq("point_value", 999);
        expect(after ?? []).toHaveLength(0);
    });

    it("cannot change another user's data", async () => {
        const { data, error } = await client.from("student").update({ first_name: "Hacked" }).eq("id", 1).select();
        expect(data ?? []).toHaveLength(0);
        expect(error?.code).toBe("42501");
        const { data: row } = await serviceClient().from("student").select("first_name").eq("id", 1).single();
        expect(row?.first_name).toBe("Ada");
    });

    it("never reads a row from the other school", async () => {
        const mine = role === "admin2" ? 2 : 1;
        const { data: students } = await client.from("student").select("id, school_id");
        expect((students ?? []).every((s) => s.school_id === mine)).toBe(true);
        const { data: groups } = await client.from("student_group").select("id, school_id");
        expect((groups ?? []).every((g) => g.school_id === mine)).toBe(true);
    });
});

describe("student RPCs and what they disclose", () => {
    it.each(STUDENT_RPCS)("student can execute %s", async (fn, args) => {
        const student = await signedIn("student");
        const { error } = await student.rpc(fn, args);
        expect(error).toBeNull();
    });

    it.each(["admin", "teacher1", "parent", "newuser"] as Role[])("%s has no student record, so student RPCs return nothing", async (role) => {
        const client = await signedIn(role);
        const { data, error } = await client.rpc("get_school_leaderboard", { p_timeframe_id: 1 });
        expect(error).toBeNull();
        expect(data ?? []).toHaveLength(0);
    });

    it("school leaderboard hides other students' ids and carries no counts", async () => {
        const student = await signedIn("student");
        const { data } = await student.rpc("get_school_leaderboard", { p_timeframe_id: 1 });
        const rows = data as Array<Record<string, unknown>>;
        expect(rows.length).toBeGreaterThan(0);
        expect(rows.length).toBeLessThanOrEqual(11); // cut of 10 plus the caller's own row
        for (const row of rows) {
            if (row.is_current_student !== true) expect(row.student_id).toBeNull();
            expect(Object.keys(row).filter((k) => /count|total_students|participants|size/i.test(k))).toEqual([]);
        }
    });

    it("never publishes a student whose total is zero", async () => {
        const student = await signedIn("student");
        const { data } = await student.rpc("get_school_leaderboard", { p_timeframe_id: 1 });
        const names = (data as Array<{ first_name: string }>).map((r) => r.first_name);
        for (const zero of ["Mona", "Nico", "Leo", "Kira"]) expect(names).not.toContain(zero);
    });

    it("the student sees only their own point history", async () => {
        const student = await signedIn("student");
        const { data } = await student.rpc("get_point_history", { p_timeframe_id: 1, p_page: 1, p_page_size: 50 });
        const rows = data as Array<{ id: number }>;
        expect(rows.length).toBeGreaterThan(0);
        const { data: truth } = await serviceClient().from("student_point").select("id").eq("student_id", 7);
        const mine = new Set((truth ?? []).map((r) => r.id));
        expect(rows.every((r) => mine.has(r.id))).toBe(true);
    });
});

// D21 (docs/schema/BACKEND_PLAN.md section 12): the app reads and writes through the server-only service
// client after a TypeScript authorization check. RLS is a deny-all backstop: no API role reads a row of any
// table, and no API role holds a write grant (migration 20261014230655). A green test here that starts
// failing means someone added a policy or a grant: that is an architecture change, not a fix.
describe.each(SIGNED_IN_ROLES)("deny-all backstop as %s", (role) => {
    let client: SupabaseClient;
    beforeAll(async () => {
        client = await signedIn(role);
    });

    it.each(READABLE_TABLES)("reads no rows from %s through the cookie client", async (table) => {
        const { data, error } = await client.from(table).select("*").limit(5);
        expect(error).toBeNull();
        expect(data ?? []).toHaveLength(0);
    });

    it.each(["student_point", "point_event", "user", "student"])("is refused a write to %s by the grant", async (table) => {
        const { error } = await client.from(table).delete().eq("id", -1);
        expect(error?.code).toBe("42501");
    });
});

describe("deny-all backstop as anon", () => {
    it.each(["student_point", "point_event", "user", "student"])("is refused a write to %s by the grant", async (table) => {
        const { error } = await anonClient().from(table).delete().eq("id", -1);
        expect(error?.code).toBe("42501");
    });
});
