import { ReactNode, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

interface AuthWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AuthWrapper({ children, fallback }: AuthWrapperProps) {
  const { isAuthenticated, isLoading, error } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    // If user is not authenticated and tries to access protected routes
    if (!isLoading && !isAuthenticated && location !== '/') {
      console.log("Redirecting unauthenticated user to home");
      navigate('/');
    }
  }, [isAuthenticated, isLoading, location, navigate]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show fallback if not authenticated
  if (!isAuthenticated) {
    return fallback || null;
  }

  // Render children if authenticated
  return <>{children}</>;
}