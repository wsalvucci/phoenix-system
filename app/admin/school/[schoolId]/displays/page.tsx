"use client";
import Link from "next/link";
import { DisplayDevicesList } from "@/components/display/DisplayDevicesList";

// Admin: every display paired to this school, including paused ones whose pairer is no longer staff
// (D17 conditions 1 and 2). listDisplays re-checks the session; the SQL returns every device only to
// an admin of the school.
export default function AdminDisplaysPage({ params: { schoolId } }: { params: { schoolId: string } }) {
    const id = Number(schoolId);
    return (
        <div className="page-container max-w-3xl">
            <p className="eyebrow">Hallway displays</p>
            <h1 className="page-title">Displays</h1>
            <p className="page-description">
                Screens paired to this school. Remove one to stop it right away. A paused screen was paired by someone who is no longer staff here; keep it on to make yourself its owner.
            </p>
            <Link href={`/display/pair?school=${id}`} className="button-primary mt-4 min-h-[44px]">Pair a new display</Link>
            <div className="mt-6">
                {Number.isInteger(id) ? <DisplayDevicesList schoolId={id} /> : null}
            </div>
        </div>
    );
}
