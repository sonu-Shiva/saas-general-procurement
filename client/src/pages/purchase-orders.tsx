import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPurchaseOrderSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Plus, 
  Search, 
  Filter, 
  ShoppingCart, 
  Eye,
  Edit,
  Download,
  CheckCircle,
  Clock,
  Truck,
  FileText,
  DollarSign,
  Package,
  Calendar,
  AlertTriangle,
  Mail,
  Phone
} from "lucide-react";
import type { PurchaseOrder, PoLineItem } from "@shared/schema";

export default function PurchaseOrders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(insertPurchaseOrderSchema),
    defaultValues: {
      vendorId: "",
      totalAmount: "",
      termsAndConditions: "",
      paymentTerms: "",
      deliverySchedule: {},
    },
  });

  const { data: purchaseOrders, isLoading } = useQuery({
    queryKey: ["/api/purchase-orders", { status: statusFilter, vendorId: vendorFilter }],
    retry: false,
  });

  const { data: vendors } = useQuery({
    queryKey: ["/api/vendors", { status: "approved" }],
    retry: false,
  });

  const { data: selectedPODetails } = useQuery({
    queryKey: ["/api/purchase-orders", selectedPO],
    enabled: !!selectedPO,
    retry: false,
  });

  const createPOMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/purchase-orders", {
        ...data,
        totalAmount: parseFloat(data.totalAmount),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      toast({
        title: "Success",
        description: "Purchase Order created successfully",
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
        description: "Failed to create Purchase Order",
        variant: "destructive",
      });
    },
  });

  const updatePOStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/purchase-orders/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      toast({
        title: "Success",
        description: "Purchase Order status updated",
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
        description: "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createPOMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "issued":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "acknowledged":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "shipped":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "delivered":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "invoiced":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "paid":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "issued":
        return <FileText className="w-4 h-4" />;
      case "acknowledged":
        return <CheckCircle className="w-4 h-4" />;
      case "shipped":
        return <Truck className="w-4 h-4" />;
      case "delivered":
        return <Package className="w-4 h-4" />;
      case "invoiced":
        return <DollarSign className="w-4 h-4" />;
      case "paid":
        return <CheckCircle className="w-4 h-4" />;
      case "cancelled":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getProgressValue = (status: string) => {
    switch (status) {
      case "draft": return 10;
      case "issued": return 25;
      case "acknowledged": return 40;
      case "shipped": return 60;
      case "delivered": return 80;
      case "invoiced": return 90;
      case "paid": return 100;
      case "cancelled": return 0;
      default: return 0;
    }
  };

  const filteredPOs = purchaseOrders?.filter((po: PurchaseOrder) => {
    const matchesSearch = po.poNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || po.status === statusFilter;
    const matchesVendor = vendorFilter === "all" || po.vendorId === vendorFilter;
    
    return matchesSearch && matchesStatus && matchesVendor;
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
                <h1 className="text-3xl font-bold text-foreground">Purchase Orders</h1>
                <p className="text-muted-foreground">Track and manage all purchase orders and fulfillment</p>
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
                      Create PO
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Purchase Order</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="vendorId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vendor</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select vendor" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {vendors?.map((vendor: any) => (
                                      <SelectItem key={vendor.id} value={vendor.id}>
                                        {vendor.companyName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="totalAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Total Amount</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="paymentTerms"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Payment Terms</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="termsAndConditions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Terms & Conditions</FormLabel>
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
                          <Button type="submit" disabled={createPOMutation.isPending}>
                            {createPOMutation.isPending ? "Creating..." : "Create PO"}
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
                      <p className="text-sm text-muted-foreground mb-1">Total POs</p>
                      <p className="text-2xl font-bold">{purchaseOrders?.length || 0}</p>
                    </div>
                    <ShoppingCart className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Active POs</p>
                      <p className="text-2xl font-bold text-success">
                        {purchaseOrders?.filter((po: PurchaseOrder) => 
                          ['issued', 'acknowledged', 'shipped'].includes(po.status || '')
                        ).length || 0}
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
                      <p className="text-sm text-muted-foreground mb-1">Total Value</p>
                      <p className="text-2xl font-bold">
                        ₹{purchaseOrders ? 
                          (purchaseOrders.reduce((sum: number, po: PurchaseOrder) => 
                            sum + parseFloat(po.totalAmount || '0'), 0
                          )).toLocaleString() : '0'}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-accent" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">This Month</p>
                      <p className="text-2xl font-bold">
                        {purchaseOrders?.filter((po: PurchaseOrder) => {
                          const poDate = new Date(po.createdAt || '');
                          const now = new Date();
                          return poDate.getMonth() === now.getMonth() && poDate.getFullYear() === now.getFullYear();
                        }).length || 0}
                      </p>
                    </div>
                    <Calendar className="w-8 h-8 text-secondary" />
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
                        placeholder="Search by PO number..."
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
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="issued">Issued</SelectItem>
                        <SelectItem value="acknowledged">Acknowledged</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="invoiced">Invoiced</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={vendorFilter} onValueChange={setVendorFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Vendors</SelectItem>
                        {vendors?.map((vendor: any) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Purchase Orders List */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Purchase Orders</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {isLoading ? (
                      <div className="p-6">
                        <div className="animate-pulse space-y-4">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-20 bg-muted rounded"></div>
                          ))}
                        </div>
                      </div>
                    ) : filteredPOs && filteredPOs.length > 0 ? (
                      <div className="divide-y">
                        {filteredPOs.map((po: PurchaseOrder) => (
                          <div
                            key={po.id}
                            className={`p-6 cursor-pointer hover:bg-muted/50 ${
                              selectedPO === po.id ? 'bg-primary/5 border-l-4 border-primary' : ''
                            }`}
                            onClick={() => setSelectedPO(po.id)}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-semibold text-foreground">{po.poNumber}</h3>
                              <Badge className={getStatusColor(po.status || 'draft')}>
                                {getStatusIcon(po.status || 'draft')}
                                <span className="ml-1 capitalize">{po.status}</span>
                              </Badge>
                            </div>
                            
                            <div className="mb-4">
                              <Progress value={getProgressValue(po.status || 'draft')} className="h-2" />
                              <p className="text-xs text-muted-foreground mt-1">
                                {getProgressValue(po.status || 'draft')}% Complete
                              </p>
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Amount</p>
                                <p className="font-semibold">
                                  ₹{parseFloat(po.totalAmount || '0').toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Vendor</p>
                                <p className="font-semibold truncate">Vendor {po.vendorId?.slice(-4)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Created</p>
                                <p className="font-semibold">
                                  {new Date(po.createdAt || '').toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            {po.acknowledgedAt && (
                              <div className="mt-3 flex items-center text-sm text-success">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Acknowledged on {new Date(po.acknowledgedAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-12 text-center">
                        <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">No purchase orders found</h3>
                        <p className="text-muted-foreground">
                          {searchQuery || statusFilter !== "all" || vendorFilter !== "all"
                            ? "Try adjusting your search criteria or filters"
                            : "Create your first purchase order to get started"
                          }
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* PO Details */}
              <div className="lg:col-span-1">
                {selectedPO && selectedPODetails ? (
                  <div className="space-y-6">
                    {/* PO Summary */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <FileText className="w-5 h-5 mr-2" />
                          PO Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-muted-foreground">PO Number</p>
                            <p className="font-semibold">{selectedPODetails.poNumber}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total Amount</p>
                            <p className="text-2xl font-bold text-primary">
                              ₹{parseFloat(selectedPODetails.totalAmount || '0').toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Payment Terms</p>
                            <p className="font-medium">{selectedPODetails.paymentTerms || 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Status</p>
                            <Badge className={getStatusColor(selectedPODetails.status || 'draft')}>
                              {getStatusIcon(selectedPODetails.status || 'draft')}
                              <span className="ml-1 capitalize">{selectedPODetails.status}</span>
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Actions */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Actions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <Button className="w-full" variant="outline">
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                          <Button className="w-full" variant="outline">
                            <Download className="w-4 h-4 mr-2" />
                            Download PDF
                          </Button>
                          {selectedPODetails.status === 'draft' && (
                            <Button 
                              className="w-full bg-primary hover:bg-primary/90"
                              onClick={() => updatePOStatusMutation.mutate({ 
                                id: selectedPO, 
                                status: 'issued' 
                              })}
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              Issue PO
                            </Button>
                          )}
                          {selectedPODetails.status === 'issued' && (
                            <Button 
                              className="w-full bg-success hover:bg-success/90"
                              onClick={() => updatePOStatusMutation.mutate({ 
                                id: selectedPO, 
                                status: 'acknowledged' 
                              })}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Mark Acknowledged
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Line Items */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Package className="w-5 h-5 mr-2" />
                          Line Items
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {selectedPODetails.lineItems && selectedPODetails.lineItems.length > 0 ? (
                            selectedPODetails.lineItems.map((item: PoLineItem) => (
                              <div key={item.id} className="p-3 bg-muted rounded-lg">
                                <div className="flex justify-between items-start mb-2">
                                  <p className="font-medium">Product {item.productId?.slice(-4)}</p>
                                  <Badge variant="outline">{item.status}</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Quantity</p>
                                    <p>{item.quantity}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Unit Price</p>
                                    <p>₹{parseFloat(item.unitPrice || '0').toLocaleString()}</p>
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <p className="text-muted-foreground text-sm">Total</p>
                                  <p className="font-semibold">₹{parseFloat(item.totalPrice || '0').toLocaleString()}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-muted-foreground text-center py-4">No line items</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">Select a Purchase Order</h3>
                      <p className="text-muted-foreground">
                        Choose a PO from the list to view details and manage fulfillment
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
