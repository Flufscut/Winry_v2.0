import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: (failureCount, error: any) => {
      // REF: Don't retry on 401 errors (logged out state)
      if (error?.status === 401) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // REF: Check if user is explicitly logged out (401 response)
  const isLoggedOut = error?.status === 401;

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !isLoggedOut,
    isLoggedOut,
    error,
  };
}
