import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function SimpleLogin() {
  const [selectedRole, setSelectedRole] = useState("buyer_admin");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { login, switchRole } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log("Attempting login with role:", selectedRole);

      // First login to restore authentication
      const user = await login();
      console.log("Login successful, user:", user);

      // Then switch to selected role if different from current
      if (user && user.role !== selectedRole) {
        console.log("Switching role from", user.role, "to", selectedRole);
        await switchRole(selectedRole);
      }

      toast({
        title: "Login Successful",
        description: `Logged in as ${selectedRole.replace('_', ' ')}`,
      });

      // Short delay to ensure state is updated
      setTimeout(() => {
        navigate("/");
      }, 500);
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login Failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">SCLEN Procurement</CardTitle>
          <CardDescription>Enter your details to access the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Development Mode: Choose your role to access the platform
              </p>
            </div>

            <div>
              <Label htmlFor="role">Role</Label>
              <Select onValueChange={(value) => setSelectedRole(value)} defaultValue={selectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyer_user">Buyer</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="sourcing_manager">Sourcing Manager</SelectItem>
                  <SelectItem value="buyer_admin">Buyer Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}