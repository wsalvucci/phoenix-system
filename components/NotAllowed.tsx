import Link from "next/link";

/** Shown when a staff page cannot load for this account (wrong role or not signed in). */
export default function NotAllowed({ what }: { what: string }) {
    return (
        <div role="alert" className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6 text-center">
            <h1 className="text-2xl font-bold">You do not have access to {what}</h1>
            <p className="max-w-md text-sm text-slate-600 dark:text-slate-300">
                This page is for a different kind of account, or we could not load it. Go back to the home page to see where you can go.
            </p>
            <Link href="/" className="button-primary min-h-[44px]">Back to home</Link>
        </div>
    );
}
