"use client";

import { KeyboardEvent, useState } from "react";
import { createSchool } from "../actions";
import { redirect } from "next/navigation";

export default function CreateSchool({ adminId }: { adminId: number }) {
    createSchool.bind(null, adminId)

    const [nameTooSmallError, setNameTooSmallError] = useState(false);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            if (!e.currentTarget.value || e.currentTarget.value.length < 3) {
                setNameTooSmallError(true);
            } else {
                setNameTooSmallError(false);
                console.log("Create School: " + e.currentTarget.value);
                createSchool(e.currentTarget.value, adminId);
                redirect("/admin");
            }
        }
    }

    return (
        <div>
            <div>
                <input
                    className="px-4 py-2 dark:bg-slate-700 border border-gray-300 rounded-md"
                    type="text"
                    placeholder="School Name"
                    onKeyDown={(e) => handleKeyDown(e)}
                />
            </div>
            <div>
                {nameTooSmallError && <div className="text-red-500">School name must be at least 3 characters long</div>}
            </div>
        </div>
    )
}