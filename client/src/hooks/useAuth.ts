import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Circuit breaker variables to prevent infinite auth loops
let authFailureCount = 0;
let lastFailureTime = 0;
const MAX_AUTH_FAILURES = 3;
const FAILURE_RESET_TIME = 30000; // 30 seconds

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

export function useAuth() {
  const { data: user, isLoading, error, isSuccess } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      // Circuit breaker check - prevent auth loops that crash Railway
      const now = Date.now();
      
      // Reset failure count if enough time has passed
      if (now - lastFailureTime > FAILURE_RESET_TIME) {
        authFailureCount = 0;
      }
      
      // If too many failures, don't make request
      if (authFailureCount >= MAX_AUTH_FAILURES) {
        console.log('🔒 Circuit breaker: Too many auth failures, not making request');
        throw new Error('Circuit breaker: Authentication temporarily disabled');
      }

      try {
        const response = await apiRequest('GET', '/api/auth/user');
        const data = await response.json();
        
        if (!response.ok) {
          authFailureCount++;
          lastFailureTime = now;
          console.log(`🔒 Auth failure ${authFailureCount}/${MAX_AUTH_FAILURES}`);
          
          if (data.message) {
            throw new Error(data.message);
          }
          throw new Error('Authentication failed');
        }
        
        // Reset failure count on success
        authFailureCount = 0;
        return data;
      } catch (error) {
        authFailureCount++;
        lastFailureTime = now;
        console.log(`🔒 Auth error ${authFailureCount}/${MAX_AUTH_FAILURES}:`, error);
        throw error;
      }
    },
    retry: false, // CRITICAL: Disable all retries to prevent loops
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const isLoggedOut = error && !isLoading;
  
  return {
    user: user || null,
    isLoading,
    isLoggedOut,
    error
  };
}
