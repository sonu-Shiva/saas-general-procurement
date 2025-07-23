import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import VendorCard from "@/components/vendor-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVendorSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Users, 
  CheckCircle, 
  Clock, 
  XCircle,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
  Building,
  Award
} from "lucide-react";
import type { Vendor } from "@shared/schema";

export default function VendorManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(insertVendorSchema),
    defaultValues: {
      companyName: "",
      contactPerson: "",
      email: "",
      phone: "",
      panNumber: "",
      gstNumber: "",
      tanNumber: "",
      address: "",
      categories: [],
      certifications: [],
      yearsOfExperience: 0,
      officeLocations: [],
    },
  });

  const { data: vendors = [], isLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors", { search: searchQuery, status: statusFilter, category: categoryFilter }],
    retry: false,
  });

  const createVendorMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/vendors", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({
        title: "Success",
        description: "Vendor created successfully",
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create vendor",
        variant: "destructive",
      });
    },
  });

  const updateVendorStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/vendors/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({
        title: "Success",
        description: "Vendor status updated successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update vendor status",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createVendorMutation.mutate(data);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-4 h-4 text-success" />;
      case "pending":
        return <Clock className="w-4 h-4 text-warning" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-destructive" />;
      case "suspended":
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "approved":
        return "default";
      case "pending":
        return "secondary";
      case "rejected":
      case "suspended":
        return "destructive";
      default:
        return "outline";
    }
  };

  const filteredVendors = vendors.filter((vendor: Vendor) => {
    const matchesSearch = vendor.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         vendor.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         vendor.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || vendor.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || vendor.categories?.includes(categoryFilter);
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Vendor Management</h1>
                <p className="text-muted-foreground">Manage your supplier ecosystem and vendor relationships</p>
              </div>
              <div className="flex space-x-3">
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Vendor
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add New Vendor</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="companyName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Company Name</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="contactPerson"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Contact Person</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input type="email" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="panNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>PAN Number</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="gstNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>GST Number</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="tanNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>TAN Number</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address</FormLabel>
                              <FormControl>
                                <Textarea {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-3">
                          <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createVendorMutation.isPending}>
                            {createVendorMutation.isPending ? "Creating..." : "Create Vendor"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Vendors</p>
                      <p className="text-2xl font-bold">{vendors.length}</p>
                    </div>
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Approved</p>
                      <p className="text-2xl font-bold text-success">
                        {vendors.filter((v: Vendor) => v.status === 'approved').length}
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-success" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Pending</p>
                      <p className="text-2xl font-bold text-warning">
                        {vendors.filter((v: Vendor) => v.status === 'pending').length}
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-warning" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Rejected</p>
                      <p className="text-2xl font-bold text-destructive">
                        {vendors.filter((v: Vendor) => v.status === 'rejected').length}
                      </p>
                    </div>
                    <XCircle className="w-8 h-8 text-destructive" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Search */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search vendors..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="electronics">Electronics</SelectItem>
                        <SelectItem value="raw-materials">Raw Materials</SelectItem>
                        <SelectItem value="office-supplies">Office Supplies</SelectItem>
                        <SelectItem value="industrial">Industrial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vendors Table/Grid */}
            <Tabs defaultValue="grid" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="grid">Grid View</TabsTrigger>
                <TabsTrigger value="table">Table View</TabsTrigger>
              </TabsList>
              
              <TabsContent value="grid">
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i}>
                        <CardContent className="p-6">
                          <div className="animate-pulse">
                            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-muted rounded w-1/2 mb-4"></div>
                            <div className="h-8 bg-muted rounded w-full"></div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : filteredVendors && filteredVendors.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredVendors.map((vendor: Vendor) => (
                      <VendorCard 
                        key={vendor.id} 
                        vendor={vendor} 
                        onStatusUpdate={(id, status) => updateVendorStatusMutation.mutate({ id, status })}
                      />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">No vendors found</h3>
                      <p className="text-muted-foreground mb-4">
                        {searchQuery || statusFilter !== "all" || categoryFilter !== "all"
                          ? "Try adjusting your search criteria or filters"
                          : "Start by adding your first vendor to the system"
                        }
                      </p>
                      {!searchQuery && statusFilter === "all" && categoryFilter === "all" && (
                        <Button onClick={() => setIsCreateDialogOpen(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Vendor
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="table">
                <Card>
                  <CardContent className="p-0">
                    {isLoading ? (
                      <div className="p-6">
                        <div className="animate-pulse space-y-4">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-16 bg-muted rounded"></div>
                          ))}
                        </div>
                      </div>
                    ) : filteredVendors && filteredVendors.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="border-b">
                            <tr>
                              <th className="text-left py-4 px-6 font-medium text-muted-foreground">Company</th>
                              <th className="text-left py-4 px-6 font-medium text-muted-foreground">Contact</th>
                              <th className="text-left py-4 px-6 font-medium text-muted-foreground">Categories</th>
                              <th className="text-left py-4 px-6 font-medium text-muted-foreground">Status</th>
                              <th className="text-left py-4 px-6 font-medium text-muted-foreground">Performance</th>
                              <th className="text-left py-4 px-6 font-medium text-muted-foreground">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {filteredVendors.map((vendor: Vendor) => (
                              <tr key={vendor.id} className="hover:bg-muted/50">
                                <td className="py-4 px-6">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center text-white font-semibold">
                                      {vendor.companyName.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="font-medium">{vendor.companyName}</p>
                                      <p className="text-sm text-muted-foreground">{vendor.gstNumber}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <div>
                                    <p className="font-medium">{vendor.contactPerson}</p>
                                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                      <Mail className="w-3 h-3" />
                                      <span>{vendor.email}</span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                      <Phone className="w-3 h-3" />
                                      <span>{vendor.phone}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex flex-wrap gap-1">
                                    {vendor.categories?.slice(0, 2).map((category, index) => (
                                      <Badge key={index} variant="secondary" className="text-xs">
                                        {category}
                                      </Badge>
                                    ))}
                                    {vendor.categories && vendor.categories.length > 2 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{vendor.categories.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <Badge variant={getStatusVariant(vendor.status || "pending")}>
                                    {getStatusIcon(vendor.status || "pending")}
                                    <span className="ml-1 capitalize">{vendor.status}</span>
                                  </Badge>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium">
                                      {vendor.performanceScore ? `${vendor.performanceScore}/5.0` : "N/A"}
                                    </span>
                                    {vendor.performanceScore && parseFloat(vendor.performanceScore) >= 4.5 && (
                                      <Award className="w-4 h-4 text-yellow-500" />
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex space-x-2">
                                    {vendor.status === "pending" && (
                                      <>
                                        <Button 
                                          size="sm" 
                                          className="bg-success hover:bg-success/90"
                                          onClick={() => updateVendorStatusMutation.mutate({ id: vendor.id, status: "approved" })}
                                          disabled={updateVendorStatusMutation.isPending}
                                        >
                                          Approve
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="destructive"
                                          onClick={() => updateVendorStatusMutation.mutate({ id: vendor.id, status: "rejected" })}
                                          disabled={updateVendorStatusMutation.isPending}
                                        >
                                          Reject
                                        </Button>
                                      </>
                                    )}
                                    <Button size="sm" variant="outline">
                                      View
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-12 text-center">
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">No vendors found</h3>
                        <p className="text-muted-foreground">
                          {searchQuery || statusFilter !== "all" || categoryFilter !== "all"
                            ? "Try adjusting your search criteria or filters"
                            : "Start by adding your first vendor to the system"
                          }
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
