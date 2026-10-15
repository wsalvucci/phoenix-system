"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { getStudentDataWithContext } from "@/api/student";
import { getTeacherDataWithContext } from "@/api/teacher";
import { getAdminDataWithContext } from "@/api/admin";
import { getStudentsOfParent } from "@/app/supaApi/server/parent/parentApi";
import { getMyRoles } from "@/api/user";
import MotionButton from "@/components/MotionButton";

type Roles = {
    student: { name: string; grade: number | string } | null;
    teacher: { name: string } | null;
    admin: boolean;
    children: number;
};

const SKELETON = "h-16 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800";

/**
 * Signed-in home. One question for someone with no role yet ("Who is using Phoenix?"),
 * otherwise the person's own destinations. Fetches only the caller's own records.
 */
export default function HomeRoles() {
    const [roles, setRoles] = useState<Roles | null>(null);
    const [failed, setFailed] = useState(false);

    const load = useCallback(async () => {
        setFailed(false);
        setRoles(null);
        let mine;
        try {
            mine = await getMyRoles();
        } catch {
            setFailed(true);
            return;
        }
        // Only call the loaders for roles this user actually has.
        const none = Promise.resolve(null);
        const [student, teacher, admin, kids] = await Promise.allSettled([
            mine.student ? getStudentDataWithContext() : none,
            mine.teacher ? getTeacherDataWithContext() : none,
            mine.admin ? getAdminDataWithContext() : none,
            mine.parent ? getStudentsOfParent() : none,
        ]);
        const wanted = [mine.student, mine.teacher, mine.admin, mine.parent];
        if (wanted.some(Boolean) && [student, teacher, admin, kids].every((r, i) => !wanted[i] || r.status === "rejected")) {
            setFailed(true);
            return;
        }
        const ok = <T,>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : null);
        const s = ok(student), t = ok(teacher), a = ok(admin), k = ok(kids);
        setRoles({
            student: s ? { name: `${s.firstName} ${s.lastName}`, grade: s.grade } : null,
            teacher: t ? { name: `${t.firstName} ${t.lastName}` } : null,
            admin: !!a,
            children: k ? k.length : 0,
        });
    }, []);

    useEffect(() => { load(); }, [load]);

    if (failed) {
        return (
            <div role="alert" className="flex flex-col gap-3">
                <p>We could not load your access. Check your connection and try again.</p>
                <MotionButton onClick={load} variant="primary" fullWidth className="min-h-[44px]">Try again</MotionButton>
            </div>
        );
    }

    if (!roles) {
        return (
            <div className="flex flex-col gap-3" aria-label="Loading your access">
                <div className={SKELETON} />
                <div className={SKELETON} />
            </div>
        );
    }

    const hasRole = roles.student || roles.teacher || roles.admin || roles.children > 0;

    if (!hasRole) {
        return (
            <div className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold">Who is using Phoenix?</h2>
                <MotionButton href="/linkAccount/student" variant="primary" fullWidth className="min-h-14">I&apos;m a student</MotionButton>
                <MotionButton href="/linkAccount/parent" variant="primary" fullWidth className="min-h-14">I&apos;m a parent or guardian</MotionButton>
                <MotionButton href="/linkAccount/teacher" variant="primary" fullWidth className="min-h-14">I&apos;m a teacher</MotionButton>
            </div>
        );
    }

    const row = (key: string, href: string, title: string, sub: string | null, action: string, primary: boolean) => (
        <MotionButton key={key} href={href} variant={primary ? "primary" : "outline"} fullWidth className="min-h-16 !justify-between">
            <div className="text-left">
                <div className="font-bold">{title}</div>
                {sub && <div className="text-sm">{sub}</div>}
            </div>
            <div>{action} <FontAwesomeIcon icon={faArrowRight} /></div>
        </MotionButton>
    );

    const items: { key: string; node: (primary: boolean) => React.ReactNode }[] = [];
    const { student, teacher } = roles;
    if (student) items.push({ key: "student", node: (p) => row("student", "/student", student.name, `Grade ${student.grade}`, "See my points", p) });
    if (roles.children > 0) items.push({ key: "parent", node: (p) => row("parent", "/parent", "Your children", roles.children === 1 ? "1 child connected" : `${roles.children} children connected`, "See their progress", p) });
    if (teacher) items.push({ key: "teacher", node: (p) => row("teacher", "/teacher", teacher.name, null, "Teacher dashboard", p) });
    if (roles.admin) items.push({ key: "admin", node: (p) => row("admin", "/admin", "Administration", null, "Open dashboard", p) });
    // The first destination is the one primary action.
    return (
        <div className="flex flex-col gap-3">
            {items.map((i, index) => i.node(index === 0))}
            {!roles.student && (
                <Link href="/linkAccount/student" className="inline-flex min-h-[44px] items-center text-sm underline">Link a student account</Link>
            )}
            {roles.children > 0 && (
                <Link href="/linkAccount/parent" className="inline-flex min-h-[44px] items-center text-sm underline">Connect another child</Link>
            )}
        </div>
    );
}
