"use client";
import React, { useState, useEffect } from "react";
import { rankTier } from "@/lib/rankTier";
import { isRanked, standingText } from "@/lib/rankText";
import { SectionTitle } from "./ui";
import "./victorian-theme.css";
import SharePointModal from "./SharePointModal";
import { checkPointsSharedStatus } from "@/api/student";
import { wrapServerAction } from "@/utils/serverActionWrapper";

// Simple date formatting function
function formatDate(dateString: string | null): string {
    if (!dateString) return 'Unknown date';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    } catch {
        return 'Invalid date';
    }
}

function ShareIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15V4M8 8l4-4 4 4" />
            <path d="M5 13v6h14v-6" />
        </svg>
    );
}

export default function RecentEventsWithRankings({ pointEventRankings, initialCount = 5 }: { pointEventRankings: any[], initialCount?: number }) {
    const [count, setCount] = useState(initialCount);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<{ studentPointId: number; eventName: string } | null>(null);
    const [sharedStatus, setSharedStatus] = useState<Record<number, boolean>>({});
    const [toast, setToast] = useState<string | null>(null);
    const visibleEvents = pointEventRankings.slice(0, count);
    const canExpand = count < pointEventRankings.length;

    // Check shared status for visible events
    useEffect(() => {
        async function checkSharedStatus() {
            const pointIds = visibleEvents
                .filter(e => e.studentPointId)
                .map(e => e.studentPointId);
            
            if (pointIds.length === 0) return;

            const statusRecord = await wrapServerAction(checkPointsSharedStatus)(pointIds);
            setSharedStatus(statusRecord);
        }

        checkSharedStatus();
        // visibleEvents is derived from these two; depending on the array itself would refetch on every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [count, pointEventRankings]);

    // Toast confirms a share or unshare, then goes away by itself.
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(timer);
    }, [toast]);
    
    const handleShareClick = (event: any) => {
        if (event.studentPointId) {
            setSelectedEvent({ studentPointId: event.studentPointId, eventName: event.eventName });
            setShareModalOpen(true);
        }
    };

    const handleShareSuccess = (message?: string) => {
        // Refresh shared status after sharing
        const pointIds = visibleEvents
            .filter(e => e.studentPointId)
            .map(e => e.studentPointId);

        if (pointIds.length > 0) {
            wrapServerAction(checkPointsSharedStatus)(pointIds).then(setSharedStatus);
        }

        setShareModalOpen(false);
        setSelectedEvent(null);
        if (message) setToast(message);
    };

    return (
        <>
            <SectionTitle>Recent points</SectionTitle>
            {pointEventRankings.length === 0 ? (
                <p className="py-6 text-base">
                    No points yet this term. Points your teachers award will show up here.
                </p>
            ) : (
                <ul className="mt-2">
                    {visibleEvents.map((event) => {
                        const ranked = isRanked(event.rank, event.outOf);
                        return (
                            <li
                                key={event.eventId}
                                className="flex min-h-11 items-center justify-between gap-3 border-b border-rule py-3 last:border-b-0"
                            >
                                <div className="flex min-w-0 flex-1 items-start gap-3">
                                    <span
                                        aria-hidden="true"
                                        className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
                                        style={{ backgroundColor: event.pointGroup.color }}
                                    />
                                    <div className="min-w-0">
                                        <p className="truncate text-base font-semibold">{event.eventName}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {formatDate(event.eventDate)} · {event.pointGroup.name}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {ranked ? (
                                                <>
                                                    <span className="text-rank-ink" data-rank-tier={rankTier(event.rank, event.outOf)}>{standingText(event.rank, event.outOf)}</span>
                                                </>
                                            ) : (
                                                standingText(event.rank, event.outOf)
                                            )}
                                        </p>
                                        {event.studentPointId && sharedStatus[event.studentPointId] && (
                                            <p className="mt-1 text-xs font-medium text-green-700 dark:text-green-400">✓ Shared with your groups</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-2">
                                    <p className="vic-numeral whitespace-nowrap text-lg font-bold">+{event.points}</p>
                                    {event.studentPointId && (
                                        <button
                                            type="button"
                                            onClick={() => handleShareClick(event)}
                                            className="victorian-button-secondary inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold"
                                            aria-label={`Share ${event.eventName}`}
                                        >
                                            <ShareIcon />
                                            <span>Share</span>
                                        </button>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
            {canExpand && (
                <div className="mt-6 flex justify-center">
                    <button
                        className="victorian-button min-h-11 rounded-lg px-6 py-3"
                        onClick={() => setCount(count + 5)}
                    >
                        Show {Math.min(5, pointEventRankings.length - count)} more
                    </button>
                </div>
            )}
            {selectedEvent && (
                <SharePointModal
                    studentPointId={selectedEvent.studentPointId}
                    eventName={selectedEvent.eventName}
                    isOpen={shareModalOpen}
                    onClose={() => {
                        setShareModalOpen(false);
                        setSelectedEvent(null);
                    }}
                    onSuccess={handleShareSuccess}
                />
            )}
            <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4">
                {toast && (
                    <div className="pointer-events-auto rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
                        {toast}
                    </div>
                )}
            </div>
        </>
    );
}
