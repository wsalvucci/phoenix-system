"use client";
import React, { useState, useEffect } from "react";
import { getSharedPointsForStudent } from "@/api/student";
import { SharedPointData } from "@/types/domain";
import { wrapServerAction } from "@/utils/serverActionWrapper";
import { LedgerRow, SectionTitle } from "./ui";

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

export default function SharedPointsTab() {
    const [sharedPoints, setSharedPoints] = useState<SharedPointData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [count, setCount] = useState(5);

    useEffect(() => {
        async function loadSharedPoints() {
            setLoading(true);
            setError(null);
            try {
                const data = await wrapServerAction(getSharedPointsForStudent)();
                setSharedPoints(data);
            } catch (err) {
                setError('We could not load what was shared with you. Reload the page to try again.');
            } finally {
                setLoading(false);
            }
        }

        loadSharedPoints();
    }, []);

    const visibleEvents = sharedPoints.slice(0, count);
    const canExpand = count < sharedPoints.length;

    if (loading) {
        return (
            <div className="w-full max-w-full" role="status">
                <div className="space-y-3 py-5" aria-label="Loading points shared with you">
                    <div className="h-8 w-40 animate-pulse rounded-md bg-secondary" />
                    <div className="h-20 animate-pulse rounded-lg bg-muted" />
                    <span className="sr-only">Loading points shared with you…</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full max-w-full">
                <div role="alert" className="py-4 text-center text-base font-semibold text-destructive">{error}</div>
            </div>
        );
    }

    if (sharedPoints.length === 0) {
        return (
            <div className="w-full max-w-full">
                <div className="py-12 text-center text-muted-foreground">
                    <p className="font-display text-xl font-semibold text-foreground">Nothing has been shared with you yet</p>
                    <p className="mt-2 text-base">When students in your groups choose to share a point, it shows up here.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="vic-enter w-full max-w-full">
            <div className="mb-6 space-y-2">
                <SectionTitle>Shared with me</SectionTitle>
                <p className="text-base text-muted-foreground">Points that students in your groups chose to show you.</p>
            </div>
            <div className="space-y-4">
                {visibleEvents.map((event) => (
                    <section key={event.eventId} className="vic-plate">
                        {/* Event header */}
                        <div className="mb-2 flex items-start gap-3 border-b border-rule pb-4">
                            <span
                                aria-hidden="true"
                                className="vic-dot mt-1.5 h-3 w-3"
                                style={{ backgroundColor: event.pointGroup.color }}
                            />
                            <div className="min-w-0 flex-1">
                                <h3 className="font-display text-xl font-semibold leading-tight">
                                    {event.eventName || 'Untitled assignment'}
                                </h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {formatDate(event.eventDate)} · {event.pointGroup.name}
                                </p>
                            </div>
                        </div>

                        {/* Shared points list */}
                        <div>
                            {event.sharedPoints.map((point) => (
                                <LedgerRow
                                    key={point.key}
                                    title={`${point.sharer.firstName} ${point.sharer.lastName}`}
                                    amount={`+${point.pointValue}`}
                                />
                            ))}
                        </div>
                    </section>
                ))}
            </div>
            {canExpand && (
                <div className="mt-8 flex justify-center">
                    <button
                        className="button-primary h-auto min-h-11 px-6 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        onClick={() => setCount(count + 5)}
                    >
                        Show {Math.min(5, sharedPoints.length - count)} more
                    </button>
                </div>
            )}
        </div>
    );
}
