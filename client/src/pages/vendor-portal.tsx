import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Clock, 
  CheckCircle, 
  Calendar, 
  FileText, 
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";

// Status color functions
const getVendorStatusColor = (invitation: any) => {
  const status = invitation.status || 'invited';
  switch (status.toLowerCase()) {
    case 'invited':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'responded':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'po_generated':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

const getVendorStatusText = (invitation: any) => {
  const status = invitation.status || 'invited';
  switch (status.toLowerCase()) {
    case 'invited':
      return 'INVITED';
    case 'responded':
      return 'RESPONDED';
    case 'cancelled':
      return 'CANCELLED';
    case 'po_generated':
      return 'PO GENERATED';
    default:
      return status.toUpperCase();
  }
};

const getRfxTypeColor = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'rfi':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'rfp':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'rfq':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

export default function VendorPortal() {
  // Fetch vendor's RFx invitations
  const { data: invitations = [], isLoading: invitationsLoading } = useQuery({
    queryKey: ['/api/vendor/rfx-invitations'],
    queryFn: () => apiRequest('/api/vendor/rfx-invitations'),
  });

  // Fetch vendor's RFx responses
  const { data: responses = [], isLoading: responsesLoading } = useQuery({
    queryKey: ['/api/vendor/rfx-responses'],
    queryFn: () => apiRequest('/api/vendor/rfx-responses'),
  });

  const pendingInvitations = invitations.filter((inv: any) => {
    const invStatus = inv.status || 'invited';
    const isNotExpired = inv.rfxDueDate ? new Date(inv.rfxDueDate) > new Date() : true;
    return (invStatus === 'invited' || invStatus === 'active') && invStatus !== 'responded' && isNotExpired;
  });
  
  const respondedInvitations = invitations.filter((inv: any) => inv.status === 'responded');
  
  console.log('DEBUG: All invitations:', invitations);
  console.log('DEBUG: Pending invitations:', pendingInvitations);
  console.log('DEBUG: Responded invitations:', respondedInvitations);

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">RFx Invitations</h1>
        <p className="text-muted-foreground">
          View and respond to RFx invitations from buyers
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="flex items-center p-6">
            <Clock className="h-8 w-8 text-orange-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{invitations.length}</p>
              <p className="text-sm text-muted-foreground">Invitations</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <FileText className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{responses.length}</p>
              <p className="text-sm text-muted-foreground">Responses</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{pendingInvitations.filter((inv: any) => inv.rfxStatus === 'active').length}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending ({pendingInvitations.length})
          </TabsTrigger>
          <TabsTrigger value="responded" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Responded ({respondedInvitations.length})
          </TabsTrigger>
          <TabsTrigger value="responses" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            My Responses ({responses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                RFx Invitations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invitationsLoading ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">Loading invitations...</div>
                </div>
              ) : pendingInvitations.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No pending invitations</h3>
                  <p className="text-sm text-muted-foreground">
                    You don't have any pending RFx invitations at the moment.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingInvitations.map((invitation: any) => {
                    const isExpired = invitation.rfxDueDate ? new Date(invitation.rfxDueDate) < new Date() : false;
                    console.log('DEBUG: Invitation details:', {
                      rfxId: invitation.rfxId,
                      status: invitation.status,
                      isExpired,
                      rfxDueDate: invitation.rfxDueDate,
                      shouldShowRespond: invitation.status === 'invited' && !isExpired
                    });
                    
                    return (
                      <div key={invitation.rfxId} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-medium">{invitation.rfxTitle || 'Untitled RFx'}</h3>
                              <Badge className={getRfxTypeColor(invitation.rfxType)}>
                                {(invitation.rfxType || 'RFX').toUpperCase()}
                              </Badge>
                              <Badge className={getVendorStatusColor(invitation)}>
                                {getVendorStatusText(invitation)}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground">
                              {invitation.rfxScope || 'No description available'}
                            </p>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Created: {invitation.rfxReferenceNo || 'N/A'}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {invitation.rfxDueDate ? (
                                  <span className={isExpired ? 'text-red-600 font-medium' : ''}>
                                    Due: {format(new Date(invitation.rfxDueDate), 'PPp')}
                                  </span>
                                ) : (
                                  'Due: N/A'
                                )}
                              </div>
                              <div>Vendors: 0</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            {(invitation.status === 'invited' || invitation.status === 'active') && 
                             !isExpired && 
                             invitation.status !== 'responded' && (
                              <Button 
                                variant="default" 
                                size="sm" 
                                data-testid={`button-respond-${invitation.rfxId}`}
                                className="bg-primary hover:bg-primary/90"
                              >
                                Respond
                              </Button>
                            )}
                            <Button variant="outline" size="sm" data-testid={`button-view-${invitation.rfxId}`}>
                              View
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responded" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Responded Invitations</CardTitle>
            </CardHeader>
            <CardContent>
              {respondedInvitations.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No responses yet</h3>
                  <p className="text-sm text-muted-foreground">
                    You haven't responded to any RFx invitations yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {respondedInvitations.map((invitation: any) => (
                    <div key={invitation.rfxId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{invitation.rfxTitle || 'Untitled RFx'}</h3>
                          <p className="text-sm text-muted-foreground">{invitation.rfxScope || 'No description available'}</p>
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          RESPONDED
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Responses</CardTitle>
            </CardHeader>
            <CardContent>
              {responsesLoading ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">Loading responses...</div>
                </div>
              ) : responses.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No responses submitted</h3>
                  <p className="text-sm text-muted-foreground">
                    You haven't submitted any responses yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {responses.map((response: any) => (
                    <div key={response.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{response.rfxTitle}</h3>
                          <p className="text-sm text-muted-foreground">
                            Submitted: {format(new Date(response.submittedAt), 'PPp')}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          View Response
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}