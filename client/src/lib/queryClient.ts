/**
 * FILE: queryClient.ts
 * PURPOSE: React Query configuration for optimal caching and seamless user experience
 * DEPENDENCIES: TanStack React Query
 * LAST_UPDATED: December 15, 2024
 * 
 * REF: Configured for seamless analytics updates without jarring refresh behavior
 * REF: Updates only on meaningful page state changes (window focus, tab changes, manual refresh)
 */

import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
    cache: 'no-store', // Force no caching
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      cache: 'no-store', // Force no caching
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// REF: Create query client with optimized settings to reduce API calls
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes (was likely much shorter)
      gcTime: 10 * 60 * 1000, // 10 minutes - keep data in cache for 10 minutes
      retry: 2, // Reduce retries to prevent rate limit hits
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      refetchOnReconnect: false, // Don't refetch when reconnecting
      refetchOnMount: false, // Don't refetch when component mounts if data exists
    },
    mutations: {
      // REF: Retry mutations once on failure
      retry: 1,
      
      // REF: Mutation retry delay
      retryDelay: 1000,
    },
  },
});
