import { Switch, Route } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { AuthWrapper } from "@/components/auth-wrapper";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Import all pages
import Dashboard from "./pages/dashboard";
import VendorManagement from "./pages/vendor-management";
import VendorDiscovery from "./pages/vendor-discovery";
import ProductCatalogue from "./pages/product-catalogue";
import BomManagement from "./pages/bom-management";
import DirectProcurement from "./pages/direct-procurement";
import RfxManagement from "./pages/rfx-management";
import AuctionCenter from "./pages/auction-center";
import PurchaseOrders from "./pages/purchase-orders";
import Analytics from "./pages/analytics";
import VendorPortal from "./pages/vendor-portal";
import Landing from "./pages/landing";
import NotFound from "./pages/not-found";

function App() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // If not authenticated, show landing page
  if (!isAuthenticated) {
    return (
      <TooltipProvider>
        <Switch>
          <Route path="/vendor-portal" component={VendorPortal} />
          <Route component={Landing} />
        </Switch>
        <Toaster />
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <AuthWrapper>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/vendor-management" component={VendorManagement} />
          <Route path="/vendor-discovery" component={VendorDiscovery} />
          <Route path="/product-catalogue" component={ProductCatalogue} />
          <Route path="/bom-management" component={BomManagement} />
          <Route path="/direct-procurement" component={DirectProcurement} />
          <Route path="/rfx-management" component={RfxManagement} />
          <Route path="/auction-center" component={AuctionCenter} />
          <Route path="/purchase-orders" component={PurchaseOrders} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/vendor-portal" component={VendorPortal} />
          <Route component={NotFound} />
        </Switch>
      </AuthWrapper>
      <Toaster />
    </TooltipProvider>
  );
}