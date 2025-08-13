import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  XCircle, 
  ArrowLeft, 
  Edit3,
  FileText, 
  Download,
  Calendar,
  User,
  Building2,
  Package,
  DollarSign,
  Clock
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

interface ProcurementRequest {
  id: string;
  requestNumber: string;
  title: string;
  description: string | null;
  department: string;
  priority: string;
  requestedBy: string;
  requestedDeliveryDate: string;
  createdAt: string;
  overallStatus: string;
  estimatedBudget: number | null;
  justification: string | null;
  bomId: string;
  currentRequestApprover: string | null;
  requestApprovalStatus: string;
}

interface BOMItem {
  id: string;
  bomId: string;
  productId: string | null;
  itemName: string;
  itemCode: string | null;
  description: string | null;
  quantity: string;
  uom: string;
  specifications: string | null;
  estimatedPrice: number | null;
}

interface BOM {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  createdBy: string;
  createdAt: string;
  items: BOMItem[];
}

const statusColors: Record<string, string> = {
  'request_approval_pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'request_approved': 'bg-green-100 text-green-800 border-green-200',
  'rejected': 'bg-red-100 text-red-800 border-red-200',
  'needs_edits': 'bg-orange-100 text-orange-800 border-orange-200',
};

const priorityColors: Record<string, string> = {
  'low': 'bg-blue-100 text-blue-800 border-blue-200',
  'medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'high': 'bg-orange-100 text-orange-800 border-orange-200',
  'urgent': 'bg-red-100 text-red-800 border-red-200',
};

