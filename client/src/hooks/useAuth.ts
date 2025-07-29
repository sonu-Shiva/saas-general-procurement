import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

export function useAuth() {
  const [hasChecked, setHasChecked] = useState(false);
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false, // Don't retry - just check once
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep data in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnMount: false, // Don't refetch when component mounts again
  });

  // Mark as checked once we get a response (success or error)
  useEffect(() => {
    if (!isLoading && !hasChecked) {
      setHasChecked(true);
    }
  }, [isLoading, hasChecked]);

  return {
    user,
    isLoading: !hasChecked,
    isAuthenticated: !!user,
    error,
  };
}
