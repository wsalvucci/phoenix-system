'use client';

import { Student, StudentMonthlyTrends } from '@/types/domain';

interface StickyHeaderProps {
    student: Student;
    totalPoints: number;
    monthlyTrends: StudentMonthlyTrends | null;
    timeframe: {
        id: number;
        name: string;
        startsAt: string;
        endsAt: string;
        active: boolean;
    };
}

export default function StickyHeader({ student, totalPoints, monthlyTrends, timeframe }: StickyHeaderProps) {
    return (
        <div className="victorian-header">
            <div className="container mx-auto px-4 victorian-header-content">
                <div className="flex items-start justify-between victorian-header-main">
                    <div className="space-y-2 victorian-fade-in">
                        <div className="flex items-center gap-3">
                            <h1 className="victorian-header-name text-2xl md:text-3xl font-bold text-white">
                                {student.firstName} {student.lastName}
                            </h1>
                        </div>
                        <div className="victorian-header-details flex items-center gap-4 text-white/90 text-sm">
                            <span className="flex items-center gap-2">
                                Grade {student.grade}
                            </span>
                            <span className="flex items-center gap-2">
                                {timeframe.name}
                            </span>
                        </div>
                    </div>
                    <div className="text-right victorian-fade-in victorian-delay-1">
                        <div className="victorian-stat">
                            <div className="victorian-header-points victorian-stat-number text-white text-xl md:text-2xl">
                                {totalPoints.toLocaleString()}pts
                            </div>
                            {monthlyTrends?.currentMonth && (
                                <div className="text-green-400 text-xs mt-1">
                                    +{monthlyTrends.currentMonth.pointIncrease}pts ({Math.round(monthlyTrends.currentMonth.percentageIncrease)}%)
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
