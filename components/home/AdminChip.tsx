"use client";

import { Admin } from "@/types/domain";
import { getOwnAdminData } from "@/api/admin";
import { useState, useEffect } from "react";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import MotionButton from "@/components/MotionButton";
import { wrapServerAction } from "@/utils/serverActionWrapper";

export default function AdminChip() {
    const [isLoading, setIsLoading] = useState(true);
    const [admin, setAdmin] = useState<Admin | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const adminData = await wrapServerAction(getOwnAdminData)();
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
            <div className="w-full bg-gray-200 rounded-lg px-4 py-6 animate-pulse">
                Loading...
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
        <MotionButton href="/admin" variant="primary" fullWidth>
            <div className="font-bold">
                Admin Page
            </div>
            <div>
                Visit Admin Dashboard &nbsp; <FontAwesomeIcon icon={faArrowRight} />
            </div>
        </MotionButton>
    )
}