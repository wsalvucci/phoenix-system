import { Suspense } from "react";
import LinkAccountForm from "@/components/linkAccount/LinkAccountForm";

export default function LinkParent() {
    return (
        <Suspense fallback={<div className="mx-auto h-64 w-full max-w-md animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />}>
            <LinkAccountForm kind="parent" />
        </Suspense>
    );
}
