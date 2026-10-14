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
    onSuccess?: (message?: string) => void;
}

export default function SharePointModal({ studentPointId, eventName, isOpen, onClose, onSuccess }: SharePointModalProps) {
    const [groups, setGroups] = useState<StudentGroupWithChildren[]>([]);
    const [selectedGroupIds, setSelectedGroupIds] = useState<Set<number>>(new Set());
    const [existingShareIds, setExistingShareIds] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);

    // Fetch groups and existing shares
    useEffect(() => {
        if (!isOpen) return;

        async function loadData() {
            setLoading(true);
            setError(null);
            setLoadFailed(false);
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
                setLoadFailed(true);
                setError('We could not load your groups. Close this and try again.');
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

    const groupName = (id: number) => {
        for (const g of groups) {
            if (g.id === id) return g.name;
            const child = g.childGroups.find(c => c.id === id);
            if (child) return child.name;
        }
        return 'your group';
    };

    const commit = async (next: Set<number>, successMessage: string) => {
        setSaving(true);
        setError(null);

        try {
            const toShare = Array.from(next).filter(id => !existingShareIds.has(id));
            const toUnshare = Array.from(existingShareIds).filter(id => !next.has(id));

            // Perform share/unshare operations
            const results = await Promise.all([
                ...toShare.map(groupId => wrapServerAction(shareStudentPoint)(studentPointId, [groupId])),
                ...toUnshare.map(groupId => wrapServerAction(unshareStudentPoint)(studentPointId, [groupId]))
            ]);

            const hasError = results.some(r => !r.success);
            if (hasError) {
                // Some calls may have landed: reload what is really shared so the button tells the truth.
                try {
                    const fresh = new Set(await wrapServerAction(getPointSharedGroups)(studentPointId));
                    setExistingShareIds(fresh);
                } catch {
                    // keep the previous state; the message below still tells the student what to do
                }
                setError('Some changes did not save. Check your groups and try again.');
            } else {
                setExistingShareIds(new Set(next));
                onSuccess?.(successMessage);
                onClose();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Your changes did not save. Try again.');
        } finally {
            setSaving(false);
        }
    };

    const isSingle = groups.length === 1;
    const onlyGroup = isSingle ? groups[0] : null;
    const onlyGroupIds = onlyGroup ? [onlyGroup.id, ...onlyGroup.childGroups.map(c => c.id)] : [];
    const onlyGroupShared = onlyGroup ? existingShareIds.has(onlyGroup.id) : false;

    // One tap for the common case: a student in a single group.
    const handleSingleToggle = () => {
        if (!onlyGroup) return;
        if (onlyGroupShared) {
            commit(new Set(), 'Stopped sharing');
        } else {
            commit(new Set(onlyGroupIds), `Shared with ${onlyGroup.name}`);
        }
    };

    // Multi-group: the button says what pressing it will do.
    const changed =
        selectedGroupIds.size !== existingShareIds.size ||
        Array.from(selectedGroupIds).some(id => !existingShareIds.has(id));
    let actionLabel: string;
    let actionHint: string | null = null;
    let toastMessage: string;
    if (!changed) {
        actionLabel = existingShareIds.size === 0 ? 'Share' : 'Update sharing';
        actionHint = existingShareIds.size === 0 ? 'Pick at least one group' : 'Change a group above to update';
        toastMessage = '';
    } else if (selectedGroupIds.size === 0) {
        actionLabel = 'Stop sharing';
        toastMessage = 'Stopped sharing';
    } else if (existingShareIds.size > 0) {
        actionLabel = 'Update sharing';
        toastMessage = 'Sharing updated';
    } else {
        const n = selectedGroupIds.size;
        actionLabel = `Share with ${n} ${n === 1 ? 'group' : 'groups'}`;
        toastMessage = n === 1 ? `Shared with ${groupName(Array.from(selectedGroupIds)[0])}` : `Shared with ${n} groups`;
    }

    const includedNames = (g: StudentGroupWithChildren) => g.childGroups.map(c => c.name);
    const joinNames = (names: string[]) =>
        names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

    const title = loading
        ? `Share "${eventName}"`
        : onlyGroup
            ? `Share "${eventName}" with ${onlyGroup.name}`
            : `Share "${eventName}" with your groups`;

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="share-point-title"
                className="victorian-content w-full max-w-md max-h-[90vh] bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header - Mobile optimized */}
                <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <div className="flex items-center justify-between mb-2">
                        <h2 id="share-point-title" className="victorian-title text-xl sm:text-2xl font-bold">{title}</h2>
                        <button
                            onClick={onClose}
                            className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            aria-label="Close"
                        >
                            <span className="text-2xl">×</span>
                        </button>
                    </div>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {loading ? (
                        <div className="space-y-3" role="status">
                            {[0, 1, 2].map(i => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />)}
                            <span className="sr-only">Loading your groups…</span>
                        </div>
                    ) : loadFailed ? (
                        <p role="alert" className="py-4 text-red-700 dark:text-red-400">{error}</p>
                    ) : groups.length === 0 ? (
                        <div className="py-8 text-center text-slate-600 dark:text-slate-400">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">You are not in any groups yet.</p>
                            <p className="mt-2 text-sm">Your teacher adds students to groups, so there is nothing to share with right now.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="pb-2 text-sm text-slate-700 dark:text-slate-300">
                                    {onlyGroup ? (
                                        <>Students in <strong>{onlyGroup.name}</strong>{onlyGroup.childGroups.length > 0 && <>, including {joinNames(includedNames(onlyGroup))},</>} will see your name, this assignment, and the points you earned.</>
                                    ) : (
                                        <>Students in the groups you pick will see your name, this assignment, and the points you earned.</>
                                    )}{' '}
                                    Students who join those groups later will see it too. You can stop sharing at any time.
                            </p>
                            {isSingle ? null : groups.map(group => {
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
                                                        Includes {joinNames(includedNames(group))}
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
                            {isSingle && onlyGroup && (
                                <button
                                    type="button"
                                    onClick={handleSingleToggle}
                                    disabled={saving}
                                    className="victorian-button mt-2 min-h-12 w-full rounded-lg px-4 py-3 text-base font-semibold disabled:opacity-50"
                                >
                                    {saving ? 'Saving…' : onlyGroupShared ? `Stop sharing with ${onlyGroup.name}` : `Share with ${onlyGroup.name}`}
                                </button>
                            )}
                            {error && <p role="alert" className="pt-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
                        </div>
                    )}
                </div>

                {/* Footer: single group shares from the body button; everyone else gets one outcome-labelled button. */}
                <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 space-y-2">
                    {!loading && !loadFailed && groups.length > 1 && (
                        <>
                            <button
                                onClick={() => commit(selectedGroupIds, toastMessage)}
                                disabled={saving || !changed}
                                className="w-full px-4 py-3 rounded-lg victorian-button font-semibold transition-colors min-h-12 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Saving…' : actionLabel}
                            </button>
                            {actionHint && <p className="text-center text-sm text-slate-600 dark:text-slate-400">{actionHint}</p>}
                        </>
                    )}
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-h-[44px] text-base"
                    >
                        {!loading && !loadFailed && groups.length > 0 ? 'Cancel' : 'Close'}
                    </button>
                </div>
            </div>
        </div>
    );
}

