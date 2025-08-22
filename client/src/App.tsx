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
import RfxManagement from "./pages/rfx-management";
import AuctionCenter from "./pages/auction-center";
import PurchaseOrders from "@/pages/purchase-orders";
import DirectProcurement from "@/pages/direct-procurement";
import Analytics from "@/pages/analytics";
import VendorDiscovery from "./pages/vendor-discovery";
import VendorPortal from "./pages/vendor-portal";
import VendorRfxDetails from "./pages/vendor-rfx-details";
import VendorRfxResponse from "./pages/vendor-rfx-response";
import ProcurementRequests from "@/pages/procurement-requests";
import PrApproval from "./pages/pr-approval";

import SimpleLogin from "@/pages/simple-login";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import SourcingIntake from "./pages/sourcing-intake";
import MethodApproval from "./pages/method-approval";
import AdminDropdownConfig from "./pages/admin-dropdown-config";
import AdminUserManagement from "./pages/admin-user-management";
import AuditLogsPage from "./pages/AuditLogsPage";
import ApprovalHierarchies from "./pages/admin/ApprovalHierarchies";

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

function testDiscovery() {
  console.log("Testing AI Discovery...");

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/vendors/discover', true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.withCredentials = true;

  xhr.onload = function() {
    console.log('XHR Status:', xhr.status);
    console.log('XHR Response length:', xhr.responseText.length);

    if (xhr.status === 200) {
      const result = JSON.parse(xhr.responseText);
      console.log('Parsed result:', result);
      alert(`SUCCESS! Found ${result.length} vendors:\n${result.map((v: any) => `• ${v.name} (${v.category})`).join('\n')}`);
    } else {
      alert(`ERROR: ${xhr.status} - ${xhr.responseText}`);
    }
  };

  xhr.onerror = function() {
    alert('Network error occurred');
  };

  const payload = JSON.stringify({
    query: 'textile manufacturers',
    location: '',
    category: ''
  });

  console.log('Sending payload:', payload);
  xhr.send(payload);
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
          <Route path="/procurement-requests" component={ProcurementRequests} />
          <Route path="/pr-approval/:id" component={PrApproval} />
          <Route path="/rfx" component={RfxManagement} />
          <Route path="/auctions" component={AuctionCenter} />
          <Route path="/sourcing-intake" component={SourcingIntake} />
          <Route path="/method-approval" component={MethodApproval} />
          <Route path="/vendor-discovery" component={VendorDiscovery} />
          <Route path="/vendor-portal" component={VendorPortal} />
          <Route path="/vendor/rfx-details/:id" component={VendorRfxDetails} />
          <Route path="/vendor/rfx-response/:id" component={VendorRfxResponse} />
          <Route path="/purchase-orders" component={PurchaseOrders} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/admin/dropdown-config" component={AdminDropdownConfig} />
          <Route path="/admin/user-management" component={AdminUserManagement} />
          <Route path="/admin/audit-logs" component={AuditLogsPage} />
          <Route path="/admin/approval-hierarchies" component={ApprovalHierarchies} />
          <Route path="/direct-procurement" component={DirectProcurement} />
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