"use client";
import React, { useState, useEffect } from "react";
import { getStudentGroups, shareStudentPoint, unshareStudentPoint, getPointSharedGroups } from "@/api/student";
import { StudentGroupWithChildren } from "@/types/domain";
import { wrapServerAction } from "@/utils/serverActionWrapper";

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
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-off-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="share-point-title"
                className="vic-enter flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-lg border border-rule bg-card text-card-foreground shadow-3 sm:rounded-lg"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header - Mobile optimized */}
                <div className="flex-shrink-0 border-b border-rule p-4 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                        <h2 id="share-point-title" className="font-display text-xl font-semibold leading-tight sm:text-2xl">{title}</h2>
                        <button
                            onClick={onClose}
                            className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
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
                            {[0, 1, 2].map(i => <div key={i} className="h-12 animate-pulse rounded-lg bg-secondary" />)}
                            <span className="sr-only">Loading your groups…</span>
                        </div>
                    ) : loadFailed ? (
                        <p role="alert" className="py-4 text-base font-semibold text-destructive">{error}</p>
                    ) : groups.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                            <p className="font-display text-lg font-semibold text-foreground">You are not in any groups yet.</p>
                            <p className="mt-2 text-base">Your teacher adds students to groups, so there is nothing to share with right now.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="pb-2 text-sm text-muted-foreground">
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
                                        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors hover:bg-accent">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleGroupToggle(group.id, hasChildren)}
                                                className="h-5 w-5 cursor-pointer rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                                            />
                                            <div className="flex-1">
                                                <div className="text-base font-semibold text-foreground">
                                                    {group.name}
                                                </div>
                                                {hasChildren && (
                                                    <div className="mt-1 text-sm text-muted-foreground">
                                                        Includes {joinNames(includedNames(group))}
                                                    </div>
                                                )}
                                            </div>
                                        </label>
                                        
                                        {/* Child groups - Indented */}
                                        {hasChildren && (
                                            <div className="ml-8 space-y-1 sm:ml-12">
                                                {group.childGroups.map(child => {
                                                    const childSelected = selectedGroupIds.has(child.id);
                                                    return (
                                                        <label
                                                            key={child.id}
                                                            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent sm:p-3"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={childSelected}
                                                                onChange={() => handleGroupToggle(child.id, false)}
                                                                className="h-5 w-5 cursor-pointer rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                                                            />
                                                            <div className="text-base text-foreground">
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
                                    className="button-primary mt-2 h-auto min-h-12 w-full px-4 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                                >
                                    {saving ? 'Saving…' : onlyGroupShared ? `Stop sharing with ${onlyGroup.name}` : `Share with ${onlyGroup.name}`}
                                </button>
                            )}
                            {error && <p role="alert" className="pt-2 text-sm font-semibold text-destructive">{error}</p>}
                        </div>
                    )}
                </div>

                {/* Footer: single group shares from the body button; everyone else gets one outcome-labelled button. */}
                <div className="flex-shrink-0 space-y-2 border-t border-rule p-4 sm:p-6">
                    {!loading && !loadFailed && groups.length > 1 && (
                        <>
                            <button
                                onClick={() => commit(selectedGroupIds, toastMessage)}
                                disabled={saving || !changed}
                                className="button-primary h-auto min-h-12 w-full px-4 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                            >
                                {saving ? 'Saving…' : actionLabel}
                            </button>
                            {actionHint && <p className="text-center text-sm text-muted-foreground">{actionHint}</p>}
                        </>
                    )}
                    <button
                        onClick={onClose}
                        className="button-secondary h-auto min-h-11 w-full px-4 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                    >
                        {!loading && !loadFailed && groups.length > 0 ? 'Cancel' : 'Close'}
                    </button>
                </div>
            </div>
        </div>
    );
}

