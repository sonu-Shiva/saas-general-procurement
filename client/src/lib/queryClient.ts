import { QueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "./authUtils";

// API request function for mutations
export async function apiRequest(method: string, endpoint: string, data?: any) {
  const options: RequestInit = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(endpoint, options);
  
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