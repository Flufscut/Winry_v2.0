import { useQuery } from "@tanstack/react-query";

// REF: Circuit breaker to prevent infinite auth loops in production
let authFailureCount = 0;
let lastFailureTime = 0;
const MAX_AUTH_FAILURES = 3;
const FAILURE_RESET_TIME = 30000; // 30 seconds

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      // REF: Circuit breaker - stop making requests if too many failures
      const now = Date.now();
      if (now - lastFailureTime > FAILURE_RESET_TIME) {
        authFailureCount = 0;
      }
      
      if (authFailureCount >= MAX_AUTH_FAILURES) {
        throw new Error(`HTTP 401: Circuit breaker activated - too many auth failures`);
      }

      const response = await fetch("/api/auth/user", {
        credentials: "include",
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        if (response.status === 401) {
          authFailureCount++;
          lastFailureTime = now;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // REF: Reset failure count on successful request
      authFailureCount = 0;
      return response.json();
    },
    retry: false, // REF: Completely disable retries to prevent loops
    refetchOnWindowFocus: false, // Prevent unnecessary refetches on window focus
    refetchOnMount: true,
    refetchOnReconnect: false, // REF: Disable reconnect refetch
    refetchInterval: false, // REF: Disable automatic refetching
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
  });

  // REF: Check if user is explicitly logged out (401 response) or circuit breaker activated
  const isLoggedOut = error?.message?.includes('401') || error?.message?.includes('Circuit breaker') || false;

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !isLoggedOut,
    isLoggedOut,
    error,
  };
}
