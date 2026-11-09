"use client";

import { useEffect, useRef } from "react";

/**
 * Replaces window.confirm(). Names exactly what will change (title + body), focuses the safe
 * choice first, and closes on Escape or backdrop tap. The confirm button is labeled by outcome.
 */
export default function ConfirmDialog({
    open,
    title,
    body,
    confirmLabel,
    cancelLabel = "Keep it",
    destructive = true,
    busy = false,
    onConfirm,
    onCancel,
}: {
    open: boolean;
    title: string;
    body?: string;
    confirmLabel: string;
    cancelLabel?: string;
    destructive?: boolean;
    busy?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const cancelRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;
        cancelRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onCancel();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onCancel]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onCancel();
            }}
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby={body ? "confirm-dialog-body" : undefined}
                className="w-full max-w-md rounded-lg bg-card text-foreground border border-border p-6 shadow-xl"
            >
                <h2 id="confirm-dialog-title" className="text-lg font-semibold">{title}</h2>
                {body && <p id="confirm-dialog-body" className="mt-2 text-sm text-muted-foreground">{body}</p>}
                <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <button
                        ref={cancelRef}
                        type="button"
                        onClick={onCancel}
                        disabled={busy}
                        className="min-h-[44px] px-4 rounded-lg border border-border font-medium"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={busy}
                        className={`min-h-[44px] px-4 rounded-lg font-medium text-white disabled:opacity-50 ${destructive ? "bg-red-600" : "bg-blue-600"}`}
                    >
                        {busy ? "Working..." : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
