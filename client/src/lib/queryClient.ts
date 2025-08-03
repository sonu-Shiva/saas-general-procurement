import { QueryClient } from "@tanstack/react-query";

// Use Express backend on current origin (Replit forwards port 5000 to 80/443)
const API_BASE_URL = window.location.origin;

async function fetchApi(url: string, options: RequestInit = {}) {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  try {
    const response = await fetch(fullUrl, {
      credentials: "include",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      // Handle 401 specifically for authentication issues
      if (response.status === 401) {
        console.log('Authentication required, redirecting to login');
        window.location.href = '/api/login';
        return;
      }
      
      const errorText = await response.text();
      const error = new Error(`${response.status}: ${errorText}`);
      throw error;
    }

    return response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Export apiRequest for mutations
export async function apiRequest(url: string, options: RequestInit = {}) {
  return fetchApi(url, options);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: ({ queryKey }) => fetchApi(queryKey[0] as string),
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});