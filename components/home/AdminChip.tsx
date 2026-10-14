"use client";

import { Admin } from "@/types/domain";
import { getAdminDataWithContext } from "@/api/admin";
import { useState, useEffect } from "react";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import MotionButton from "@/components/MotionButton";


export default function AdminChip() {
    const [isLoading, setIsLoading] = useState(true);
    const [admin, setAdmin] = useState<Admin | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const adminData = await getAdminDataWithContext();
                setAdmin(adminData);
                setError(null);
            } catch (err) {
                console.error('Failed to load admin data:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
                setAdmin(null);
            } finally {
                setIsLoading(false);
            }
        }

        fetchAdminData();
    }, []);

    if (isLoading) {
        return (
            <div className="h-16 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" aria-label="Loading administrator access">
            </div>
        );
    }

    if (error) {
        // In development, show the error for debugging
        if (process.env.NODE_ENV === 'development') {
            return (
                <div className="w-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <strong>Admin Error:</strong> {error}
                </div>
            );
        }
        // In production, don't show anything
        return null;
    }

    if (admin === null) {
        return null;
    }

    return (
        <MotionButton href="/admin" variant="outline" fullWidth className="min-h-14 !justify-between">
            <div className="font-bold">
                Administration
            </div>
            <div>
                Open dashboard <FontAwesomeIcon icon={faArrowRight} />
            </div>
        </MotionButton>
    )
}
