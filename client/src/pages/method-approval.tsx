import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Calendar, 
  Clock, 
  FileText, 
  Search, 
  User, 
  Building2, 
  CheckCircle, 
  XCircle,
  Eye, 
  Package, 
  ShoppingCart,
  Gavel,
  FileQuestion,
  IndianRupee,
  Users,
  AlertCircle,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Edit3
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SourcingEvent {
  id: string;
  eventNumber: string;
  procurementRequestId: string;
  procurementRequest?: {
    requestNumber: string;
    title: string;
    department: string;
    priority: string;
    estimatedBudget?: number;
    requestedDeliveryDate: string;
  };
  type: "RFI" | "RFP" | "RFQ" | "AUCTION" | "DIRECT_PO";
  title: string;
  description?: string;
  spendEstimate?: string;
  justification?: string;
  selectedVendorIds: string[];
  status: "PENDING_SM_APPROVAL" | "SM_APPROVED" | "SM_REJECTED" | "CHANGES_REQUESTED";
  createdBy: string;
  createdAt: string;
  rejectionReason?: string;
  changeRequestComments?: string;
}

export default function MethodApproval() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<SourcingEvent | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | "request_changes" | null>(null);
  const [comments, setComments] = useState("");
  
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch pending sourcing events for SM approval
  const { data: sourcingEvents = [], isLoading } = useQuery({
    queryKey: ["/api/sourcing-events/pending"],
    retry: false,
  });

  // Fetch vendors for event details
  const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors"],
    retry: false,
  });

  // Process approval action mutation
  const processApprovalMutation = useMutation({
    mutationFn: async ({ eventId, action, comments }: { eventId: string; action: string; comments?: string }) => {
      return await apiRequest(`/api/sourcing-events/${eventId}/process-approval`, "POST", { action, comments });
    },
    onSuccess: (_, variables) => {
      const actionText = variables.action === "approve" ? "approved" : 
                        variables.action === "reject" ? "rejected" : "sent back for changes";
      toast({
        title: "Action Completed",
        description: `Sourcing event has been ${actionText}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sourcing-events/pending"] });
      setIsActionModalOpen(false);
      setIsDetailsModalOpen(false);
      setComments("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process approval",
        variant: "destructive",
      });
    },
  });

  const handleProcessAction = () => {
    if (!selectedEvent || !actionType) return;

    if (actionType === "reject" && !comments) {
      toast({
        title: "Comments Required",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    if (actionType === "request_changes" && !comments) {
      toast({
        title: "Comments Required",
        description: "Please specify what changes are needed",
        variant: "destructive",
      });
      return;
    }

    processApprovalMutation.mutate({
      eventId: selectedEvent.id,
      action: actionType,
      comments: comments || undefined,
    });
  };

  const filteredEvents = (sourcingEvents as SourcingEvent[]).filter((event: SourcingEvent) =>
    event.eventNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.procurementRequest?.requestNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusColors = {
    PENDING_SM_APPROVAL: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    SM_APPROVED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    SM_REJECTED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    CHANGES_REQUESTED: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  };

  const typeIcons = {
    RFI: <FileQuestion className="w-4 h-4" />,
    RFP: <FileQuestion className="w-4 h-4" />,
    RFQ: <FileQuestion className="w-4 h-4" />,
    AUCTION: <Gavel className="w-4 h-4" />,
    DIRECT_PO: <ShoppingCart className="w-4 h-4" />,
  };

  const getSelectedVendorNames = (vendorIds: string[]) => {
    return vendorIds.map(id => {
      const vendor = (vendors as any[]).find((v: any) => v.id === id);
      return vendor?.companyName || "Unknown Vendor";
    }).join(", ");
  };

  const validatePolicyCompliance = (event: SourcingEvent) => {
    const issues = [];
    
    if (event.type === "DIRECT_PO") {
      const spendAmount = event.spendEstimate ? parseFloat(event.spendEstimate) : 0;
      if (spendAmount > 100000) {
        issues.push("Direct PO not allowed for amounts > ₹100K. RFx or Auction required.");
      }
      if (!event.justification) {
        issues.push("Business justification required for Direct PO.");
      }
    }

    if (event.selectedVendorIds.length < 3 && event.type !== "DIRECT_PO") {
      issues.push("Minimum 3 vendors recommended for competitive sourcing.");
    }

    return issues;
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Method Approval</h1>
          <p className="text-muted-foreground">
            Review and approve procurement method selections by Sourcing Executives
          </p>
        </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by event number, title, or PR number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-events"
          />
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
                <p className="text-2xl font-bold">
                  {filteredEvents.filter((e: SourcingEvent) => e.status === "PENDING_SM_APPROVAL").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">
                  ₹{filteredEvents.reduce((sum: number, e: SourcingEvent) => sum + (parseFloat(e.spendEstimate || "0")), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Direct POs</p>
                <p className="text-2xl font-bold">
                  {filteredEvents.filter((e: SourcingEvent) => e.type === "DIRECT_PO").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Auctions</p>
                <p className="text-2xl font-bold">
                  {filteredEvents.filter((e: SourcingEvent) => e.type === "AUCTION").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Method Approvals</CardTitle>
          <CardDescription>
            Review procurement method selections and approve or request changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading sourcing events...</div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending method approvals found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Number</TableHead>
                  <TableHead>PR Number</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Spend Estimate</TableHead>
                  <TableHead>Policy Check</TableHead>
                  <TableHead>Vendors</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event: SourcingEvent) => {
                  const policyIssues = validatePolicyCompliance(event);
                  return (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.eventNumber}</TableCell>
                      <TableCell>{event.procurementRequest?.requestNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {typeIcons[event.type as keyof typeof typeIcons]}
                          {event.type}
                        </div>
                      </TableCell>
                      <TableCell>
                        {event.spendEstimate ? `$${parseFloat(event.spendEstimate).toLocaleString()}` : "N/A"}
                      </TableCell>
                      <TableCell>
                        {policyIssues.length > 0 ? (
                          <Badge variant="destructive">
                            {policyIssues.length} Issue{policyIssues.length > 1 ? "s" : ""}
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Compliant
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {event.selectedVendorIds.length} Vendor{event.selectedVendorIds.length > 1 ? "s" : ""}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[event.status as keyof typeof statusColors]}>
                          {event.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedEvent(event);
                              setIsDetailsModalOpen(true);
                            }}
                            data-testid={`button-view-event-${event.id}`}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Review
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Event Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sourcing Event Review</DialogTitle>
            <DialogDescription>
              Review the sourcing event details and make approval decision
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-6">
              {/* Policy Compliance Check */}
              {(() => {
                const policyIssues = validatePolicyCompliance(selectedEvent);
                return policyIssues.length > 0 && (
                  <Card className="border-red-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="w-5 h-5" />
                        Policy Compliance Issues
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {policyIssues.map((issue, index) => (
                          <li key={index} className="flex items-start gap-2 text-red-600">
                            <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* PR Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Procurement Request Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>PR Number</Label>
                      <p className="font-medium">{selectedEvent.procurementRequest?.requestNumber}</p>
                    </div>
                    <div>
                      <Label>Department</Label>
                      <p className="font-medium">{selectedEvent.procurementRequest?.department}</p>
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <p className="font-medium">{selectedEvent.procurementRequest?.priority}</p>
                    </div>
                    <div>
                      <Label>Estimated Budget</Label>
                      <p className="font-medium">
                        {selectedEvent.procurementRequest?.estimatedBudget 
                          ? `$${selectedEvent.procurementRequest.estimatedBudget.toLocaleString()}` 
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sourcing Event Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {typeIcons[selectedEvent.type]}
                    Sourcing Event Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Event Number</Label>
                      <p className="font-medium">{selectedEvent.eventNumber}</p>
                    </div>
                    <div>
                      <Label>Method Type</Label>
                      <p className="font-medium">{selectedEvent.type}</p>
                    </div>
                    <div>
                      <Label>Spend Estimate</Label>
                      <p className="font-medium">
                        {selectedEvent.spendEstimate ? `$${parseFloat(selectedEvent.spendEstimate).toLocaleString()}` : "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label>Selected Vendors</Label>
                      <p className="font-medium">{selectedEvent.selectedVendorIds.length} vendors</p>
                    </div>
                  </div>
                  <div>
                    <Label>Event Title</Label>
                    <p className="font-medium">{selectedEvent.title}</p>
                  </div>
                  {selectedEvent.description && (
                    <div>
                      <Label>Description</Label>
                      <p>{selectedEvent.description}</p>
                    </div>
                  )}
                  {selectedEvent.justification && (
                    <div>
                      <Label>Business Justification</Label>
                      <p>{selectedEvent.justification}</p>
                    </div>
                  )}
                  <div>
                    <Label>Selected Vendors</Label>
                    <p>{getSelectedVendorNames(selectedEvent.selectedVendorIds)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Approval Actions */}
              {selectedEvent.status === "PENDING_SM_APPROVAL" && (
                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={() => {
                      setActionType("approve");
                      setIsActionModalOpen(true);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="button-approve-event"
                  >
                    <ThumbsUp className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActionType("request_changes");
                      setIsActionModalOpen(true);
                    }}
                    data-testid="button-request-changes"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Request Changes
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setActionType("reject");
                      setIsActionModalOpen(true);
                    }}
                    data-testid="button-reject-event"
                  >
                    <ThumbsDown className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Modal */}
      <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve Sourcing Event" :
               actionType === "reject" ? "Reject Sourcing Event" :
               "Request Changes"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve" ? "Confirm approval of this sourcing event" :
               actionType === "reject" ? "Provide reason for rejection" :
               "Specify what changes are needed"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {actionType !== "approve" && (
              <div className="space-y-2">
                <Label htmlFor="comments">
                  {actionType === "reject" ? "Rejection Reason *" : "Change Request Comments *"}
                </Label>
                <Textarea
                  id="comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder={
                    actionType === "reject" 
                      ? "Explain why this event is being rejected..."
                      : "Specify what changes are needed..."
                  }
                  rows={4}
                  data-testid="textarea-comments"
                />
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleProcessAction}
                disabled={processApprovalMutation.isPending}
                className={
                  actionType === "approve" ? "bg-green-600 hover:bg-green-700" :
                  actionType === "reject" ? "bg-red-600 hover:bg-red-700" :
                  ""
                }
                data-testid="button-confirm-action"
              >
                {processApprovalMutation.isPending ? "Processing..." : 
                 actionType === "approve" ? "Approve" :
                 actionType === "reject" ? "Reject" :
                 "Request Changes"}
              </Button>
              <Button variant="outline" onClick={() => setIsActionModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}