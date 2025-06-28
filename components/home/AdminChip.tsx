"use client";

import { Admin } from "@/types/domain";
import { getOwnAdminData } from "@/api/admin";
import { useState, useEffect } from "react";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import MotionButton from "@/components/MotionButton";

export default function AdminChip() {
    const [isLoading, setIsLoading] = useState(true);
    const [admin, setAdmin] = useState<Admin | null>(null);

    useEffect(() => {
        const fetchAdminData = async () => {
            const adminData = await getOwnAdminData();
            setAdmin(adminData);
            setIsLoading(false);
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