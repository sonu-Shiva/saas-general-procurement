import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import DashboardCards from "@/components/dashboard-cards";
import AiChat from "@/components/ai-chat";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Gavel,
  CheckCircle,
  Users,
  ClipboardCheck,
  Layers,
  Target,
  ShoppingCart,
  BarChart3,
  Package,
} from "lucide-react";

export default function Dashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  const { data: recentRfx } = useQuery({
    queryKey: ["/api/rfx"],
    retry: false,
  });

  const { data: activeAuctions } = useQuery({
    queryKey: ["/api/auctions", { status: "live" }],
    retry: false,
  });

  const { data: pendingApprovals } = useQuery({
    queryKey: ["/api/approvals"],
    retry: false,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const userRole = (user as any)?.role;

  // Role-based dashboard configurations
  const getDashboardConfig = (role: string) => {
    switch (role) {
      case 'department_requester':
        return {
          title: 'Requester Dashboard',
          subtitle: 'Create and track your procurement requests',
          quickActions: [
            { label: 'Create Request', href: '/procurement-requests', icon: FileText, variant: 'default' as const },
            { label: 'My Requests', href: '/procurement-requests', icon: ClipboardCheck, variant: 'outline' as const },
            { label: 'Create BOM', href: '/boms', icon: Layers, variant: 'outline' as const },
          ]
        };
      
      case 'dept_approver':
        return {
          title: 'Approver Dashboard',
          subtitle: 'Review and approve procurement requests from your department',
          quickActions: [
            { label: 'Pending Approvals', href: '/procurement-requests', icon: CheckCircle, variant: 'default' as const },
            { label: 'All Requests', href: '/procurement-requests', icon: FileText, variant: 'outline' as const },
          ]
        };
      
      case 'sourcing_exec':
        return {
          title: 'Sourcing Executive Dashboard',
          subtitle: 'Manage vendor relationships and coordinate procurement events',
          quickActions: [
            { label: 'Sourcing Intake', href: '/sourcing-intake', icon: Target, variant: 'default' as const },
            { label: 'New RFx', href: '/rfx', icon: FileText, variant: 'default' as const },
            { label: 'Create Auction', href: '/auctions', icon: Gavel, variant: 'default' as const },
            { label: 'Direct PO', href: '/direct-procurement', icon: ShoppingCart, variant: 'default' as const },
            { label: 'Vendor Management', href: '/vendors', icon: Users, variant: 'outline' as const },
          ]
        };
      
      case 'sourcing_manager':
        return {
          title: 'Sourcing Manager Dashboard',
          subtitle: 'Approve methods, oversee procurement strategy, and manage purchase orders',
          quickActions: [
            { label: 'Method Approval', href: '/method-approval', icon: CheckCircle, variant: 'default' as const },
            { label: 'Purchase Orders', href: '/purchase-orders', icon: FileText, variant: 'default' as const },
            { label: 'Analytics', href: '/analytics', icon: BarChart3, variant: 'outline' as const },
          ]
        };
      
      case 'buyer_admin':
        return {
          title: 'Admin Dashboard',
          subtitle: 'Configure system settings, manage users, and oversee all procurement activities',
          quickActions: [
            { label: 'Product Catalogue', href: '/products', icon: Package, variant: 'default' as const },
            { label: 'Vendor Management', href: '/vendors', icon: Users, variant: 'default' as const },
            { label: 'Analytics', href: '/analytics', icon: BarChart3, variant: 'default' as const },
            { label: 'All Requests', href: '/procurement-requests', icon: ClipboardCheck, variant: 'outline' as const },
          ]
        };
      
      case 'vendor':
        return {
          title: 'Vendor Portal',
          subtitle: 'Manage your product catalogue and participate in RFx processes',
          quickActions: [
            { label: 'RFx Invitations', href: '/vendor-portal', icon: FileText, variant: 'default' as const },
            { label: 'My Auctions', href: '/auctions', icon: Gavel, variant: 'default' as const },
            { label: 'Purchase Orders', href: '/purchase-orders', icon: FileText, variant: 'default' as const },
            { label: 'Product Catalogue', href: '/products', icon: Package, variant: 'outline' as const },
          ]
        };
      
      default:
        return {
          title: 'Procurement Dashboard',
          subtitle: 'Welcome to the SCLEN Procurement Platform',
          quickActions: []
        };
    }
  };

  const config = getDashboardConfig(userRole);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Role-based Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {config.title}
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {(user as any)?.firstName || "User"}! {config.subtitle}
          </p>
        </div>

        {/* Role-based Quick Actions */}
        {config.quickActions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-4">
              {config.quickActions.map((action, index) => (
                <Button 
                  key={index}
                  variant={action.variant}
                  onClick={() => setLocation(action.href)}
                  data-testid={`button-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <action.icon className="w-4 h-4 mr-2" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Role-filtered Dashboard Cards */}
        <DashboardCards stats={dashboardStats as any} isLoading={statsLoading || !dashboardStats} userRole={userRole} />

      {/* Recent RFx Status Table */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recent RFx Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b">
                  <th className="py-3 px-4 text-sm font-medium">RFx ID</th>
                  <th className="py-3 px-4 text-sm font-medium">Title</th>
                  <th className="py-3 px-4 text-sm font-medium">Type</th>
                  <th className="py-3 px-4 text-sm font-medium">Participants</th>
                  <th className="py-3 px-4 text-sm font-medium">Status</th>
                  <th className="py-3 px-4 text-sm font-medium">Deadline</th>
                  <th className="py-3 px-4 text-sm font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-3 px-4 text-sm">RFQ-2025-001</td>
                  <td className="py-3 px-4 text-sm">Steel Pipes Procurement</td>
                  <td className="py-3 px-4">
                    <Badge className="bg-blue-100 text-blue-800">RFQ</Badge>
                  </td>
                  <td className="py-3 px-4 text-sm">12 invited / 8 responded</td>
                  <td className="py-3 px-4">
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </td>
                  <td className="py-3 px-4 text-sm">Jan 25, 2025</td>
                  <td className="py-3 px-4">
                    <Button variant="link" size="sm">Review</Button>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 text-sm">RFQ-2025-002</td>
                  <td className="py-3 px-4 text-sm">Office Equipment</td>
                  <td className="py-3 px-4">
                    <Badge className="bg-blue-100 text-blue-800">RFQ</Badge>
                  </td>
                  <td className="py-3 px-4 text-sm">6 invited / 4 responded</td>
                  <td className="py-3 px-4">
                    <Badge className="bg-yellow-100 text-yellow-800">Evaluation</Badge>
                  </td>
                  <td className="py-3 px-4 text-sm">Jan 20, 2025</td>
                  <td className="py-3 px-4">
                    <Button variant="link" size="sm">Evaluate</Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

        {/* AI Chat Widget */}
        <div className="mt-8">
          <AiChat />
        </div>
      </div>
    </div>
  );
}