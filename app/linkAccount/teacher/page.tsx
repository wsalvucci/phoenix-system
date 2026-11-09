import { Suspense } from "react";
import LinkAccountForm from "@/components/linkAccount/LinkAccountForm";

export default function LinkTeacher() {
    return (
        <Suspense fallback={<div className="mx-auto h-64 w-full max-w-md animate-pulse rounded-lg bg-muted" />}>
            <LinkAccountForm kind="teacher" />
        </Suspense>
    );
}
