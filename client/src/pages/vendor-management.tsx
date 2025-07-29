import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import AddVendorForm from "@/components/add-vendor-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, Building2, Mail, Phone, MapPin, Globe, MoreVertical } from "lucide-react";

export default function VendorManagement() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);

  // Fetch vendors
  const { data: vendors = [], isLoading, error } = useQuery({
    queryKey: ["/api/vendors"],
    retry: false,
  });

  console.log("Vendor Management - vendors data:", vendors);
  console.log("Vendor Management - isLoading:", isLoading);
  console.log("Vendor Management - error:", error);

  // Filter vendors based on search term
  const filteredVendors = (vendors as any[]).filter((vendor: any) =>
    vendor.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.categories?.some((cat: string) => cat.toLowerCase().includes(searchTerm.toLowerCase())) ||
    vendor.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: "default" as const, label: "Active" },
      pending_verification: { variant: "secondary" as const, label: "Pending Verification" },
      inactive: { variant: "outline" as const, label: "Inactive" },
    };
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      buyer_added: { variant: "default" as const, label: "Manual" },
      ai_discovered: { variant: "secondary" as const, label: "AI Discovered" },
      self_registered: { variant: "outline" as const, label: "Self Registered" },
    };
    return typeConfig[type as keyof typeof typeConfig] || typeConfig.buyer_added;
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Vendor Management</h1>
                <p className="text-muted-foreground">
                  Manage your vendor network and discover new suppliers
                </p>
              </div>
              <Button onClick={() => setIsAddVendorOpen(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Vendors
              </Button>
            </div>

            {/* Search and Filters */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search vendors by name, category, or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vendors Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                        <div className="h-3 bg-muted rounded w-full"></div>
                        <div className="h-3 bg-muted rounded w-2/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredVendors.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Vendors Found</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchTerm ? "No vendors match your search criteria." : "Start building your vendor network by adding suppliers."}
                  </p>
                  <Button onClick={() => setIsAddVendorOpen(true)} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Your First Vendor
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVendors.map((vendor: any) => (
                  <Card key={vendor.id} className="border-2 border-border hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{vendor.companyName || vendor.name || "Unknown Vendor"}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge {...getStatusBadge(vendor.status)}>{getStatusBadge(vendor.status).label}</Badge>
                            <Badge {...getTypeBadge(vendor.type)}>{getTypeBadge(vendor.type).label}</Badge>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm">
                        {vendor.categories && vendor.categories.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {vendor.categories.slice(0, 2).map((category: string, index: number) => (
                              <Badge key={index} variant="outline">{category}</Badge>
                            ))}
                            {vendor.categories.length > 2 && (
                              <Badge variant="outline">+{vendor.categories.length - 2} more</Badge>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline">General</Badge>
                        )}
                      </div>
                      
                      {vendor.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {vendor.description}
                        </p>
                      )}
                      
                      <div className="space-y-2 text-sm">
                        {vendor.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate">{vendor.email}</span>
                          </div>
                        )}
                        {vendor.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span>{vendor.phone}</span>
                          </div>
                        )}
                        {vendor.address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate">{vendor.address}</span>
                          </div>
                        )}
                        {vendor.website && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate">{vendor.website}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add Vendor Dialog */}
      <Dialog open={isAddVendorOpen} onOpenChange={setIsAddVendorOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Add Vendors</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <AddVendorForm
              onClose={() => setIsAddVendorOpen(false)}
              onSuccess={() => {
                setIsAddVendorOpen(false);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}