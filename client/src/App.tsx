import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "react-error-boundary";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import VendorManagement from "@/pages/vendor-management";
import ProductCatalogue from "@/pages/product-catalogue";
import BomManagement from "@/pages/bom-management";
import RfxManagement from "@/pages/rfx-management";
import AuctionCenter from "@/pages/auction-center";
import PurchaseOrders from "@/pages/purchase-orders";
import DirectProcurement from "@/pages/direct-procurement";
import Analytics from "@/pages/analytics";
import VendorDiscovery from "@/pages/vendor-discovery";
import VendorPortal from "@/pages/vendor-portal";
import SimpleLogin from "@/pages/simple-login";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center max-w-md mx-auto p-6">
        <h2 className="text-2xl font-bold text-destructive mb-4">Something went wrong</h2>
        <p className="text-muted-foreground mb-4">{error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SimpleLogin />;
  }

  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      <div className="flex h-[calc(100vh-4rem)]">
        <Sidebar />
        <main className="flex-1 overflow-auto">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/vendors" component={VendorManagement} />
          <Route path="/products" component={ProductCatalogue} />
          <Route path="/boms" component={BomManagement} />
          <Route path="/rfx" component={RfxManagement} />
          <Route path="/auctions" component={AuctionCenter} />
          <Route path="/purchase-orders" component={PurchaseOrders} />
          <Route path="/direct-procurement" component={DirectProcurement} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/vendor-discovery" component={VendorDiscovery} />
          <Route path="/vendor-portal" component={VendorPortal} />
          <Route>
            <div className="p-8 text-center">
              <h1 className="text-2xl font-bold">Page not found</h1>
            </div>
          </Route>
        </Switch>
      </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;