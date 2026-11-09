// The private Realtime score signal (migration 20261109120200, components/display/useScoreSignal.ts),
// end to end through the local Realtime server: who can subscribe, that the database trigger delivers,
// and that no browser can forge the signal. Needs the local stack (docs/TESTING.md).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { anonClient, assertLocalStack, serviceClient, signedIn, type Role } from "../helpers/localStack";

const topic = (schoolId: number) => `school:${schoolId}:scores`;
const clients: SupabaseClient[] = [];

async function client(role: Role | "anon"): Promise<SupabaseClient> {
    const c = role === "anon" ? anonClient() : await signedIn(role);
    if (role !== "anon") {
        const { data } = await c.auth.getSession();
        c.realtime.setAuth(data.session!.access_token);
    }
    clients.push(c);
    return c;
}

type Joined = { channel: RealtimeChannel; status: string; received: number };

/** Joins the topic and resolves once Realtime has answered (SUBSCRIBED, CHANNEL_ERROR, ...). */
function join(c: SupabaseClient, name: string, isPrivate: boolean): Promise<Joined> {
    return new Promise((resolve) => {
        const joined: Joined = { channel: null as unknown as RealtimeChannel, status: "", received: 0 };
        joined.channel = c
            .channel(name, { config: { private: isPrivate } })
            .on("broadcast", { event: "sync" }, () => { joined.received++; })
            .subscribe((status) => {
                if (joined.status) return;
                joined.status = status;
                resolve(joined);
            });
        setTimeout(() => { if (!joined.status) { joined.status = "NO_ANSWER"; resolve(joined); } }, 10_000);
    });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => assertLocalStack());
afterAll(async () => {
    for (const c of clients) await c.removeAllChannels();
});

describe("private score signal", () => {
    let admin1: Joined;
    let teacher1: Joined;
    let admin2OwnSchool: Joined;

    beforeAll(async () => {
        admin1 = await join(await client("admin"), topic(1), true);
        teacher1 = await join(await client("teacher1"), topic(1), true);
        admin2OwnSchool = await join(await client("admin2"), topic(2), true);
    });

    it("staff of the school may subscribe", () => {
        expect(admin1.status).toBe("SUBSCRIBED");
        expect(teacher1.status).toBe("SUBSCRIBED");
        expect(admin2OwnSchool.status).toBe("SUBSCRIBED");
    });

    it.each<Role | "anon">(["admin2", "student", "parent", "ta", "anon"])("%s may not subscribe to school 1", async (role) => {
        const joined = await join(await client(role), topic(1), true);
        expect(joined.status).not.toBe("SUBSCRIBED");
    });

    it("a browser cannot forge the signal, signed in or not", async () => {
        const before = admin1.received;
        // A signed-in staff member of the same school: no INSERT policy, so the send is dropped.
        await teacher1.channel.send({ type: "broadcast", event: "sync", payload: {} });
        // Anyone with the anon key, on the public channel of the same name.
        const anonPublic = await join(await client("anon"), topic(1), false);
        await anonPublic.channel.send({ type: "broadcast", event: "sync", payload: {} });
        await wait(3_000);
        expect(admin1.received).toBe(before);
    });

    it("a score write in school 1 reaches school 1 staff only", async () => {
        const db = serviceClient();
        const before1 = admin1.received;
        const before2 = admin2OwnSchool.received;
        // A no-op rewrite: fires the statement trigger without changing any score or share.
        const { data: row } = await db.from("student_point").select("id, notes").eq("student_id", 8).limit(1).single();
        const { error } = await db.from("student_point").update({ notes: row!.notes }).eq("id", row!.id);
        expect(error).toBeNull();
        for (let i = 0; i < 50 && admin1.received === before1; i++) await wait(200);
        expect(admin1.received).toBe(before1 + 1);
        expect(teacher1.received).toBeGreaterThan(0);
        await wait(1_000);
        expect(admin2OwnSchool.received).toBe(before2);
    });
});
