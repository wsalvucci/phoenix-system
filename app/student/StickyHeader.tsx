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
        <div className="victorian-header w-full max-w-full overflow-x-hidden">
            <div className="container mx-auto px-4 victorian-header-content max-w-full">
                <div className="flex items-start justify-between victorian-header-main min-w-0">
                    <div className="space-y-2 victorian-fade-in flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-3 min-w-0">
                            <h1 className="victorian-header-name text-2xl md:text-3xl font-bold text-white truncate">
                                {student.firstName} {student.lastName}
                            </h1>
                        </div>
                        <div className="victorian-header-details flex items-center gap-4 text-white/90 text-sm flex-wrap">
                            <span className="flex items-center gap-2 flex-shrink-0">
                                Grade {student.grade}
                            </span>
                            <span className="flex items-center gap-2 truncate min-w-0">
                                {timeframe.name}
                            </span>
                        </div>
                    </div>
                    <div className="text-right victorian-fade-in victorian-delay-1 flex-shrink-0 ml-2">
                        <div className="victorian-stat">
                            <div className="victorian-header-points victorian-stat-number text-white text-xl md:text-2xl">
                                {totalPoints.toLocaleString()}pts
                            </div>
                            {monthlyTrends?.currentMonth && (() => {
                                const inc = monthlyTrends.currentMonth.pointIncrease;
                                const pct = Math.round(monthlyTrends.currentMonth.percentageIncrease);
                                const incSign = inc > 0 ? '+' : inc < 0 ? '-' : '';
                                const pctSign = pct > 0 ? '+' : pct < 0 ? '-' : '';
                                const colorClass = inc > 0 ? 'text-green-400' : inc < 0 ? 'text-red-400' : 'text-gray-300';
                                return (
                                    <div className={`${colorClass} text-xs mt-1`}>
                                        {incSign}{Math.abs(inc)}pts ({pctSign}{Math.abs(pct)}%)
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
