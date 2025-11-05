"use client";
import React, { useState, useEffect } from "react";
import { getStudentGroups, shareStudentPoint, unshareStudentPoint, getPointSharedGroups } from "@/api/student";
import { StudentGroupWithChildren } from "@/types/domain";
import { wrapServerAction } from "@/utils/serverActionWrapper";
import "./victorian-theme.css";

interface SharePointModalProps {
    studentPointId: number;
    eventName: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function SharePointModal({ studentPointId, eventName, isOpen, onClose, onSuccess }: SharePointModalProps) {
    const [groups, setGroups] = useState<StudentGroupWithChildren[]>([]);
    const [selectedGroupIds, setSelectedGroupIds] = useState<Set<number>>(new Set());
    const [existingShareIds, setExistingShareIds] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch groups and existing shares
    useEffect(() => {
        if (!isOpen) return;

        async function loadData() {
            setLoading(true);
            setError(null);
            try {
                const [groupsData, existingShareIdsArray] = await Promise.all([
                    wrapServerAction(getStudentGroups)(),
                    wrapServerAction(getPointSharedGroups)(studentPointId)
                ]);

                setGroups(groupsData);
                
                // Set existing shares
                const shareIds = new Set(existingShareIdsArray);
                setExistingShareIds(shareIds);
                setSelectedGroupIds(new Set(shareIds));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load groups');
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [isOpen, studentPointId]);

    const handleGroupToggle = (groupId: number, hasChildren: boolean) => {
        setSelectedGroupIds(prev => {
            const newSet = new Set(prev);
            
            if (newSet.has(groupId)) {
                // Unchecking parent - remove it and all children
                newSet.delete(groupId);
                const group = groups.find(g => g.id === groupId);
                if (group) {
                    group.childGroups.forEach(child => newSet.delete(child.id));
                }
            } else {
                // Checking parent - add it and all children
                newSet.add(groupId);
                const group = groups.find(g => g.id === groupId);
                if (group) {
                    group.childGroups.forEach(child => newSet.add(child.id));
                }
            }
            
            return newSet;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);

        try {
            // Get groups to share and unshare
            const toShare = Array.from(selectedGroupIds).filter(id => !existingShareIds.has(id));
            const toUnshare = Array.from(existingShareIds).filter(id => !selectedGroupIds.has(id));

            // Perform share/unshare operations
            const results = await Promise.all([
                ...toShare.map(groupId => wrapServerAction(shareStudentPoint)(studentPointId, [groupId])),
                ...toUnshare.map(groupId => wrapServerAction(unshareStudentPoint)(studentPointId, [groupId]))
            ]);

            const hasError = results.some(r => !r.success);
            if (hasError) {
                setError('Some operations failed. Please try again.');
            } else {
                setExistingShareIds(new Set(selectedGroupIds));
                onSuccess?.();
                onClose();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div 
                className="victorian-content w-full max-w-md max-h-[90vh] bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header - Mobile optimized */}
                <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="victorian-title text-xl sm:text-2xl font-bold">Share Points</h2>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            aria-label="Close"
                        >
                            <span className="text-2xl">×</span>
                        </button>
                    </div>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 truncate">
                        {eventName}
                    </p>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-slate-600 dark:text-slate-400">Loading groups...</div>
                        </div>
                    ) : error ? (
                        <div className="text-red-600 dark:text-red-400 py-4">{error}</div>
                    ) : groups.length === 0 ? (
                        <div className="text-center py-12 text-slate-600 dark:text-slate-400">
                            You are not in any groups.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {groups.map(group => {
                                const isSelected = selectedGroupIds.has(group.id);
                                const hasChildren = group.childGroups.length > 0;

                                return (
                                    <div key={group.id} className="space-y-1">
                                        <label className="flex items-center gap-3 p-3 sm:p-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors min-h-[44px]">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleGroupToggle(group.id, hasChildren)}
                                                className="w-5 h-5 sm:w-6 sm:h-6 rounded border-slate-300 text-victorian-burgundy focus:ring-2 focus:ring-victorian-burgundy focus:ring-offset-2 cursor-pointer"
                                            />
                                            <div className="flex-1">
                                                <div className="font-medium text-base sm:text-lg text-slate-900 dark:text-slate-100">
                                                    {group.name}
                                                </div>
                                                {hasChildren && (
                                                    <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                        {group.childGroups.length} {group.childGroups.length === 1 ? 'subgroup' : 'subgroups'} included
                                                    </div>
                                                )}
                                            </div>
                                        </label>
                                        
                                        {/* Child groups - Indented */}
                                        {hasChildren && (
                                            <div className="ml-8 sm:ml-12 space-y-1">
                                                {group.childGroups.map(child => {
                                                    const childSelected = selectedGroupIds.has(child.id);
                                                    return (
                                                        <label
                                                            key={child.id}
                                                            className="flex items-center gap-3 p-2 sm:p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors min-h-[44px]"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={childSelected}
                                                                onChange={() => handleGroupToggle(child.id, false)}
                                                                className="w-4 h-4 sm:w-5 sm:h-5 rounded border-slate-300 text-victorian-burgundy focus:ring-2 focus:ring-victorian-burgundy focus:ring-offset-2 cursor-pointer"
                                                            />
                                                            <div className="text-sm sm:text-base text-slate-700 dark:text-slate-300">
                                                                {child.name}
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer - Mobile optimized buttons */}
                <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 sm:py-3.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-h-[44px] text-base"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading || saving}
                        className="flex-1 px-4 py-3 sm:py-3.5 rounded-lg victorian-button font-medium transition-colors min-h-[44px] text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}

