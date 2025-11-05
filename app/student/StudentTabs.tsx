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

            {/* Tab Navigation - Fixed at bottom for easy thumb access */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 w-full max-w-full" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <div className="flex w-full max-w-full">
                    <button
                        onClick={() => setActiveTab("dashboard")}
                        className={`flex-1 px-4 py-3 sm:py-4 text-center font-medium transition-colors min-h-[44px] text-base sm:text-lg min-w-0 ${
                            activeTab === "dashboard"
                                ? "text-victorian-burgundy dark:text-victorian-dusty-rose border-t-2 border-victorian-burgundy dark:border-victorian-dusty-rose bg-slate-50 dark:bg-slate-800"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-700"
                        }`}
                    >
                        Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab("shared")}
                        className={`flex-1 px-4 py-3 sm:py-4 text-center font-medium transition-colors min-h-[44px] text-base sm:text-lg min-w-0 ${
                            activeTab === "shared"
                                ? "text-victorian-burgundy dark:text-victorian-dusty-rose border-t-2 border-victorian-burgundy dark:border-victorian-dusty-rose bg-slate-50 dark:bg-slate-800"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-700"
                        }`}
                    >
                        Hub
                    </button>
                </div>
            </div>
        </div>
    );
}

