import { useQuery, useMutation } from "@tanstack/react-query";
import { djangoApiRequest, setTokens, clearTokens, getAccessToken } from "@/lib/djangoClient";
import { djangoQueryClient } from "@/lib/djangoClient";

export function useDjangoAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: !!getAccessToken(), // Only fetch if we have a token
  });

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const response = await djangoApiRequest('POST', '/api/auth/login', { username, password });
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      if (data.access && data.refresh) {
        setTokens(data.access, data.refresh);
        djangoQueryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await djangoApiRequest('POST', '/api/auth/logout', {});
      clearTokens();
    },
    onSuccess: () => {
      djangoQueryClient.clear();
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (role: string) => {
      const response = await djangoApiRequest('PATCH', '/api/auth/user/role', { role });
      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      djangoQueryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !!getAccessToken(),
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    updateRole: updateRoleMutation.mutate,
    isLoginPending: loginMutation.isPending,
    isLogoutPending: logoutMutation.isPending,
    isUpdateRolePending: updateRoleMutation.isPending,
  };
}