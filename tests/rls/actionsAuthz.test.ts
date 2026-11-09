// Server actions called as the wrong school's admin / the wrong teacher, against the LOCAL stack.
// The Next session is faked (utils/supabase/server returns the chosen account's auth id) while every
// other layer is real: the action's own code, the service client and the database. Each test asserts the
// action refused AND that the row did not change. Needs `supabase start` + `npm run test:env`.
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { assertLocalStack, serviceClient, signedIn, type Role } from "../helpers/localStack";

let currentAuthId: string | null = null;
vi.mock("@/utils/supabase/server", () => ({
    createClient: () => ({
        auth: {
            getUser: async () => ({
                data: { user: currentAuthId ? { id: currentAuthId } : null },
                error: null,
            }),
        },
    }),
}));

const authIds: Partial<Record<Role, string>> = {};
async function actAs(role: Role) {
    if (!authIds[role]) {
        const client = await signedIn(role);
        authIds[role] = (await client.auth.getUser()).data.user!.id;
    }
    currentAuthId = authIds[role]!;
}

const db = () => serviceClient();

// Ids of rows in each school, read once.
const ids = {
    s1: { group: 0, group2: 0, ranking: 0, point: 0, timeframe: 0, teacher: 0, student: 0 },
    s2: { group: 0, ranking: 0, point: 0, timeframe: 0, teacher: 0, student: 0 },
};

async function firstId(table: string, schoolId: number, skip = 0): Promise<number> {
    const { data, error } = await db().from(table).select("id").eq("school_id", schoolId).order("id").range(skip, skip);
    if (error || !data?.length) throw new Error(`seed has no ${table} for school ${schoolId}`);
    return data[0].id;
}

async function ensureSchool2Rows() {
    // School 2 only has the admin and students in the seed; make sure it owns one of everything.
    const make = async (table: string, row: Record<string, unknown>) => {
        const { data } = await db().from(table).select("id").eq("school_id", 2).limit(1);
        if (data?.length) return data[0].id as number;
        const { data: created, error } = await db().from(table).insert(row).select("id").single();
        if (error) throw new Error(`could not seed ${table} for school 2: ${error.message}`);
        return created.id as number;
    };
    ids.s2.group = await make("student_group", { school_id: 2, name: "Sample Prep Homeroom" });
    ids.s2.ranking = await make("ranking_group", { school_id: 2, name: "Sample Prep Houses" });
    ids.s2.point = await make("point_group", { school_id: 2, name: "Sample Prep Kindness", color: "#336699", ranked: true });
    ids.s2.timeframe = await make("school_timeframes", {
        school_id: 2,
        name: "Sample Prep Term",
        starts_at: "2020-01-01",
        ends_at: "2020-06-01",
        active: false,
    });
    ids.s2.teacher = await make("teacher", { school_id: 2, first_name: "Sam", last_name: "Sample" });
    ids.s2.student = await firstId("student", 2);
}

beforeAll(async () => {
    assertLocalStack();
    await ensureSchool2Rows();
    ids.s1.group = await firstId("student_group", 1);
    ids.s1.group2 = await firstId("student_group", 1, 1);
    ids.s1.ranking = await firstId("ranking_group", 1);
    ids.s1.point = await firstId("point_group", 1);
    ids.s1.timeframe = await firstId("school_timeframes", 1);
    ids.s1.teacher = await firstId("teacher", 1);
    ids.s1.student = await firstId("student", 1);
});

beforeEach(() => {
    currentAuthId = null;
});

