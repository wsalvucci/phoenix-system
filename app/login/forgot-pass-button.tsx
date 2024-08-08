"use client";

import { redirect } from "next/navigation";

export function ForgotPassButton() {
    return (
        <button
            className="rounded-md border-b"
            onClick={() => redirect("/login/resetPassword")}
        >
            Forgot Password
        </button>
    );
}