import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useEffect } from "react";

// Circuit breaker variables to prevent infinite auth loops
let authFailureCount = 0;
let lastFailureTime = 0;
const MAX_AUTH_FAILURES = 10; // Temporarily increased for debugging
const FAILURE_RESET_TIME = 30000; // Reduced to 30 seconds

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

export function useAuth() {
  const [location] = useLocation();
  
  // Reset circuit breaker on route changes (especially after OAuth redirects)
  useEffect(() => {
    if (location === '/dashboard' || location === '/') {
      // Reset circuit breaker when navigating to protected routes
      // This allows OAuth redirects to work properly
      authFailureCount = 0;
      lastFailureTime = 0;
      console.log('🔄 Route change detected, resetting auth circuit breaker');
    }
  }, [location]);
  
  // Check circuit breaker before even creating the query
  const now = Date.now();
  if (now - lastFailureTime > FAILURE_RESET_TIME) {
    authFailureCount = 0;
  }
  
  const isCircuitBreakerActive = authFailureCount >= MAX_AUTH_FAILURES;
  
  const { data: user, isLoading, error, isSuccess } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      console.log('🔄 Starting auth request...');
      
      // Double-check circuit breaker in query function
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
        console.log('🌐 Making API request to /api/auth/user...');
        const response = await apiRequest('GET', '/api/auth/user');
        console.log('📡 Response received:', response.status, response.statusText);
        
        const data = await response.json();
        console.log('📄 Response data:', data);
        
        if (!response.ok) {
          authFailureCount++;
          lastFailureTime = now;
          console.log(`🔒 Auth failure ${authFailureCount}/${MAX_AUTH_FAILURES}:`, data.message || 'Unknown error');
          
          if (data.message) {
            throw new Error(data.message);
          }
          throw new Error('Authentication failed');
        }
        
        // Reset failure count on success
        authFailureCount = 0;
        console.log('✅ Authentication successful:', data);
        // Extract user from the response format {success: true, user: {...}}
        return data.user || data;
      } catch (error) {
        authFailureCount++;
        lastFailureTime = now;
        console.log(`🔒 Auth error ${authFailureCount}/${MAX_AUTH_FAILURES}:`, error);
        console.error('🚨 Full error details:', error);
        throw error;
      }
    },
    enabled: !isCircuitBreakerActive, // CRITICAL: Don't run query if circuit breaker is active
    retry: false, // CRITICAL: Disable all retries to prevent loops
    refetchOnMount: true, // Allow refetch on mount for OAuth redirects
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 30 * 1000, // Reduced to 30 seconds for faster OAuth response
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const isLoggedOut = (error && !isLoading) || isCircuitBreakerActive;
  
  console.log('🔍 Auth state:', { 
    user: !!user, 
    isLoading, 
    isLoggedOut, 
    error: error?.message,
    circuitBreakerActive: isCircuitBreakerActive,
    failureCount: authFailureCount
  });
  
  return {
    user: user || null,
    isLoading: isLoading && !isCircuitBreakerActive,
    isLoggedOut,
    error: isCircuitBreakerActive ? new Error('Authentication temporarily disabled') : error
  };
}
