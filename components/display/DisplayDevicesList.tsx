"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { listDisplays, reconfirmDisplay, revokeDisplay, type DisplayListItem } from "@/app/display/actions";

function when(iso: string | null): string {
    if (!iso) return "Never";
    const dt = DateTime.fromISO(iso);
    return dt.isValid ? dt.toRelative() ?? dt.toLocaleString(DateTime.DATE_MED) : "Unknown";
}

function status(device: DisplayListItem): { text: string; tone: string } {
    if (device.revokedAt) return { text: "Removed", tone: "text-muted-foreground" };
    if (!device.pairerActive) return { text: "Paused: the person who paired it is no longer staff here", tone: "text-amber-700 dark:text-amber-300" };
    return { text: "Showing displays", tone: "text-foreground" };
}

/**
 * Paired displays for one school. Admins see every device; other staff see the ones they paired
 * (the server decides). Remove works for an admin or the pairer; Re-confirm is admin-only in SQL and
 * is offered only for a paused device.
 */
export function DisplayDevicesList({ schoolId }: { schoolId: number }) {
    const queryClient = useQueryClient();
    const key = ["displayDevices", schoolId];
    const devices = useQuery({ queryKey: key, queryFn: () => listDisplays(schoolId) });
    const refresh = () => void queryClient.invalidateQueries({ queryKey: key });

    const revoke = useMutation({ mutationFn: (deviceId: string) => revokeDisplay(deviceId), onSettled: refresh });
    const reconfirm = useMutation({ mutationFn: (deviceId: string) => reconfirmDisplay(deviceId), onSettled: refresh });
    const failed = revoke.data?.ok === false || reconfirm.data?.ok === false;

    if (devices.isLoading) {
        return <div className="h-16 animate-pulse rounded-lg bg-muted" aria-label="Loading displays" />;
    }
    if (devices.isError) {
        return <p role="alert" className="text-sm text-destructive">We could not load the displays. Reload the page to try again.</p>;
    }
    const list = devices.data ?? [];
    if (list.length === 0) {
        return <p className="text-sm text-muted-foreground">No displays are paired yet.</p>;
    }

    return (
        <div className="grid gap-3">
            {failed && (
                <p role="alert" className="text-sm text-destructive">That did not work. The list below is up to date.</p>
            )}
            <ul className="grid gap-3">
                {list.map((device) => {
                    const s = status(device);
                    const live = device.revokedAt === null;
                    return (
                        <li key={device.deviceId} className="surface flex flex-wrap items-center justify-between gap-3 p-4">
                            <div className="min-w-0">
                                <div className="font-semibold text-foreground">{device.label}</div>
                                <div className={`text-sm ${s.tone}`}>{s.text}</div>
                                <div className="text-xs text-muted-foreground">
                                    Paired by {device.pairedByName ?? "a former staff member"} · last seen {when(device.lastSeenAt)}
                                </div>
                            </div>
                            {live && (
                                <div className="flex gap-2">
                                    {!device.pairerActive && (
                                        <button
                                            type="button"
                                            className="button-secondary min-h-[44px]"
                                            disabled={reconfirm.isPending}
                                            onClick={() => reconfirm.mutate(device.deviceId)}
                                        >
                                            Keep it on, paired by me
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="button-ghost min-h-[44px]"
                                        disabled={revoke.isPending}
                                        onClick={() => {
                                            if (window.confirm(`Remove "${device.label}"? The screen stops showing displays right away.`)) {
                                                revoke.mutate(device.deviceId);
                                            }
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
