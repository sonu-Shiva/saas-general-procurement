import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';
import { CheckCircle, XCircle, AlertCircle, Eye, FileText, Users, DollarSign, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';

interface SourcingEvent {
  id: string;
  eventNumber: string;
  procurementRequestId: string;
  type: string;
  title: string;
  description: string;
  spendEstimate: number;
  justification: string;
  selectedVendorIds: string[];
  status: string;
  createdBy: string;
  createdAt: string;
  procurementRequest?: {
    requestNumber: string;
    title: string;
    department: string;
    priority: string;
    requestedBy: string;
    requestedDeliveryDate: string;
    justification: string;
    estimatedBudget: number;
  };
  vendors?: Array<{
    id: string;
    companyName: string;
    email: string;
    phone: string;
  }>;
}

const APPROVAL_THRESHOLD = 100000; // $100K threshold for policy enforcement

export default function MethodApprovalPage() {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'request_changes' | null>(null);
  const [comments, setComments] = useState('');
  const [showActionDialog, setShowActionDialog] = useState(false);
  const queryClient = useQueryClient();

  // Fetch pending sourcing events for approval
  const { data: pendingEvents = [], isLoading } = useQuery<SourcingEvent[]>({
    queryKey: ['/api/events/pending-approval']
  });

  // Process approval action
  const approvalMutation = useMutation({
    mutationFn: async ({ eventId, action, comments }: { eventId: string; action: string; comments?: string }) => {
      return apiRequest(`/api/events/${eventId}/approval`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          comments,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events/pending-approval'] });
      setShowActionDialog(false);
      setSelectedEvent(null);
      setActionType(null);
      setComments('');
    },
  });

  const handleAction = (eventId: string, action: 'approve' | 'reject' | 'request_changes') => {
    setSelectedEvent(eventId);
    setActionType(action);
    setShowActionDialog(true);
  };

  const confirmAction = () => {
    if (!selectedEvent || !actionType) return;

    // Validation for rejection and request changes
    if ((actionType === 'reject' || actionType === 'request_changes') && !comments.trim()) {
      alert('Comments are required for rejection or requesting changes');
      return;
    }

    approvalMutation.mutate({
      eventId: selectedEvent,
      action: actionType,
      comments: comments.trim() || undefined,
    });
  };

  const validatePolicyCompliance = (event: SourcingEvent) => {
    const violations: string[] = [];
    
    // Policy 1: High-value procurements require competitive methods
    if (event.spendEstimate > APPROVAL_THRESHOLD && event.type === 'DIRECT_PO') {
      violations.push(`Spend estimate $${event.spendEstimate.toLocaleString()} exceeds threshold - requires RFx or Auction`);
    }
    
    // Policy 2: Direct PO requires justification
    if (event.type === 'DIRECT_PO' && (!event.justification || event.justification.length < 50)) {
      violations.push('Direct procurement requires detailed justification (minimum 50 characters)');
    }
    
    // Policy 3: Minimum vendor requirements for competitive methods
    if (['RFQ', 'RFP', 'RFI', 'AUCTION'].includes(event.type) && event.selectedVendorIds.length < 3) {
      violations.push('Competitive procurement methods require minimum 3 vendors');
    }
    
    return violations;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'PENDING_SM_APPROVAL': { variant: 'secondary' as const, text: 'Pending Approval', icon: Clock },
      'SM_APPROVED': { variant: 'default' as const, text: 'Approved', icon: CheckCircle },
      'SM_REJECTED': { variant: 'destructive' as const, text: 'Rejected', icon: XCircle },
      'ACTIVE': { variant: 'default' as const, text: 'Active', icon: CheckCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { 
      variant: 'secondary' as const, 
      text: status, 
      icon: AlertCircle 
    };

    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  const getMethodBadge = (type: string) => {
    const methodConfig = {
      'RFQ': { variant: 'default' as const, text: 'Request for Quotation' },
      'RFP': { variant: 'default' as const, text: 'Request for Proposal' },
      'RFI': { variant: 'default' as const, text: 'Request for Information' },
      'AUCTION': { variant: 'secondary' as const, text: 'Reverse Auction' },
      'DIRECT_PO': { variant: 'outline' as const, text: 'Direct Purchase' },
    };

    const config = methodConfig[type as keyof typeof methodConfig] || { 
      variant: 'outline' as const, 
      text: type 
    };
    
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      'urgent': { variant: 'destructive' as const, text: 'Urgent' },
      'high': { variant: 'destructive' as const, text: 'High' },
      'medium': { variant: 'secondary' as const, text: 'Medium' },
      'low': { variant: 'outline' as const, text: 'Low' },
    };

    const config = priorityConfig[priority as keyof typeof priorityConfig] || { 
      variant: 'outline' as const, 
      text: priority 
    };
    
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="method-approval-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">Method Approval</h1>
          <p className="text-muted-foreground mt-2">Review and approve sourcing methods for procurement requests</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {pendingEvents.length} Pending
          </Badge>
        </div>
      </div>

      {pendingEvents.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pending Approvals</h3>
              <p className="text-muted-foreground">All sourcing methods have been reviewed</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {pendingEvents.map((event: SourcingEvent) => {
            const policyViolations = validatePolicyCompliance(event);
            const hasViolations = policyViolations.length > 0;

            return (
              <Card key={event.id} className={hasViolations ? 'border-red-200 bg-red-50/50' : ''} data-testid={`event-card-${event.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-xl">{event.title}</CardTitle>
                        {getStatusBadge(event.status)}
                        {getMethodBadge(event.type)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {event.eventNumber}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {event.procurementRequest?.department}
                        </span>
                        {event.procurementRequest?.priority && getPriorityBadge(event.procurementRequest.priority)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" data-testid={`view-details-${event.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Sourcing Event Details</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-6">
                            {/* Procurement Request Details */}
                            <div>
                              <h3 className="text-lg font-semibold mb-3">Procurement Request</h3>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Request Number</label>
                                  <p>{event.procurementRequest?.requestNumber}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Department</label>
                                  <p>{event.procurementRequest?.department}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Requested By</label>
                                  <p>{event.procurementRequest?.requestedBy}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Delivery Date</label>
                                  <p>{event.procurementRequest?.requestedDeliveryDate && format(new Date(event.procurementRequest.requestedDeliveryDate), 'MMM dd, yyyy')}</p>
                                </div>
                              </div>
                              {event.procurementRequest?.justification && (
                                <div className="mt-4">
                                  <label className="text-sm font-medium text-muted-foreground">Business Justification</label>
                                  <p className="text-sm bg-gray-50 p-3 rounded-md mt-1">{event.procurementRequest.justification}</p>
                                </div>
                              )}
                            </div>

                            <Separator />

                            {/* Sourcing Method Details */}
                            <div>
                              <h3 className="text-lg font-semibold mb-3">Sourcing Method</h3>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Method Type</label>
                                  <div className="mt-1">{getMethodBadge(event.type)}</div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-muted-foreground">Spend Estimate</label>
                                  <p className="text-lg font-semibold text-green-600">
                                    ${event.spendEstimate?.toLocaleString() || '0'}
                                  </p>
                                </div>
                              </div>
                              {event.justification && (
                                <div className="mt-4">
                                  <label className="text-sm font-medium text-muted-foreground">Method Justification</label>
                                  <p className="text-sm bg-gray-50 p-3 rounded-md mt-1">{event.justification}</p>
                                </div>
                              )}
                            </div>

                            <Separator />

                            {/* Vendor Pool */}
                            <div>
                              <h3 className="text-lg font-semibold mb-3">Vendor Pool</h3>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">
                                    {event.selectedVendorIds.length} vendor(s) selected
                                  </span>
                                </div>
                                <div className="grid gap-2">
                                  {event.vendors?.map((vendor, index) => (
                                    <div key={vendor.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                      <div>
                                        <span className="font-medium">{vendor.companyName}</span>
                                        <span className="text-sm text-muted-foreground ml-2">({vendor.email})</span>
                                      </div>
                                    </div>
                                  )) || (
                                    <p className="text-sm text-muted-foreground">Vendor details not available</p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Policy Violations */}
                            {hasViolations && (
                              <>
                                <Separator />
                                <div>
                                  <h3 className="text-lg font-semibold mb-3 text-red-600">Policy Violations</h3>
                                  <div className="space-y-2">
                                    {policyViolations.map((violation, index) => (
                                      <Alert key={index} variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>{violation}</AlertDescription>
                                      </Alert>
                                    ))}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    {/* Quick Summary */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Spend Estimate</p>
                          <p className="font-semibold text-green-600">
                            ${event.spendEstimate?.toLocaleString() || '0'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Vendors</p>
                          <p className="font-semibold">{event.selectedVendorIds.length}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Submitted</p>
                          <p className="font-semibold">{format(new Date(event.createdAt), 'MMM dd, yyyy')}</p>
                        </div>
                      </div>
                    </div>

                    {/* Policy Violations Summary */}
                    {hasViolations && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>{policyViolations.length} Policy Violation(s) Detected:</strong>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            {policyViolations.map((violation, index) => (
                              <li key={index} className="text-sm">{violation}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => handleAction(event.id, 'request_changes')}
                        disabled={approvalMutation.isPending}
                        data-testid={`request-changes-${event.id}`}
                      >
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Request Changes
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleAction(event.id, 'reject')}
                        disabled={approvalMutation.isPending}
                        data-testid={`reject-${event.id}`}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        onClick={() => handleAction(event.id, 'approve')}
                        disabled={approvalMutation.isPending}
                        data-testid={`approve-${event.id}`}
                        className={hasViolations ? 'bg-orange-600 hover:bg-orange-700' : ''}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {hasViolations ? 'Override & Approve' : 'Approve'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Action Confirmation Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Approve Sourcing Method'}
              {actionType === 'reject' && 'Reject Sourcing Method'}
              {actionType === 'request_changes' && 'Request Changes'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {actionType === 'approve' && 'This will approve the sourcing method and proceed with vendor invitations or PO creation.'}
              {actionType === 'reject' && 'This will reject the sourcing method and send it back to the sourcing executive.'}
              {actionType === 'request_changes' && 'This will send the request back with your feedback for modifications.'}
            </p>
            
            {(actionType === 'reject' || actionType === 'request_changes') && (
              <div>
                <label className="text-sm font-medium">Comments *</label>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder={
                    actionType === 'reject' 
                      ? 'Please provide the reason for rejection...'
                      : 'Please specify what changes are needed...'
                  }
                  className="mt-1"
                  rows={4}
                  data-testid="action-comments"
                />
              </div>
            )}

            {actionType === 'approve' && (
              <div>
                <label className="text-sm font-medium">Comments (Optional)</label>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add any approval comments..."
                  className="mt-1"
                  rows={3}
                  data-testid="action-comments"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowActionDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={confirmAction}
                disabled={approvalMutation.isPending}
                variant={actionType === 'reject' ? 'destructive' : 'default'}
                data-testid="confirm-action"
              >
                {approvalMutation.isPending ? 'Processing...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}