import React from "react";

type LoadingStateProps<T> = {
  isLoading: boolean;
  error: Error | null;
  data: T | null | undefined;
  fallback?: React.ReactNode;
  errorFallback?: (error: Error) => React.ReactNode;
  children: (data: T) => React.ReactNode;
};

export function LoadingState<T>({
  isLoading,
  error,
  data,
  fallback = <DefaultSpinner />,
  errorFallback = (err) => <div>Error: {err.message}</div>,
  children,
}: LoadingStateProps<T>) {
  if (isLoading) return <>{fallback}</>;
  if (error) return <>{errorFallback(error)}</>;
  if (!data) return <>{fallback}</>; // Show fallback when data is null/undefined

  return <>{children(data)}</>;
}

function DefaultSpinner() {
  return (
    <div className="w-full animate-pulse space-y-4 p-6" role="status" aria-label="Loading content">
      <div className="h-8 w-56 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-4 w-80 max-w-full rounded bg-slate-200 dark:bg-slate-800" />
      <div className="grid gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map(item => (
          <div key={item} className="h-28 rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900" />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  )
}
