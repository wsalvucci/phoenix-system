import Link from "next/link";
import { Student, StudentMonthlyTrends } from "@/types/domain";

interface StickyHeaderProps {
    student: Student;
    totalPoints: number;
    monthlyTrends: StudentMonthlyTrends | null;
    timeframe: { id: number; name: string; startsAt: string; endsAt: string; active: boolean };
}

export default function StickyHeader({ student, totalPoints, timeframe }: StickyHeaderProps) {
    return (
        <header className="student-identity">
            <div className="student-topline"><Link href="/">← Home</Link><span>PHOENIX / STUDENT RECORD</span><span className="student-record-mark" aria-hidden="true">◈</span></div>
            <div className="student-id-body">
                <div className="student-avatar" aria-hidden="true"><span>{student.firstName?.[0]}{student.lastName?.[0]}</span><small>PHOENIX</small></div>
                <div className="student-id-copy"><p className="student-kicker">Student profile</p><h1>{student.firstName} {student.lastName}</h1><div className="student-id-details"><span>Grade <strong>{student.grade}</strong></span><span>{timeframe.name}</span></div></div>
                <div className="student-id-seal" aria-hidden="true"><span>✦</span><small>STUDENT<br/>RECORD</small></div>
            </div>
            <div className="student-balance"><div><span className="student-kicker">Point balance</span><p>{timeframe.name}</p></div><div className="student-balance-value">{totalPoints.toLocaleString()}<span>PTS</span></div></div>
        </header>
    );
}
