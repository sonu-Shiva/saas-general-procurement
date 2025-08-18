import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
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
import { ShoppingCart, Package, Users, Settings, Building } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RoleSelectorProps {
  open: boolean;
  onClose: () => void;
  currentRole?: string;
}

const roleOptions = [
  {
    id: "admin",
    title: "Admin",
    description: "Platform administration with full system control",
    icon: Settings,
    features: [
      "Configure approval workflows",
      "Manage all user roles",
      "System administration",
      "Advanced analytics",
      "Global settings control"
    ],
    color: "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300"
  },
  {
    id: "department_requester",
    title: "Department Requester",
    description: "Department-level procurement request initiator",
    icon: Package,
    features: [
      "Create procurement requests",
      "Build BOMs for departments",
      "Submit approval requests",
      "Track request status",
      "Basic procurement workflows"
    ],
    color: "bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300"
  },
  {
    id: "dept_approver",
    title: "Department Approver",
    description: "Multi-level procurement request approval authority",
    icon: Users,
    features: [
      "Review procurement requests",
      "Approve or reject requests",
      "Add approval comments",
      "Multi-level approval workflows",
      "Request history tracking"
    ],
    color: "bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300"
  },
  {
    id: "sourcing_exec",
    title: "Sourcing Executive",
    description: "Execute approved procurement through RFx, Auctions, or Direct methods",
    icon: ShoppingCart,
    features: [
      "Process approved requests",
      "Manage RFx processes",
      "Conduct auctions",
      "Direct procurement",
      "Vendor selection"
    ],
    color: "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300"
  },
  {
    id: "buyer_admin",
    title: "Buyer Admin",
    description: "System configuration and organizational management",
    icon: Building,
    features: [
      "Configure budgets and approval matrices",
      "Manage product catalogue governance",
      "Handle organizational user/role management",
      "System configuration",
      "Organizational oversight"
    ],
    color: "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
  },
  {
    id: "sourcing_manager",
    title: "Sourcing Manager",
    description: "Final purchase order approval and vendor management",
    icon: Users,
    features: [
      "Final PO approval",
      "Vendor relationship management",
      "Strategic sourcing decisions",
      "Performance analytics",
      "Contract management"
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
      "View purchase orders"
    ],
    color: "bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300"
  }
];

interface TestVendor {
  id: string;
  companyName: string;
  email: string;
  firstName: string;
  lastName: string;
}

export default function RoleSelector({ open, onClose, currentRole }: RoleSelectorProps) {
  const [selectedRole, setSelectedRole] = useState<string>(currentRole || "");
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const { switchRole } = useAuth();

  // Use React Query to load test vendors
  const { data: testVendors = [] } = useQuery({
    queryKey: ['/api/auth/test-vendors'],
    enabled: open, // Only fetch when dialog is open
  });

  const handleRoleSelect = async () => {
    if (!selectedRole) {
      toast({
        title: "No Role Selected",
        description: "Please select a role to continue",
        variant: "destructive",
      });
      return;
    }

    if (selectedRole === 'vendor' && !selectedVendorId) {
      toast({
        title: "No Vendor Selected",
        description: "Please select a vendor profile to test with",
        variant: "destructive",
      });
      return;
    }

    if (selectedRole === currentRole && selectedRole !== 'vendor') {
      onClose();
      return;
    }

    setIsUpdating(true);
    try {
      await switchRole(selectedRole, selectedVendorId || undefined);
      const roleName = selectedRole === 'vendor' && selectedVendorId
        ? testVendors.find(v => v.id === selectedVendorId)?.companyName || 'Vendor'
        : roleOptions.find(r => r.id === selectedRole)?.title;
      
      toast({
        title: "Role Updated",
        description: `Successfully switched to ${roleName}`,
      });
      onClose();
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
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
                    <h4 className="font-medium text-sm">Key Features:</h4>
                    <ul className="space-y-1">
                      {role.features.map((feature, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-center">
                          <div className="w-1 h-1 rounded-full bg-muted-foreground mr-2"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {/* Vendor Selection - only show for vendor role and when selected */}
                    {role.id === 'vendor' && isSelected && (
                      <div className="mt-4 p-3 bg-muted rounded-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2 mb-2">
                          <Building className="w-4 h-4" />
                          <h4 className="font-medium text-sm">Select Test Vendor Profile:</h4>
                        </div>
                        <Select 
                          value={selectedVendorId} 
                          onValueChange={setSelectedVendorId}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose a vendor to test with..." />
                          </SelectTrigger>
                          <SelectContent>
                            {testVendors.map((vendor) => (
                              <SelectItem key={vendor.id} value={vendor.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{vendor.companyName}</span>
                                  <span className="text-xs text-muted-foreground">{vendor.email}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-2">
                          Testing Purpose: Switch between different vendor identities to test multi-vendor scenarios like auctions and RFx responses.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-end space-x-3 mt-8">
          <Button variant="outline" onClick={onClose} disabled={isUpdating}>
            Cancel
          </Button>
          <Button 
            onClick={handleRoleSelect} 
            disabled={!selectedRole || isUpdating}
          >
            {isUpdating ? "Updating..." : "Switch Role"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}