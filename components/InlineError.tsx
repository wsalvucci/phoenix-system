/** Inline replacement for alert(): says what happened and stays on screen until the user acts again. */
export default function InlineError({ message, className = "" }: { message?: string | null; className?: string }) {
    if (!message) return null;
    return (
        <div role="alert" className={`rounded-lg border border-red-300 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200 dark:border-red-800 px-4 py-3 text-sm ${className}`}>
            {message}
        </div>
    );
}
