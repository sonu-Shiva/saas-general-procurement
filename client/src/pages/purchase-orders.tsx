import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatCurrency } from "@/lib/utils";
import { 
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
  Package,
  Calendar,
  AlertTriangle,
  Mail,
  Phone,
  ThumbsUp,
  ThumbsDown,
  Send,
  XCircle,
  Trash2
} from "lucide-react";
import type { PurchaseOrder, PoLineItem } from "@shared/schema";

export default function PurchaseOrders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");

  const [selectedPO, setSelectedPO] = useState<string | null>(null);
  const [approvalComments, setApprovalComments] = useState("");
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject" | "issue" | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

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

  const approvalMutation = useMutation({
    mutationFn: async ({ poId, action, comments }: { poId: string; action: string; comments?: string }) => {
      await apiRequest("PATCH", `/api/purchase-orders/${poId}/${action}`, { comments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      setIsApprovalDialogOpen(false);
      setApprovalComments("");
      setApprovalAction(null);
      toast({
        title: "Success",
        description: `Purchase Order ${approvalAction}d successfully`,
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
        description: `Failed to ${approvalAction} Purchase Order`,
        variant: "destructive",
      });
    },
  });

  const handleApprovalAction = (po: PurchaseOrder, action: "approve" | "reject" | "issue") => {
    setSelectedPO(po.id);
    setApprovalAction(action);
    setIsApprovalDialogOpen(true);
  };

  const submitApproval = () => {
    if (!selectedPO || !approvalAction) return;
    
    approvalMutation.mutate({
      poId: selectedPO,
      action: approvalAction,
      comments: approvalComments
    });
  };

  const deleteMutation = useMutation({
    mutationFn: async (poId: string) => {
      await apiRequest("DELETE", `/api/purchase-orders/${poId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      toast({
        title: "Success",
        description: "Purchase Order deleted successfully",
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
        description: "Failed to delete Purchase Order",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (poId: string) => {
    if (confirm("Are you sure you want to delete this Purchase Order? This action cannot be undone.")) {
      deleteMutation.mutate(poId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "pending_approval":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
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
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "draft":
        return <Edit className="w-4 h-4" />;
      case "pending_approval":
        return <Clock className="w-4 h-4" />;
      case "approved":
        return <CheckCircle className="w-4 h-4" />;
      case "issued":
        return <FileText className="w-4 h-4" />;
      case "acknowledged":
        return <CheckCircle className="w-4 h-4" />;
      case "shipped":
        return <Truck className="w-4 h-4" />;
      case "delivered":
        return <Package className="w-4 h-4" />;
      case "invoiced":
        return <div className="w-4 h-4 flex items-center justify-center font-bold text-xs">₹</div>;
      case "paid":
        return <CheckCircle className="w-4 h-4" />;
      case "rejected":
        return <XCircle className="w-4 h-4" />;
      case "cancelled":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getProgressValue = (status: string) => {
    switch (status) {
      case "draft": return 5;
      case "pending_approval": return 15;
      case "approved": return 25;
      case "issued": return 35;
      case "acknowledged": return 50;
      case "shipped": return 70;
      case "delivered": return 85;
      case "invoiced": return 95;
      case "paid": return 100;
      case "rejected": return 0;
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
                <p className="text-sm text-blue-600 mt-2">
                  💡 Create new POs through Direct Procurement, RFx Management, or Auction Center
                </p>
              </div>
              <div className="flex space-x-3">
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>

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
                        {formatCurrency(purchaseOrders ? 
                          (purchaseOrders.reduce((sum: number, po: PurchaseOrder) => 
                            sum + parseFloat(po.totalAmount || '0'), 0
                          )) : 0)}
                      </p>
                    </div>
                    <div className="w-8 h-8 text-accent flex items-center justify-center font-bold text-xl">₹</div>
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

            {/* Role-based Status Tabs and Filters */}
            <Card className="mb-6">
              <CardContent className="p-6">
                {/* Status Tabs */}
                <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-6">
                  <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
                    <TabsTrigger value="all">All Orders</TabsTrigger>
                    {user?.role === 'sourcing_manager' && (
                      <>
                        <TabsTrigger value="pending_approval" className="text-yellow-600">
                          <Clock className="w-4 h-4 mr-1" />
                          Pending Approval
                        </TabsTrigger>
                        <TabsTrigger value="approved" className="text-green-600">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approved
                        </TabsTrigger>
                        <TabsTrigger value="rejected" className="text-red-600">
                          <XCircle className="w-4 h-4 mr-1" />
                          Rejected
                        </TabsTrigger>
                      </>
                    )}
                    <TabsTrigger value="issued" className="text-blue-600">
                      <Send className="w-4 h-4 mr-1" />
                      Issued
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Search and Additional Filters */}
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
                                  {formatCurrency(po.totalAmount)}
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
                              {formatCurrency(selectedPODetails.totalAmount)}
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
                          {/* Approval Actions for Sourcing Managers */}
                          {user?.role === 'sourcing_manager' && selectedPODetails.status === 'pending_approval' && (
                            <div className="space-y-2">
                              <Button 
                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleApprovalAction(selectedPODetails, 'approve')}
                              >
                                <ThumbsUp className="w-4 h-4 mr-2" />
                                Approve PO
                              </Button>
                              <Button 
                                className="w-full bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => handleApprovalAction(selectedPODetails, 'reject')}
                              >
                                <ThumbsDown className="w-4 h-4 mr-2" />
                                Reject PO
                              </Button>
                            </div>
                          )}
                          
                          {/* Issue Action for Sourcing Managers */}
                          {user?.role === 'sourcing_manager' && selectedPODetails.status === 'approved' && (
                            <Button 
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => handleApprovalAction(selectedPODetails, 'issue')}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Issue to Vendor
                            </Button>
                          )}

                          {/* Delete Action for Pending/Rejected POs */}
                          {(
                            (selectedPODetails.createdBy === user?.id && selectedPODetails.status === 'pending_approval') ||
                            (user?.role === 'sourcing_manager' && ['pending_approval', 'rejected'].includes(selectedPODetails.status || ''))
                          ) && (
                            <Button 
                              className="w-full bg-red-600 hover:bg-red-700 text-white mt-2"
                              onClick={() => handleDelete(selectedPODetails.id)}
                              disabled={deleteMutation.isPending}
                            >
                              {deleteMutation.isPending ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              ) : (
                                <Trash2 className="w-4 h-4 mr-2" />
                              )}
                              Delete PO
                            </Button>
                          )}

                          {/* Legacy Status Updates */}
                          {selectedPODetails.status === 'issued' && (
                            <Button 
                              className="w-full bg-primary hover:bg-primary/90"
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
                                    <p>{formatCurrency(item.unitPrice)}</p>
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <p className="text-muted-foreground text-sm">Total</p>
                                  <p className="font-semibold">{formatCurrency(item.totalPrice)}</p>
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

      {/* Approval Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'approve' && 'Approve Purchase Order'}
              {approvalAction === 'reject' && 'Reject Purchase Order'}  
              {approvalAction === 'issue' && 'Issue Purchase Order'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="comments">Comments {approvalAction === 'reject' ? '(Required)' : '(Optional)'}</Label>
              <Textarea
                id="comments"
                placeholder={
                  approvalAction === 'approve' ? 'Add approval comments...' :
                  approvalAction === 'reject' ? 'Please provide reason for rejection...' :
                  'Add any notes for vendor...'
                }
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setIsApprovalDialogOpen(false)}
                disabled={approvalMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                className={`flex-1 ${
                  approvalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                  approvalAction === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-blue-600 hover:bg-blue-700'
                } text-white`}
                onClick={submitApproval}
                disabled={approvalMutation.isPending || (approvalAction === 'reject' && !approvalComments.trim())}
              >
                {approvalMutation.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    {approvalAction === 'approve' && <ThumbsUp className="w-4 h-4 mr-2" />}
                    {approvalAction === 'reject' && <ThumbsDown className="w-4 h-4 mr-2" />}
                    {approvalAction === 'issue' && <Send className="w-4 h-4 mr-2" />}
                    {approvalAction === 'approve' && 'Approve'}
                    {approvalAction === 'reject' && 'Reject'}
                    {approvalAction === 'issue' && 'Issue'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
