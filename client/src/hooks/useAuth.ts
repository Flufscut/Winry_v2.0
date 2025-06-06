import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
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
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    retry: (failureCount, error: any) => {
      // REF: Don't retry on 401 errors (logged out state)
      if (error?.message?.includes('401')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnWindowFocus: false, // Prevent unnecessary refetches on window focus
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  // REF: Check if user is explicitly logged out (401 response)
  const isLoggedOut = error?.message?.includes('401');

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !isLoggedOut,
    isLoggedOut,
    error,
  };
}
