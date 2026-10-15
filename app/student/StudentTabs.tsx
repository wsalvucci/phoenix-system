"use client";
import React, { useState } from "react";
import SharedPointsTab from "./SharedPointsTab";

interface StudentTabsProps {
    dashboardContent: React.ReactNode;
}

type TabType = "dashboard" | "shared";

export default function StudentTabs({ dashboardContent }: StudentTabsProps) {
    const [activeTab, setActiveTab] = useState<TabType>("dashboard");

    const tab = (active: boolean) =>
        `min-h-11 min-w-0 flex-1 rounded-lg px-3 py-2.5 text-center text-sm font-semibold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
            active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent active:bg-secondary"
        }`;

    return (
        <div className="w-full max-w-full">
            {/* Tab Content */}
            <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8">
                {activeTab === "dashboard" && dashboardContent}
                {activeTab === "shared" && <SharedPointsTab />}
            </div>

            <nav aria-label="Student pages" className="vic-nav" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <div className="mx-auto flex w-full max-w-lg gap-2 px-3 py-2">
                    <button
                        onClick={() => setActiveTab("dashboard")}
                        aria-current={activeTab === "dashboard" ? "page" : undefined}
                        className={tab(activeTab === "dashboard")}
                    >
                        My points
                    </button>
                    <button
                        onClick={() => setActiveTab("shared")}
                        aria-current={activeTab === "shared" ? "page" : undefined}
                        className={tab(activeTab === "shared")}
                    >
                        Shared with me
                    </button>
                </div>
            </nav>
        </div>
    );
}
