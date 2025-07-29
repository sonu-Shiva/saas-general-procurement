import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn } from "lucide-react";

export default function LoginForm() {
  const handleLogin = () => {
    window.location.href = '/api/login';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to SCLEN Procurement Platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button
              onClick={handleLogin}
              className="w-full"
              size="lg"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign in with Replit
            </Button>
          </div>
          
          <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Authentication Method:</strong>
            </p>
            <p className="text-sm">
              This application uses Replit's secure authentication system. 
              Click the button above to sign in with your Replit account.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}