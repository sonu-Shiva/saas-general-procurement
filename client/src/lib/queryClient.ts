import { QueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "./authUtils";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey, signal }) => {
        try {
          const [url, params] = queryKey as [string, any?];

          let fullUrl = url;
          if (params) {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                searchParams.append(key, String(value));
              }
            });
            const queryString = searchParams.toString();
            if (queryString) {
              fullUrl += `?${queryString}`;
            }
          }

          const response = await fetch(fullUrl, { 
            signal,
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            }
          });

          if (!response.ok) {
            if (isUnauthorizedError(response.status)) {
              // Let the auth wrapper handle this
              throw new Error('Unauthorized');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          return response.json();
        } catch (error) {
          // Properly handle and rethrow errors
          if (error instanceof Error) {
            throw error;
          }
          throw new Error('Unknown error occurred');
        }
      },
      retry: (failureCount, error) => {
        // Don't retry on auth errors
        if (error instanceof Error && error.message === 'Unauthorized') {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
  },
});