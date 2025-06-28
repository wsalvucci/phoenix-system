/**
 * Generic wrapper for server actions to make them compatible with React Query
 * Usage: queryFn: () => wrapServerAction(yourServerAction)
 */
export function wrapServerAction<T extends (...args: any[]) => Promise<any>>(
  serverAction: T
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>) => {
    return await serverAction(...args);
  };
} 