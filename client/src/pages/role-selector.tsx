import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ShoppingCart } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RoleSelectorProps {
  onRoleSelected: () => void;
}

export default function RoleSelector({ onRoleSelected }: RoleSelectorProps) {
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleRoleSelection = async (role: string) => {
    setIsLoading(true);
    try {
      await apiRequest("/api/auth/user/role", {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      
      // Invalidate user cache to refetch with new role
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: "Role set successfully",
        description: `You are now logged in as a ${role.replace('_', ' ')}`,
      });
      
      onRoleSelected();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set role. Please try again.",
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
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Welcome to SCLEN Procurement
          </h1>
          <p className="text-xl text-muted-foreground">
            Please select your role to continue
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className={`border-2 cursor-pointer transition-all hover:border-primary/50 ${
            selectedRole === 'buyer_user' ? 'border-primary bg-primary/5' : ''
          }`}>
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
              <Button 
                className="w-full" 
                onClick={() => handleRoleSelection('buyer_user')}
                disabled={isLoading}
              >
                Continue as Buyer
              </Button>
            </CardContent>
          </Card>

          <Card className={`border-2 cursor-pointer transition-all hover:border-secondary/50 ${
            selectedRole === 'vendor' ? 'border-secondary bg-secondary/5' : ''
          }`}>
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
              <Button 
                className="w-full" 
                variant="secondary"
                onClick={() => handleRoleSelection('vendor')}
                disabled={isLoading}
              >
                Continue as Vendor
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}