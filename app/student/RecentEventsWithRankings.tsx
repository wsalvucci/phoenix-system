"use client";
import React, { useState } from "react";
import { rankToColor } from "@/types/domain";
import "./victorian-theme.css";

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

export default function RecentEventsWithRankings({ pointEventRankings, initialCount = 5 }: { pointEventRankings: any[], initialCount?: number }) {
    const [count, setCount] = useState(initialCount);
    const visibleEvents = pointEventRankings.slice(0, count);
    const canExpand = count < pointEventRankings.length;
    
    return (
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
                        <div className="flex items-center gap-4">
                            <div 
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: event.pointGroup.color }}
                            />
                            <div>
                                <div className="font-medium victorian-subtitle">{event.eventName}</div>
                                <div className="text-sm text-gray-600">
                                    {formatDate(event.eventDate)}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-bold victorian-stat-number" style={{ color: rankToColor(event.rank) }}>
                                +{event.points} pts
                            </div>
                            <div className="victorian-subtitle text-sm">
                                {numberToOrdinal(event.rank)} of {event.outOf}
                            </div>
                            <div className="text-xs text-gray-600">
                                {event.pointGroup.name}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {canExpand && (
                <div className="flex justify-center mt-8">
                    <button
                        className="victorian-button px-6 py-3 rounded-lg"
                        onClick={() => setCount(count + 3)}
                    >
                        <Scroll />
                        <span className="ml-2">Show More</span>
                    </button>
                </div>
            )}
        </div>
    );
} 