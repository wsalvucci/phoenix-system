"use client";

import Link from "next/link";
import { redirect } from "next/navigation";

export function ForgotPassButton() {
    return (
        <Link className="flex justify-center border rounded-lg mt-5" href="/login/resetPassword">
            Forgot Password
        </Link>
    );
}