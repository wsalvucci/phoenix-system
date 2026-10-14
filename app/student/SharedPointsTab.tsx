"use client";
import React, { useState, useEffect } from "react";
import { getSharedPointsForStudent } from "@/api/student";
import { SharedPointData } from "@/types/domain";
import { wrapServerAction } from "@/utils/serverActionWrapper";
import "./victorian-theme.css";

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
            <div className="victorian-content w-full max-w-full !mx-0 overflow-x-hidden" role="status">
                <div className="space-y-3 py-5" aria-label="Loading points shared with you">
                    <div className="h-5 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/70" />
                    <span className="sr-only">Loading points shared with you…</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="victorian-content w-full max-w-full !mx-0 overflow-x-hidden">
                <div role="alert" className="text-red-700 dark:text-red-400 py-4 text-center">{error}</div>
            </div>
        );
    }

    if (sharedPoints.length === 0) {
        return (
            <div className="victorian-content w-full max-w-full !mx-0 overflow-x-hidden">
                <div className="text-center py-12 text-slate-600 dark:text-slate-400">
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">Nothing has been shared with you yet</p>
                    <p className="text-sm mt-2">When students in your groups choose to share a point, it shows up here.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="victorian-content w-full max-w-full !mx-0 overflow-x-hidden">
            <div className="mb-5 border-b border-slate-200 pb-4 dark:border-slate-800">
                <h2 className="text-xl font-bold">Shared with me</h2>
                <p className="mt-1 text-sm text-slate-500">Points that students in your groups chose to show you.</p>
            </div>
            <div className="space-y-6">
                {visibleEvents.map((event, eventIndex) => (
                    <div 
                        key={event.eventId}
                        className="victorian-list-item victorian-slide-in"
                        style={{ animationDelay: `${eventIndex * 0.1}s` }}
                    >
                        {/* Event Header */}
                        <div className="flex items-start gap-3 sm:gap-4 mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                            <div 
                                className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex-shrink-0 mt-1"
                                style={{ backgroundColor: event.pointGroup.color }}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="font-bold victorian-subtitle text-base sm:text-lg mb-1">
                                    {event.eventName || 'Untitled assignment'}
                                </div>
                                <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-1">
                                    {formatDate(event.eventDate)}
                                </div>
                                <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-500">
                                    {event.pointGroup.name}
                                </div>
                            </div>
                        </div>

                        {/* Shared Points List */}
                        <div className="space-y-2 sm:space-y-3">
                            {event.sharedPoints.map((point) => (
                                <div 
                                    key={point.key}
                                    className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                                >
                                    <div className="flex-1 min-w-0 overflow-hidden">
                                        <div className="font-medium text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">
                                            {point.sharer.firstName} {point.sharer.lastName}
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-3">
                                        <div className="font-bold text-base sm:text-lg text-victorian-burgundy dark:text-victorian-dusty-rose">
                                            +{point.pointValue}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            {canExpand && (
                <div className="flex justify-center mt-8">
                    <button
                        className="victorian-button px-6 py-3 rounded-lg min-h-[44px]"
                        onClick={() => setCount(count + 5)}
                    >
                        Show {Math.min(5, sharedPoints.length - count)} more
                    </button>
                </div>
            )}
        </div>
    );
}
