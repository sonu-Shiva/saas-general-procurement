import { QueryClient } from "@tanstack/react-query";

// Use Django backend on port 8000
const API_BASE_URL = "http://localhost:8000";

async function fetchApi(url: string, options: RequestInit = {}) {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  const response = await fetch(fullUrl, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(`${response.status}: ${errorText}`);
    throw error;
  }

  return response.json();
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