import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Package, Users, Settings } from "lucide-react";

interface RoleSelectorProps {
  open: boolean;
  onClose: () => void;
  currentRole?: string;
}

const roleOptions = [
  {
    id: "buyer_admin",
    title: "Buyer Admin",
    description: "Full procurement management with administrative privileges",
    icon: Settings,
    features: [
      "Manage all procurement processes",
      "View and create BOMs",
      "Manage vendor relationships",
      "Administrative controls",
      "Analytics and reporting"
    ],
    color: "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
  },
  {
    id: "buyer_user",
    title: "Buyer",
    description: "Standard procurement user with BOM creation capabilities",
    icon: ShoppingCart,
    features: [
      "View product catalogue",
      "Create and manage BOMs",
      "Submit purchase requests",
      "View vendor information",
      "Basic analytics access"
    ],
    color: "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300"
  },
  {
    id: "sourcing_manager",
    title: "Sourcing Manager",
    description: "Advanced procurement with sourcing and vendor management",
    icon: Users,
    features: [
      "Manage vendor relationships",
      "View and create BOMs",
      "RFx process management",
      "Auction participation",
      "Advanced analytics"
    ],
    color: "bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300"
  },
  {
    id: "vendor",
    title: "Vendor/Seller",
    description: "Supplier with product catalogue management capabilities",
    icon: Package,
    features: [
      "Create and upload products",
      "Manage product catalogue",
      "Respond to RFx requests",
      "Participate in auctions",
      "View order history"
    ],
    color: "bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300"
  }
];

export default function RoleSelector({ open, onClose, currentRole }: RoleSelectorProps) {
  const [selectedRole, setSelectedRole] = useState<string>(currentRole || "");
  const { toast } = useToast();


  const updateRoleMutation = useMutation({
    mutationFn: async (role: string) => {
      console.log("Updating role to:", role);
      const response = await apiRequest("PATCH", "/api/auth/user/role", { role });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Role Updated",
        description: "Your role has been successfully updated. You may need to refresh the page to see all changes.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    },
  });

  const handleRoleSelect = () => {
    if (!selectedRole) {
      toast({
        title: "No Role Selected",
        description: "Please select a role to continue",
        variant: "destructive",
      });
      return;
    }
    updateRoleMutation.mutate(selectedRole);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Your Role</DialogTitle>
          <DialogDescription>
            Choose your role in the procurement platform. This determines what features and permissions you'll have access to.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {roleOptions.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;
            const isCurrent = currentRole === role.id;
            
            return (
              <Card 
                key={role.id}
                className={`cursor-pointer transition-all duration-200 ${
                  isSelected ? 'ring-2 ring-primary' : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedRole(role.id)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${role.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {role.title}
                          {isCurrent && <Badge variant="secondary" className="text-xs">Current</Badge>}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {role.description}
                        </CardDescription>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Key Features:</p>
                    <ul className="space-y-1">
                      {role.features.map((feature, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mr-2"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleRoleSelect}
            disabled={!selectedRole || selectedRole === currentRole || updateRoleMutation.isPending}
          >
            {updateRoleMutation.isPending ? "Updating..." : "Update Role"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}