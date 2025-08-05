import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
    refetchOnWindowFocus: false,
    onError: (err) => {
      console.error('Auth check failed:', err);
    },
  });

  const login = () => {
    window.location.href = "/api/login";
  };

  const logout = async () => {
    try {
      // Make a logout request
      const response = await fetch('/api/logout', {
        method: 'GET',
        credentials: 'include'
      });
      
      console.log('Logout response:', response.status);
      
      // Force page refresh to clear all state
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect anyway
      window.location.href = '/';
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    login,
    logout,
  };
}