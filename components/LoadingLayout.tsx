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
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700 dark:border-slate-300"></div>
    </div>
  )
}