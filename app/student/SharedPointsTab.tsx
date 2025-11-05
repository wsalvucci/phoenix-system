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

// Victorian Icons
const Scroll = () => <span className="text-xl">📜</span>;

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
                setError(err instanceof Error ? err.message : 'Failed to load shared points');
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
            <div className="victorian-content w-full max-w-full !mx-0 overflow-x-hidden">
                <div className="flex items-center justify-center py-12">
                    <div className="text-slate-600 dark:text-slate-400">Loading shared points...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="victorian-content w-full max-w-full !mx-0 overflow-x-hidden">
                <div className="text-red-600 dark:text-red-400 py-4 text-center">{error}</div>
            </div>
        );
    }

    if (sharedPoints.length === 0) {
        return (
            <div className="victorian-content w-full max-w-full !mx-0 overflow-x-hidden">
                <div className="text-center py-12 text-slate-600 dark:text-slate-400">
                    <div className="text-4xl mb-4">📭</div>
                    <p className="text-lg">No shared points yet</p>
                    <p className="text-sm mt-2">Points shared by other students will appear here</p>
                </div>
            </div>
        );
    }

    return (
        <div className="victorian-content w-full max-w-full !mx-0 overflow-x-hidden">
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
                                    {event.eventName || 'Unnamed Event'}
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
                                    key={point.studentPointId}
                                    className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                                >
                                    <div className="flex-1 min-w-0 overflow-hidden">
                                        <div className="font-medium text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">
                                            {point.sharer.firstName} {point.sharer.lastName}
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-3">
                                        <div className="font-bold text-base sm:text-lg text-victorian-burgundy dark:text-victorian-dusty-rose">
                                            +{point.pointValue} pts
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
                        <Scroll />
                        <span className="ml-2">Show More</span>
                    </button>
                </div>
            )}
        </div>
    );
}

