import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Search,
  Package,
  Layers,
  FileText,
  Gavel,
  ShoppingCart,
  BarChart3,
  MessageSquare,
  ClipboardCheck,
  Target,
  CheckCircle,
  Settings,
  Shield,
  GitBranch,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Vendor Management", href: "/vendors", icon: Users, allowedRoles: ['sourcing_exec', 'admin'] },
  { name: "Product Catalogue", href: "/products", icon: Package },
  { name: "BOM Management", href: "/boms", icon: Layers, allowedRoles: ['department_requester', 'sourcing_exec', 'admin'] },
  { name: "Procurement Requests", href: "/procurement-requests", icon: ClipboardCheck, allowedRoles: ['department_requester', 'dept_approver', 'sourcing_exec', 'sourcing_manager', 'admin'] },
  { name: "Sourcing Intake", href: "/sourcing-intake", icon: Target, allowedRoles: ['sourcing_exec', 'admin'] },
  { name: "RFx Invitations", href: "/vendor-portal", icon: FileText, vendorLabel: "RFx Invitations", buyerLabel: "RFx Management", vendorHref: "/vendor-portal", buyerHref: "/rfx", allowedRoles: ['sourcing_exec', 'vendor', 'admin'] },
  { name: "Auction Center", href: "/auctions", icon: Gavel, vendorLabel: "My Auctions", buyerLabel: "Auction Center", allowedRoles: ['sourcing_exec', 'vendor', 'admin'] },
  { name: "Direct Procurement", href: "/direct-procurement", icon: ShoppingCart, allowedRoles: ['sourcing_exec', 'admin'] },
  { name: "Purchase Orders", href: "/purchase-orders", icon: FileText, vendorLabel: "Purchase Orders", buyerLabel: "Purchase Orders", allowedRoles: ['sourcing_exec', 'sourcing_manager', 'vendor', 'admin'] },
  { name: "Analytics", href: "/analytics", icon: BarChart3, allowedRoles: ['sourcing_manager', 'sourcing_exec', 'admin'] },
  { name: "Method Approval", href: "/method-approval", icon: CheckCircle, allowedRoles: ['sourcing_manager', 'admin'] },
];

const adminConfigurations = [
  { name: "Dropdown Config", href: "/admin/dropdown-config", icon: Settings },
  { name: "User Management", href: "/admin/user-management", icon: Users },
  { name: "Audit Logs", href: "/admin/audit-logs", icon: Shield },
  { name: "Approval Hierarchies", href: "/admin/approval-hierarchies", icon: GitBranch },
  { name: "GST Management", href: "/admin/gst-management", icon: Settings },
  { name: "Company Profile", href: "/admin/company-profile", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  // Auto-expand admin configurations if we're on an admin config page
  const isOnAdminConfigPage = adminConfigurations.some(config => location === config.href);
  const [isAdminConfigOpen, setIsAdminConfigOpen] = useState(isOnAdminConfigPage);

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-border shadow-sm">
      <div className="p-6">
        <nav className="space-y-2">
          {navigation
            .filter((item) => {
              const userRole = (user as any)?.role;

              // If item has allowedRoles defined, check if user role is allowed
              if (item.allowedRoles && item.allowedRoles.length > 0) {
                return item.allowedRoles.includes(userRole);
              }

              // If no allowedRoles defined, allow all authenticated users
              return true;
            })
            .map((item) => {
              const isVendor = (user as any)?.role === 'vendor';

              // Use appropriate href based on user role
              const href = isVendor && item.vendorHref 
                ? item.vendorHref 
                : !isVendor && item.buyerHref 
                  ? item.buyerHref 
                  : item.href;

              const isActive = location === href;

              // Use appropriate label based on user role
              const displayName = isVendor && item.vendorLabel 
                ? item.vendorLabel 
                : !isVendor && item.buyerLabel 
                  ? item.buyerLabel 
                  : item.name;

              return (
                <Link 
                  key={item.name} 
                  href={href}
                  className={cn(
                    "sidebar-nav",
                    isActive
                      ? "text-primary bg-primary/10 border-r-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{displayName}</span>
                </Link>
              );
            })}

          {/* Admin Configurations Section */}
          {(user as any)?.role === 'admin' && (
            <Collapsible 
              open={isAdminConfigOpen || isOnAdminConfigPage} 
              onOpenChange={setIsAdminConfigOpen} 
              className="mt-2"
            >
              <CollapsibleTrigger
                className={cn(
                  "sidebar-nav w-full justify-between",
                  isOnAdminConfigPage
                    ? "text-primary bg-primary/10 border-r-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center space-x-3">
                  <Settings className="w-5 h-5" />
                  <span className="font-medium">Admin Configurations</span>
                </div>
                {(isAdminConfigOpen || isOnAdminConfigPage) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="ml-8 mt-1 space-y-1">
                {adminConfigurations.map((config) => {
                  const isActive = location === config.href;
                  return (
                    <Link
                      key={config.name}
                      href={config.href}
                      className={cn(
                        "flex items-center space-x-3 px-3 py-2 rounded-md text-sm transition-colors",
                        isActive
                          ? "text-primary bg-primary/10 border-r-2 border-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      <config.icon className="w-4 h-4" />
                      <span>{config.name}</span>
                    </Link>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          )}
        </nav>

        {/* AI Assistant Quick Access */}
        <Card className="mt-8 bg-gradient-to-r from-primary to-secondary text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">AI Assistant</CardTitle>
            <p className="text-sm text-primary-foreground/80">
              Need help with procurement? Ask me anything!
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <Button variant="secondary" className="w-full" size="sm">
              <MessageSquare className="w-4 h-4 mr-2" />
              Start Chat
            </Button>
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}