import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "react-error-boundary";
import AuthWrapper from "@/components/auth-wrapper";
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
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";

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

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route
              path="/dashboard"
              element={
                <AuthWrapper>
                  <Dashboard />
                </AuthWrapper>
              }
            />
            <Route
              path="/vendors"
              element={
                <AuthWrapper>
                  <VendorManagement />
                </AuthWrapper>
              }
            />
            <Route
              path="/products"
              element={
                <AuthWrapper>
                  <ProductCatalogue />
                </AuthWrapper>
              }
            />
            <Route
              path="/boms"
              element={
                <AuthWrapper>
                  <BomManagement />
                </AuthWrapper>
              }
            />
            <Route
              path="/rfx"
              element={
                <AuthWrapper>
                  <RfxManagement />
                </AuthWrapper>
              }
            />
            <Route
              path="/auctions"
              element={
                <AuthWrapper>
                  <AuctionCenter />
                </AuthWrapper>
              }
            />
            <Route
              path="/purchase-orders"
              element={
                <AuthWrapper>
                  <PurchaseOrders />
                </AuthWrapper>
              }
            />
            <Route
              path="/direct-procurement"
              element={
                <AuthWrapper>
                  <DirectProcurement />
                </AuthWrapper>
              }
            />
            <Route
              path="/analytics"
              element={
                <AuthWrapper>
                  <Analytics />
                </AuthWrapper>
              }
            />
            <Route
              path="/vendor-discovery"
              element={
                <AuthWrapper>
                  <VendorDiscovery />
                </AuthWrapper>
              }
            />
            <Route
              path="/vendor-portal"
              element={
                <AuthWrapper>
                  <VendorPortal />
                </AuthWrapper>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;