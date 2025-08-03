import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
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
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Vendor Management", href: "/vendors", icon: Users, buyerOnly: true },
  { name: "Vendor Portal", href: "/vendor-portal", icon: MessageSquare, vendorOnly: true },
  { name: "Product Catalogue", href: "/products", icon: Package },
  { name: "BOM Management", href: "/boms", icon: Layers, buyerOnly: true },
  { name: "RFx Invitations", href: "/rfx", icon: FileText, vendorLabel: "RFx Invitations", buyerLabel: "RFx Management" },
  { name: "Auction Center", href: "/auctions", icon: Gavel, vendorLabel: "My Auctions", buyerLabel: "Auction Center" },
  { name: "Direct Procurement", href: "/direct-procurement", icon: ShoppingCart, buyerOnly: true },
  { name: "Purchase Orders", href: "/purchase-orders", icon: FileText, vendorLabel: "Purchase Orders", buyerLabel: "Purchase Orders" },
  { name: "Analytics", href: "/analytics", icon: BarChart3, buyerOnly: true },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-border shadow-sm">
      <div className="p-6">
        <nav className="space-y-2">
          {navigation
            .filter((item) => {
              const isVendor = (user as any)?.role === 'vendor';
              
              // Hide buyer-only items from vendors
              if (isVendor && item.buyerOnly) {
                return false;
              }
              // Hide vendor-only items from buyers
              if (!isVendor && item.vendorOnly) {
                return false;
              }
              return true;
            })
            .map((item) => {
              const isActive = location === item.href;
              const isVendor = (user as any)?.role === 'vendor';
              
              // Use appropriate label based on user role
              const displayName = isVendor && item.vendorLabel 
                ? item.vendorLabel 
                : !isVendor && item.buyerLabel 
                  ? item.buyerLabel 
                  : item.name;
              
              return (
                <Link 
                  key={item.name} 
                  href={item.href}
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
