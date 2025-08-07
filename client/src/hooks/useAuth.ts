import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 0, // Always check auth status
    gcTime: 0, // Don't cache auth data
  });

  const login = async () => {
    try {
      console.log('🔐 Attempting to login...');

      // Call the login API to restore authentication state
      const user = await apiRequest('/api/auth/login', { method: 'POST' });
      console.log('✅ Login API response:', user);

      // Update the cache with the returned user data immediately
      queryClient.setQueryData(['/api/auth/user'], user);
      console.log('📝 Updated cache with user data');

      // Invalidate and refetch the auth query to ensure consistency
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      console.log('🔄 Invalidated auth queries');

      return user;
    } catch (error) {
      console.error('❌ Login error:', error);

      // Re-throw the error so the calling component can handle it
      throw new Error('Login failed. Please try again.');
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Attempting to logout...');

      // Make logout request first
      await apiRequest('/api/auth/logout', { method: 'POST' });
      console.log('✅ Logout API call successful');

      // Clear the user data from cache immediately
      queryClient.setQueryData(['/api/auth/user'], null);
      console.log('🗑️ Cleared user data from cache');

      // Clear all other cached data
      queryClient.clear();
      console.log('🧹 Cleared all cached data');

      // Force page refresh to clear all state
      console.log('🔄 Reloading page...');
      window.location.reload();
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Force logout anyway by clearing cache and reloading
      queryClient.setQueryData(['/api/auth/user'], null);
      queryClient.clear();
      window.location.reload();
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