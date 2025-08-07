import { QueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "./authUtils";
import { getApiUrl } from "./api-config";

// API request function for mutations
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const requestOptions: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  };

  // Add base path to the endpoint
  const fullUrl = endpoint.startsWith('/api') ? getApiUrl(endpoint) : endpoint;
  const response = await fetch(fullUrl, requestOptions);
  
  if (!response.ok) {
    const text = await response.text();
    let errorMessage;
    try {
      const errorJson = JSON.parse(text);
      errorMessage = errorJson.message || `${response.status}: ${response.statusText}`;
    } catch {
      // If response is not JSON, it might be HTML error page
      if (text.includes('<!DOCTYPE')) {
        errorMessage = `Unexpected token '<', "<!DOCTYPE " is not valid JSON`;
      } else {
        errorMessage = `${response.status}: ${response.statusText}`;
      }
    }
    throw new Error(errorMessage);
  }
  
  return response.json();
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey, signal }) => {
        try {
          const [url, params] = queryKey as [string, any?];

          // Add base path to the URL if it's an API endpoint
          let fullUrl = url.startsWith('/api') ? getApiUrl(url) : url;
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
              // For auth endpoints, return null instead of throwing to prevent loops
              if (url === '/api/auth/user') {
                return null;
              }
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
        if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('401'))) {
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