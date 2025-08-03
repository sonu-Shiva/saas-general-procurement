import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, ShoppingCart, Building2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SimpleLandingProps {
  onLogin: (user: any) => void;
}

export default function SimpleLanding({ onLogin }: SimpleLandingProps) {
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleRoleLogin = async () => {
    if (!selectedRole || !userEmail || !userName) {
      toast({
        title: "Missing information",
        description: "Please provide your name, email, and select a role",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create a simple session with user data
      const response = await apiRequest("/api/auth/simple-login", {
        method: "POST",
        body: JSON.stringify({ 
          role: selectedRole,
          email: userEmail,
          name: userName
        }),
      });
      
      const userData = await response.json();
      
      // Invalidate user cache to refetch with new data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: "Login successful",
        description: `Welcome ${userName}! You are now logged in as a ${selectedRole.replace('_', ' ')}`,
      });
      
      onLogin(userData);
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <Building2 className="w-12 h-12 text-primary mr-4" />
            <h1 className="text-4xl font-bold text-foreground">
              SCLEN Procurement Platform
            </h1>
          </div>
          <p className="text-xl text-muted-foreground">
            Streamline your procurement processes with AI-powered vendor management
          </p>
        </div>

        <Card className="max-w-md mx-auto mb-8">
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
            <CardDescription>Enter your details to get started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="Enter your email address"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className={`border-2 cursor-pointer transition-all hover:border-primary/50 ${
            selectedRole === 'buyer_user' ? 'border-primary bg-primary/5' : ''
          }`} onClick={() => setSelectedRole('buyer_user')}>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Buyer</CardTitle>
              <CardDescription className="text-lg">
                Manage procurement processes, vendors, and purchase orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground mb-6">
                <p>• Create and manage RFx processes</p>
                <p>• Vendor discovery and management</p>
                <p>• Purchase order creation and tracking</p>
                <p>• Analytics and reporting</p>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-2 cursor-pointer transition-all hover:border-secondary/50 ${
            selectedRole === 'vendor' ? 'border-secondary bg-secondary/5' : ''
          }`} onClick={() => setSelectedRole('vendor')}>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-secondary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-secondary" />
              </div>
              <CardTitle className="text-2xl">Vendor</CardTitle>
              <CardDescription className="text-lg">
                Respond to RFx processes and participate in auctions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground mb-6">
                <p>• View and respond to RFx invitations</p>
                <p>• Participate in live auctions</p>
                <p>• Manage vendor profile</p>
                <p>• Track business opportunities</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <Button 
            size="lg"
            onClick={handleRoleLogin}
            disabled={isLoading || !selectedRole || !userEmail || !userName}
            className="px-12 py-3"
          >
            {isLoading ? "Logging in..." : "Continue to Platform"}
          </Button>
        </div>
      </div>
    </div>
  );
}