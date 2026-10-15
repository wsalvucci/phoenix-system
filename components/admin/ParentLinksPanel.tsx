"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { listParentLinks, revokeParentLink } from "@/app/supaApi/server/admin/parentLinks";

/**
 * Admin: parent accounts linked to one student, each removable (DATA_DISCLOSURE.md §10.4 policy gap,
 * §11.4 #25). The server re-checks that the session user is an admin of the student's own school.
 */
export function ParentLinksPanel({ studentId, studentName }: { studentId: number; studentName: string }) {
    const queryClient = useQueryClient();
    const key = ["adminParentLinks", studentId];
    const links = useQuery({ queryKey: key, queryFn: () => listParentLinks(studentId) });
    const revoke = useMutation({
        mutationFn: (parentUserId: number) => revokeParentLink(studentId, parentUserId),
        onSettled: () => void queryClient.invalidateQueries({ queryKey: key }),
    });

    return (
        <div className="bg-card border border-border rounded-lg p-6 mt-6">
            <h2 className="text-xl font-semibold text-foreground">Parent accounts</h2>
            <p className="mt-1 text-sm text-muted-foreground">
                Anyone with {studentName}&apos;s code can link as a parent. Remove any account you do not recognise.
            </p>
            {revoke.data === false && (
                <p role="alert" className="mt-3 text-sm text-destructive">That link could not be removed. The list below is up to date.</p>
            )}
            <div className="mt-4">
                {links.isLoading ? (
                    <div className="h-12 animate-pulse rounded-lg bg-muted" aria-label="Loading parent accounts" />
                ) : links.isError ? (
                    <p role="alert" className="text-sm text-destructive">We could not load parent accounts. Reload the page to try again.</p>
                ) : (links.data ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No parent accounts are linked.</p>
                ) : (
                    <ul className="divide-y divide-border">
                        {(links.data ?? []).map((link) => (
                            <li key={link.parentUserId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                                <div className="min-w-0">
                                    <div className="font-medium text-foreground">{link.parentName ?? "No name given"}</div>
                                    <div className="text-sm text-muted-foreground">
                                        {link.parentEmail ?? "No email"} · linked {DateTime.fromISO(link.linkedAt).toLocaleString(DateTime.DATE_MED)}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="button-ghost min-h-[44px]"
                                    disabled={revoke.isPending}
                                    onClick={() => {
                                        const who = link.parentName ?? link.parentEmail ?? "this account";
                                        if (window.confirm(`Remove ${who} as a parent of ${studentName}? They lose access right away.`)) {
                                            revoke.mutate(link.parentUserId);
                                        }
                                    }}
                                >
                                    Remove
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