export default function PRApproval() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [rejectReason, setRejectReason] = useState("");
  const [sendBackReason, setSendBackReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showSendBackDialog, setShowSendBackDialog] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user has approval permissions
  const canApprove = user && ['request_approver', 'admin'].includes((user as any).role);

  // Fetch procurement request
  const { data: request, isLoading: requestLoading } = useQuery<ProcurementRequest>({
    queryKey: [`/api/procurement-requests/${id}`],
    enabled: !!id,
  });

  // Fetch BOM details
  const { data: bom, isLoading: bomLoading } = useQuery<BOM>({
    queryKey: [`/api/boms/${request?.bomId}`],
    enabled: !!request?.bomId,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/pr/${id}/approve`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/procurement-requests/${id}`] });
      toast({
        title: "Success",
        description: "Procurement request approved successfully",
      });
      setLocation('/procurement-requests');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve request",
        variant: "destructive",
      });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      return apiRequest(`/api/pr/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/procurement-requests/${id}`] });
      toast({
        title: "Success",
        description: "Procurement request rejected",
      });
      setShowRejectDialog(false);
      setRejectReason("");
      setLocation('/procurement-requests');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject request",
        variant: "destructive",
      });
    },
  });

  // Send back mutation
  const sendBackMutation = useMutation({
    mutationFn: async (reason: string) => {
      return apiRequest(`/api/pr/${id}/sendback`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/procurement-requests/${id}`] });
      toast({
        title: "Success",
        description: "Procurement request sent back for edits",
      });
      setShowSendBackDialog(false);
      setSendBackReason("");
      setLocation('/procurement-requests');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send back request",
        variant: "destructive",
      });
    },
  });

  if (requestLoading || bomLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Request Not Found</h3>
        <p className="text-muted-foreground mb-4">
          The procurement request you're looking for could not be found.
        </p>
        <Button onClick={() => setLocation('/procurement-requests')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Requests
        </Button>
      </div>
    );
  }

  if (!canApprove) {
    return (
      <div className="text-center py-12">
        <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
        <p className="text-muted-foreground mb-4">
          You don't have permission to approve procurement requests.
        </p>
        <Button onClick={() => setLocation('/procurement-requests')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Requests
        </Button>
      </div>
    );
  }

  const totalEstimatedValue = bom?.items?.reduce((sum, item) => {
    const price = item.estimatedPrice || 0;
    const qty = parseFloat(item.quantity) || 0;
    return sum + (price * qty);
  }, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => setLocation('/procurement-requests')}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Review Procurement Request</h1>
          </div>
          <p className="text-muted-foreground">
            Approve, reject, or send back for edits
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Dialog open={showSendBackDialog} onOpenChange={setShowSendBackDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-sendback">
                <Edit3 className="w-4 h-4 mr-2" />
                Send Back
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Back for Edits</DialogTitle>
                <DialogDescription>
                  Provide a reason why this request needs to be edited.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="sendback-reason">Reason for sending back *</Label>
                  <Textarea
                    id="sendback-reason"
                    placeholder="Please specify what needs to be changed..."
                    value={sendBackReason}
                    onChange={(e) => setSendBackReason(e.target.value)}
                    rows={3}
                    data-testid="textarea-sendback-reason"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowSendBackDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => sendBackMutation.mutate(sendBackReason)}
                    disabled={!sendBackReason.trim() || sendBackMutation.isPending}
                    data-testid="button-confirm-sendback"
                  >
                    {sendBackMutation.isPending ? "Sending..." : "Send Back"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
            <DialogTrigger asChild>
              <Button variant="destructive" data-testid="button-reject">
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject Procurement Request</DialogTitle>
                <DialogDescription>
                  Provide a reason for rejecting this request.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="reject-reason">Rejection reason *</Label>
                  <Textarea
                    id="reject-reason"
                    placeholder="Please explain why this request is being rejected..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    data-testid="textarea-reject-reason"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowRejectDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => rejectMutation.mutate(rejectReason)}
                    disabled={!rejectReason.trim() || rejectMutation.isPending}
                    data-testid="button-confirm-reject"
                  >
                    {rejectMutation.isPending ? "Rejecting..." : "Reject Request"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button 
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending}
            data-testid="button-approve"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {approveMutation.isPending ? "Approving..." : "Approve"}
          </Button>
        </div>
      </div>

      {/* PR Header Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Request Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">PR Number</Label>
                <p className="font-medium" data-testid="pr-number">{request.requestNumber}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                <Badge className={statusColors[request.overallStatus]} data-testid="pr-status">
                  {request.overallStatus.replace(/_/g, ' ').toUpperCase()}
                </Badge>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Title</Label>
              <p className="font-medium" data-testid="pr-title">{request.title}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Department</Label>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span data-testid="pr-department">{request.department}</span>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Priority</Label>
                <Badge className={priorityColors[request.priority]} data-testid="pr-priority">
                  {request.priority.toUpperCase()}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Requested By</Label>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span data-testid="pr-requester">{request.requestedBy}</span>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Need By Date</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span data-testid="pr-needby">
                    {format(parseISO(request.requestedDeliveryDate), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground">Created</Label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span data-testid="pr-created">
                  {format(parseISO(request.createdAt), 'MMM d, yyyy HH:mm')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Financial Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Estimated Budget</Label>
              <p className="text-2xl font-bold" data-testid="pr-budget">
                {request.estimatedBudget 
                  ? `$${request.estimatedBudget.toLocaleString()}` 
                  : 'Not specified'
                }
              </p>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Total Estimated Value (BOM)</Label>
              <p className="text-xl font-semibold text-green-600" data-testid="pr-estimated-total">
                ${totalEstimatedValue.toLocaleString()}
              </p>
            </div>

            {request.justification && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Justification</Label>
                <p className="text-sm bg-muted p-3 rounded" data-testid="pr-justification">
                  {request.justification}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Description/Notes */}
      {request.description && (
        <Card>
          <CardHeader>
            <CardTitle>Notes & Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm bg-muted p-4 rounded" data-testid="pr-description">
              {request.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* BOM Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Bill of Materials
          </CardTitle>
          <CardDescription>
            Items requested in this procurement ({bom?.items?.length || 0} items)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead>Est. Unit Price</TableHead>
                <TableHead>Est. Total</TableHead>
                <TableHead>Specifications</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bom?.items?.map((item, index) => {
                const unitPrice = item.estimatedPrice || 0;
                const quantity = parseFloat(item.quantity) || 0;
                const totalPrice = unitPrice * quantity;
                
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium" data-testid={`bom-code-${index}`}>
                      {item.itemCode || 'N/A'}
                    </TableCell>
                    <TableCell data-testid={`bom-desc-${index}`}>
                      <div>
                        <p className="font-medium">{item.itemName}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell data-testid={`bom-qty-${index}`}>{item.quantity}</TableCell>
                    <TableCell data-testid={`bom-uom-${index}`}>{item.uom}</TableCell>
                    <TableCell data-testid={`bom-unitprice-${index}`}>
                      {unitPrice > 0 ? `$${unitPrice.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell data-testid={`bom-total-${index}`}>
                      {totalPrice > 0 ? `$${totalPrice.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell data-testid={`bom-specs-${index}`}>
                      {item.specifications ? (
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          Has specs
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              
              {(!bom?.items || bom.items.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                    No items found in BOM
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Attachments Section - Placeholder for future implementation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Attachments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No attachments uploaded
          </p>
        </CardContent>
      </Card>
    </div>
  );
}