"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getDisplayBoards } from "@/app/supaApi/server/dashboard/displayBoards";
import type { DisplayBoard, DisplayBoards } from "@/app/supaApi/universal/displayTypes";
import { useDashboardSchool } from "@/app/dashboard/useDashboardSchool";
import { useTheme } from "@/components/ThemeProvider";
import { LedgerRow } from "@/components/display/LedgerRow";
import { OrnamentDivider } from "@/components/display/OrnamentDivider";
import { formatPoints, toDisplayRows, visibleRows } from "../featured/screens/displayData";
import "../honor-board.css";

function Board({ board, title, level }: { board: DisplayBoard; title: string; level: 1 | 2 }) {
    const rows = visibleRows(toDisplayRows(board));
    const Heading = level === 1 ? "h1" : "h3";
    return (
        <section className="hb-phone-section">
            <Heading className="hb-phone-title">{title}</Heading>
            <OrnamentDivider />
            <div className="hb-phone-list">
                {rows.map((r) => (
                    <LedgerRow key={r.key} rank={r.rank} name={r.name} points={formatPoints(r.points)} />
                ))}
            </div>
        </section>
    );
}

/** Phone view of the same boards: one column, follows the device's light or dark mode. */
export default function MobileDashboard() {
    const [mobileDashData, setMobileDashData] = useState<DisplayBoards | null>(null);
    const { theme } = useTheme();
    const { schoolId } = useDashboardSchool();

    useEffect(() => {
        if (schoolId === null) return;
        getDisplayBoards(schoolId, null).then((data) => {
            setMobileDashData(data);
        });
    }, [schoolId]);

    return (
        <div className={`honor-board hb-phone ${theme === "dark" ? "dark" : ""}`}>
            <div className="hb-phone-wrap">
                {mobileDashData && <Board board={mobileDashData.overall} title="Top Students" level={1} />}
                <Link href="/student" className="hb-phone-link">View Your Page</Link>
                <div className="hb-phone-section">
                        <h2 className="hb-phone-title">Top Students by Grade</h2>
                        <OrnamentDivider />
                        {mobileDashData?.grades.map((grade) => (
                            <Board key={grade.key} board={grade} title={grade.title} level={2} />
                        ))}
                </div>
            </div>
        </div>
    );
}