describe("admin of school 2 cannot touch school 1 rows (api/admin)", () => {
    it("updatePointGroup refuses and leaves the row alone", async () => {
        const { updatePointGroup } = await import("@/api/admin/pointGroups");
        const before = (await db().from("point_group").select("name").eq("id", ids.s1.point).single()).data;
        await actAs("admin2");
        await expect(updatePointGroup(ids.s1.point, { name: "pwned" })).rejects.toThrow();
        const after = (await db().from("point_group").select("name").eq("id", ids.s1.point).single()).data;
        expect(after).toEqual(before);
    });

    it("updateTimeframe and deleteTimeframe refuse", async () => {
        const { updateTimeframe, deleteTimeframe } = await import("@/api/admin/timeframes");
        await actAs("admin2");
        await expect(updateTimeframe(ids.s1.timeframe, { name: "pwned" })).rejects.toThrow();
        await expect(deleteTimeframe(ids.s1.timeframe)).rejects.toThrow();
        const { data } = await db().from("school_timeframes").select("name").eq("id", ids.s1.timeframe).single();
        expect(data?.name).not.toBe("pwned");
    });

    it("ranking group add/remove refuse, including a school 2 group put into a school 1 ranking group", async () => {
        const api = await import("@/api/admin/rankingGroups");
        await actAs("admin2");
        await expect(api.addStudentGroupToRankingGroup(ids.s2.group, ids.s1.ranking)).rejects.toThrow();
        await expect(api.addTeacherToRankingGroup(ids.s2.teacher, ids.s1.ranking)).rejects.toThrow();
        await expect(api.removeStudentGroupFromRankingGroup(ids.s1.group, ids.s1.ranking)).rejects.toThrow();
        await expect(api.removeTeacherFromRankingGroup(ids.s1.teacher, ids.s1.ranking)).rejects.toThrow();
        // and the admin's own ranking group must not accept another school's group
        await expect(api.addStudentGroupToRankingGroup(ids.s1.group, ids.s2.ranking)).rejects.toThrow();
        const { data } = await db().from("ranking_group_pair").select("student_group_id").in("student_group_id", [ids.s2.group]);
        expect(data ?? []).toHaveLength(0);
    });

    it("group removals check the group against the school id they were given", async () => {
        const api = await import("@/api/admin/groups");
        await actAs("admin2");
        // school 2 is authorized, but the group is school 1's
        await expect(api.removeStudentFromGroup(2, ids.s1.group, ids.s1.student)).rejects.toThrow();
        await expect(api.removeTeacherFromGroup(2, ids.s1.group, ids.s1.teacher)).rejects.toThrow();
        await expect(api.removeStudentLeaderFromGroup(2, ids.s1.group, ids.s1.student)).rejects.toThrow();
        // and a school 1 id for the school is refused outright
        await expect(api.removeStudentFromGroup(1, ids.s1.group, ids.s1.student)).rejects.toThrow();
    });

    it("the legacy server lane refuses cross-school and unauthenticated callers", async () => {
        const addRankingGroup = (await import("@/app/supaApi/server/admin/rankingGroups/addRankingGroup")).default;
        const addPointGroup = (await import("@/app/supaApi/server/admin/pointGroups/addPointGroup")).default;
        const addStudentGroup = (await import("@/app/supaApi/server/admin/studentGroups/addStudentGroup")).default;
        const addStudentToStudentGroup = (await import("@/app/supaApi/server/admin/studentGroups/addStudentToStudentGroup")).default;
        for (const who of [null, "admin2"] as const) {
            if (who) await actAs(who);
            else currentAuthId = null;
            expect(await addRankingGroup(1, "pwned ranking")).toBe(false);
            expect(await addPointGroup(1, "pwned point", ids.s1.point)).toBe(false);
            expect(await addStudentGroup(1, "pwned group", null)).toBe(false);
        }
        await actAs("admin2");
        // own school, but a parent from school 1
        expect(await addStudentGroup(2, "pwned child", ids.s1.group)).toBe(false);
        expect(await addStudentToStudentGroup(ids.s1.student, ids.s2.group)).toBe(false);
        for (const [table, name] of [["ranking_group", "pwned ranking"], ["point_group", "pwned point"], ["student_group", "pwned group"], ["student_group", "pwned child"]]) {
            const { data } = await db().from(table).select("id").eq("name", name);
            expect(data ?? [], `${table} ${name}`).toHaveLength(0);
        }
    });
});

describe("updateTeacher is an allow-list; unlinking is its own action", () => {
    it("ignores or refuses columns outside the allow-list and other schools' teachers", async () => {
        const updateTeacher = (await import("@/app/supaApi/server/admin/teachers/updateTeacher")).default;
        const unlinkTeacher = (await import("@/app/supaApi/server/admin/teachers/unlinkTeacher")).default;
        const { data: before } = await db().from("teacher").select("*").eq("id", ids.s1.teacher).single();

        await actAs("admin2");
        expect(await updateTeacher(ids.s1.teacher, { firstName: "pwned" })).toBe(false);
        expect(await unlinkTeacher(ids.s1.teacher)).toBe(false);

        await actAs("admin");
        // not allowed keys: refused as an empty patch, nothing written
        expect(await updateTeacher(ids.s1.teacher, { link_code: "AAAAAAAAAA", school_id: 2, linked_user: null } as never)).toBe(false);
        const { data: after } = await db().from("teacher").select("*").eq("id", ids.s1.teacher).single();
        expect(after).toEqual(before);
    });
});

describe("teaching assistant checks use the caller's student id, not user.id", () => {
    it("a teacher whose user.id equals a TA's student id gets no roster for a group they do not teach", async () => {
        // teacher2 is "user".id 4 and teaches group 2 only. Make student 4 a TA of group 1: before the fix,
        // user.id (4) matched teaching_assistant.student_id (4) and opened group 1's roster.
        const { data: teacher2 } = await db().from("user").select("id").eq("id", 4).single();
        expect(teacher2?.id).toBe(4);
        const { data: ta, error } = await db()
            .from("teaching_assistant")
            .insert({ group_id: ids.s1.group, student_id: 4, full_access: true })
            .select("id")
            .single();
        expect(error).toBeNull();
        try {
            await actAs("teacher2");
            const { getTeachingAssistantData } = await import("@/api/teacher");
            const { getScorebookAccess } = await import("@/api/scorebook");
            await expect(getTeachingAssistantData(ids.s1.group)).rejects.toThrow();
            // group 1 must not be one of teacher2's groups for this to be meaningful
            const { data: pair } = await db().from("teacher_student_group_pair").select("teacher_id").eq("group_id", ids.s1.group).eq("teacher_id", 4);
            expect(pair ?? []).toHaveLength(0);
            expect((await getScorebookAccess(ids.s1.group)).role).toBe("none");
        } finally {
            await db().from("teaching_assistant").delete().eq("id", ta!.id);
        }
    });

    it("assigning a TA cannot grant point events from another group", async () => {
        const { assignTeachingAssistant } = await import("@/api/teacher");
        await actAs("teacher1");
        const { data: foreign } = await db().from("point_event").select("id").neq("student_group_id", ids.s1.group).limit(1).single();
        const { data: member } = await db().from("student_group_pair").select("student_id").eq("student_group_id", ids.s1.group).limit(1).single();
        if (!foreign || !member) return;
        await expect(assignTeachingAssistant(ids.s1.group, member.student_id, false, [foreign.id])).rejects.toThrow();
    });
});

describe("teacher exports", () => {
    it("the unauthenticated *ForTeachers helpers are no longer exported actions", async () => {
        const teacherApi = (await import("@/api/teacher")) as Record<string, unknown>;
        expect(teacherApi.getStudentGroupsForTeachers).toBeUndefined();
        expect(teacherApi.getRankingGroupsForTeachers).toBeUndefined();
    });
});
