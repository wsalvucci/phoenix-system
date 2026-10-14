"use client";
import React, { useState } from "react";
import SharedPointsTab from "./SharedPointsTab";

interface StudentTabsProps {
    dashboardContent: React.ReactNode;
}

type TabType = "dashboard" | "shared";

export default function StudentTabs({ dashboardContent }: StudentTabsProps) {
    const [activeTab, setActiveTab] = useState<TabType>("dashboard");

    return (
        <div className="w-full max-w-full overflow-x-hidden">
            {/* Tab Content */}
            <div className="w-full max-w-full overflow-x-hidden pb-20 sm:pb-24">
                {activeTab === "dashboard" && dashboardContent}
                {activeTab === "shared" && <SharedPointsTab />}
            </div>

            <nav aria-label="Student pages" className="student-console-nav" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <div className="mx-auto flex w-full max-w-lg gap-2 px-3 pt-2">
                    <button
                        onClick={() => setActiveTab("dashboard")}
                        aria-current={activeTab === "dashboard" ? "page" : undefined}
                        className={`min-h-[44px] min-w-0 flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-colors ${
                            activeTab === "dashboard"
                                ? "bg-primary text-white"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-700"
                        }`}
                    >
                        My points
                    </button>
                    <button
                        onClick={() => setActiveTab("shared")}
                        aria-current={activeTab === "shared" ? "page" : undefined}
                        className={`min-h-[44px] min-w-0 flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-colors ${
                            activeTab === "shared"
                                ? "bg-primary text-white"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-700"
                        }`}
                    >
                        Shared with me
                    </button>
                </div>
            </nav>
        </div>
    );
}
