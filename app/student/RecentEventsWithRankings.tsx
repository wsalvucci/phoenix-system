"use client";
import React, { useState, useEffect } from "react";
import { rankToColor } from "@/types/domain";
import "./victorian-theme.css";
import SharePointModal from "./SharePointModal";
import { checkPointsSharedStatus } from "@/api/student";
import { wrapServerAction } from "@/utils/serverActionWrapper";

// Helper function to convert number to ordinal
function numberToOrdinal(num: number): string {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

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
const Clock = () => <span className="text-xl">⏰</span>;
const Share = () => <span className="text-lg">🔗</span>;

export default function RecentEventsWithRankings({ pointEventRankings, initialCount = 5 }: { pointEventRankings: any[], initialCount?: number }) {
    const [count, setCount] = useState(initialCount);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<{ studentPointId: number; eventName: string } | null>(null);
    const [sharedStatus, setSharedStatus] = useState<Record<number, boolean>>({});
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
    }, [visibleEvents]);
    
    const handleShareClick = (event: any) => {
        if (event.studentPointId) {
            setSelectedEvent({ studentPointId: event.studentPointId, eventName: event.eventName });
            setShareModalOpen(true);
        }
    };

    const handleShareSuccess = () => {
        // Refresh shared status after sharing
        const pointIds = visibleEvents
            .filter(e => e.studentPointId)
            .map(e => e.studentPointId);
        
        if (pointIds.length > 0) {
            wrapServerAction(checkPointsSharedStatus)(pointIds).then(setSharedStatus);
        }
        
        setShareModalOpen(false);
        setSelectedEvent(null);
    };
    
    return (
        <>
            <div className="victorian-content">
                <div className="flex items-center gap-3 mb-6">
                    <Clock />
                    <h3 className="victorian-title text-2xl">Recent Point Events</h3>
                </div>
                <p className="victorian-subtitle mb-8">
                    Your latest academic achievements and rankings
                </p>
                <div className="space-y-3">
                    {visibleEvents.map((event, index) => (
                        <div 
                            key={event.eventId}
                            className="victorian-list-item flex items-center justify-between victorian-slide-in"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                                <div 
                                    className="w-4 h-4 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: event.pointGroup.color }}
                                />
                                <div className="flex-1 min-w-0 overflow-hidden">
                                    <div className="font-medium victorian-subtitle truncate">{event.eventName}</div>
                                    <div className="text-sm text-gray-600">
                                        {formatDate(event.eventDate)}
                                    </div>
                                    {event.studentPointId && sharedStatus[event.studentPointId] && (
                                        <div className="mt-1">
                                            <span className="flex items-center gap-1 text-green-700 dark:text-green-400 text-xs font-medium">
                                                <span>✓</span>
                                                <span className="hidden sm:inline">Shared</span>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                                <div className="text-right">
                                    <div className="font-bold victorian-stat-number text-sm sm:text-base" style={{ color: rankToColor(event.rank) }}>
                                        +{event.points} pts
                                    </div>
                                    <div className="victorian-subtitle text-xs sm:text-sm">
                                        {numberToOrdinal(event.rank)} of {event.outOf}
                                    </div>
                                    <div className="text-xs text-gray-600 hidden sm:block">
                                        {event.pointGroup.name}
                                    </div>
                                </div>
                                {event.studentPointId && (
                                    <button
                                        onClick={() => handleShareClick(event)}
                                        className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
                                        aria-label="Share this point"
                                        title="Share this point"
                                    >
                                        <Share />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                {canExpand && (
                    <div className="flex justify-center mt-8">
                        <button
                            className="victorian-button px-6 py-3 rounded-lg min-h-[44px]"
                            onClick={() => setCount(count + 3)}
                        >
                            <Scroll />
                            <span className="ml-2">Show More</span>
                        </button>
                    </div>
                )}
            </div>
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
        </>
    );
} 