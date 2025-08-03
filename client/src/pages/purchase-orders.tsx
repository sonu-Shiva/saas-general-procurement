import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
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
  const [statusFilter, setStatusFilter] = useState("pending_approval");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [selectedPO, setSelectedPO] = useState<string | null>(null);
  const [approvalComments, setApprovalComments] = useState("");
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject" | "issue" | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch purchase orders
  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ["/api/purchase-orders"],
    retry: false,
  });

  // Fetch vendors for filter dropdown
  const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors"],
    retry: false,
  });

  const approvalMutation = useMutation({
    mutationFn: async ({ poId, action, comments }: { poId: string; action: string; comments: string }) => {
      const endpoint = action === 'approve' ? 'approve' : action === 'reject' ? 'reject' : 'issue';
      await apiRequest(`/api/purchase-orders/${poId}/${endpoint}`, {
        method: "PATCH",
        body: JSON.stringify({
          comments
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      setIsApprovalDialogOpen(false);
      setApprovalComments("");
      setSelectedPO(null);
      setApprovalAction(null);
      toast({
        title: "Success",
        description: "Purchase Order updated successfully",
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
        description: "Failed to update Purchase Order",
        variant: "destructive",
      });
    },
  });

  const submitApproval = () => {
    if (!selectedPO || !approvalAction) return;
    
    if (approvalAction === 'reject' && !approvalComments.trim()) {
      toast({
        title: "Error",
        description: "Comments are required when rejecting a PO",
        variant: "destructive",
      });
      return;
    }

    approvalMutation.mutate({
      poId: selectedPO,
      action: approvalAction,
      comments: approvalComments
    });
  };

  const deleteMutation = useMutation({
    mutationFn: async (poId: string) => {
      await apiRequest(`/api/purchase-orders/${poId}`, {
        method: "DELETE"
      });
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

  // Filter POs based on current tab and search criteria
  const purchaseOrdersArray = Array.isArray(purchaseOrders) ? purchaseOrders : [];
  const filteredPOs = purchaseOrdersArray.filter((po: PurchaseOrder) => {
    const matchesSearch = po.poNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = po.status === statusFilter;
    const matchesVendor = vendorFilter === "all" || po.vendorId === vendorFilter;
    
    return matchesSearch && matchesStatus && matchesVendor;
  });

  return (
    <div className="space-y-6 p-6">
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
                <p className="text-2xl font-bold">{Array.isArray(purchaseOrders) ? purchaseOrders.length : 0}</p>
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
                  {Array.isArray(purchaseOrders) ? purchaseOrders.filter((po: PurchaseOrder) => 
                    ['issued', 'acknowledged', 'shipped'].includes(po.status || '')
                  ).length : 0}
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
                  {formatCurrency(Array.isArray(purchaseOrders) ? 
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
                  {purchaseOrdersArray.filter((po: PurchaseOrder) => {
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

      {/* 3-Bucket Status Tabs for Purchase Orders */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending_approval" className="text-yellow-600">
            <Clock className="w-4 h-4 mr-2" />
            Pending Approval ({purchaseOrdersArray.filter(po => po.status === 'pending_approval').length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="text-green-600">
            <CheckCircle className="w-4 h-4 mr-2" />
            Approved and Issued ({purchaseOrdersArray.filter(po => po.status === 'approved').length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="text-red-600">
            <XCircle className="w-4 h-4 mr-2" />
            Rejected ({purchaseOrdersArray.filter(po => po.status === 'rejected').length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by PO number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {Array.isArray(vendors) ? vendors.map((vendor: any) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.companyName}
                    </SelectItem>
                  )) : []}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Orders List */}
      {isLoading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading purchase orders...</p>
        </div>
      ) : filteredPOs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Purchase Orders Found</h3>
            <p className="text-muted-foreground">
              {statusFilter === 'pending_approval' 
                ? "No purchase orders are currently pending approval."
                : statusFilter === 'approved'
                ? "No purchase orders have been approved and issued yet."
                : "No purchase orders have been rejected."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPOs.map((po: PurchaseOrder) => (
            <Card key={po.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">{po.poNumber}</h3>
                      <Badge className={getStatusColor(po.status || '')}>
                        {getStatusIcon(po.status || '')}
                        <span className="ml-1 capitalize">{po.status?.replace('_', ' ')}</span>
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Vendor:</span>
                        <p className="text-foreground">{(po as any).vendorName || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium">Total Amount:</span>
                        <p className="text-foreground font-semibold">{formatCurrency(parseFloat(po.totalAmount || '0'))}</p>
                      </div>
                      <div>
                        <span className="font-medium">Created:</span>
                        <p className="text-foreground">{po.createdAt ? new Date(po.createdAt).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium">Expected Delivery:</span>
                        <p className="text-foreground">{(po as any).expectedDeliveryDate ? new Date((po as any).expectedDeliveryDate).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {statusFilter === 'pending_approval' && (user as any)?.role === 'sourcing_manager' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => {
                            setSelectedPO(po.id);
                            setApprovalAction('approve');
                            setIsApprovalDialogOpen(true);
                          }}
                        >
                          <ThumbsUp className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => {
                            setSelectedPO(po.id);
                            setApprovalAction('reject');
                            setIsApprovalDialogOpen(true);
                          }}
                        >
                          <ThumbsDown className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    {statusFilter === 'approved' && (user as any)?.role !== 'vendor' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => {
                          setSelectedPO(po.id);
                          setApprovalAction('issue');
                          setIsApprovalDialogOpen(true);
                        }}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Issue
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    {po.status === 'draft' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleDelete(po.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Progress bar for PO status */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{getProgressValue(po.status || '')}%</span>
                  </div>
                  <Progress value={getProgressValue(po.status || '')} className="h-2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approval Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {approvalAction === 'approve' && <ThumbsUp className="w-5 h-5 text-green-600" />}
              {approvalAction === 'reject' && <ThumbsDown className="w-5 h-5 text-red-600" />}
              {approvalAction === 'issue' && <Send className="w-5 h-5 text-blue-600" />}
              <span>
                {approvalAction === 'approve' && 'Approve Purchase Order'}
                {approvalAction === 'reject' && 'Reject Purchase Order'}
                {approvalAction === 'issue' && 'Issue Purchase Order'}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="comments">
                Comments {approvalAction === 'reject' && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                id="comments"
                placeholder={
                  approvalAction === 'approve' ? "Optional approval comments..." :
                  approvalAction === 'reject' ? "Please provide reason for rejection..." :
                  "Optional issue comments..."
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