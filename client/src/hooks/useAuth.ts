import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
    refetchOnWindowFocus: false,
  });

  const login = () => {
    if (process.env.NODE_ENV === 'development') {
      // For development, just refresh to get the dev user
      window.location.reload();
    } else {
      window.location.href = "/api/login";
    }
  };

  const logout = async () => {
    try {
      // Clear React Query cache first
      queryClient.clear();
      
      // Make logout request
      await apiRequest('/api/auth/logout', { method: 'POST' });
      
      // Force page refresh to clear all state
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect anyway
      queryClient.clear();
      window.location.href = '/';
    }
  };

  const switchRole = async (newRole: string) => {
    try {
      const updatedUser = await apiRequest('/api/auth/user/role', { 
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Update the cache with the new user data
      queryClient.setQueryData(['/api/auth/user'], updatedUser);
      
      // Invalidate all queries to refresh data with new role
      queryClient.invalidateQueries();
      
      return updatedUser;
    } catch (error) {
      console.error('Role switch error:', error);
      throw error;
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    login,
    logout,
    switchRole,
  };
}