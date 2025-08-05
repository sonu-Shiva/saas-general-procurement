import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Clock, 
  CheckCircle, 
  Calendar, 
  FileText, 
  AlertCircle,
  Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";

interface RfxInvitation {
  id: string;
  rfxId: string;
  vendorId: string;
  status: string;
  invitedAt: string;
  respondedAt?: string;
  rfx: {
    id: string;
    title: string;
    referenceNo?: string;
    type: string;
    scope: string;
    criteria?: string;
    dueDate: string;
    budget?: number;
    contactPerson?: string;
    status: string;
    termsAndConditionsPath?: string;
    termsAndConditionsRequired?: boolean;
  };
}

// Helper function to get the vendor's status display (5-state system)
function getVendorStatus(invitation: RfxInvitation): { text: string; color: string } {
  // Priority 1: Check if vendor has responded
  if (invitation.status === 'responded') {
    return { text: 'RESPONDED', color: 'bg-purple-100 text-purple-700' };
  }
  
  // Priority 2: Check RFx status (this is the key fix)
  const rfxStatus = invitation.rfx?.status?.toLowerCase();
  
  switch (rfxStatus) {
    case 'active':
      return { text: 'ACTIVE', color: 'bg-green-100 text-green-700' };
    case 'cancelled':
      return { text: 'CANCELLED', color: 'bg-red-100 text-red-700' };
    case 'po_generated':
      return { text: 'PO GENERATED', color: 'bg-blue-100 text-blue-700' };
    default:
      // Default to ACTIVE for any RFx invitation
      return { text: 'ACTIVE', color: 'bg-green-100 text-green-700' };
  }
}

function getRfxTypeColor(type: string) {
  switch (type.toLowerCase()) {
    case 'rfq': return 'bg-blue-100 text-blue-800';
    case 'rfp': return 'bg-purple-100 text-purple-800';
    case 'rfi': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

export default function VendorPortalNew() {
  const [selectedInvitation, setSelectedInvitation] = useState<RfxInvitation | null>(null);

  // Fetch vendor's RFx invitations
  const { data: invitations = [], isLoading: invitationsLoading } = useQuery({
    queryKey: ['/api/vendor/rfx-invitations'],
    queryFn: () => apiRequest('/api/vendor/rfx-invitations'),
  });

  // Filter for active invitations (simplified logic)
  const activeInvitations = invitations.filter((inv: RfxInvitation) => {
    const isNotExpired = new Date(inv.rfx.dueDate) > new Date();
    const isActiveRfx = inv.rfx?.status?.toLowerCase() === 'active';
    const hasNotResponded = inv.status !== 'responded';
    return isNotExpired && isActiveRfx && hasNotResponded;
  });

  const respondedInvitations = invitations.filter((inv: RfxInvitation) => inv.status === 'responded');

  // Debug logging
  console.log('=== VENDOR PORTAL DEBUG ===');
  console.log('All invitations:', invitations);
  console.log('Active invitations:', activeInvitations);
  console.log('Responded invitations:', respondedInvitations);

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">RFx Invitations</h1>
        <p className="text-muted-foreground">
          View and respond to RFx invitations from buyers
        </p>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <Badge variant="outline" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {invitations.length} Invitations
        </Badge>
        <Badge variant="outline" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {respondedInvitations.length} Responses
        </Badge>
        <Badge variant="outline" className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          {activeInvitations.length} Active
        </Badge>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Active ({activeInvitations.length})
          </TabsTrigger>
          <TabsTrigger value="responded" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Responded ({respondedInvitations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">📄 RFx Invitations</h3>
            
            {invitationsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-3 bg-muted rounded"></div>
                        <div className="h-3 bg-muted rounded w-2/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : activeInvitations.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Active Invitations</h3>
                    <p className="text-muted-foreground">
                      You don't have any active RFx invitations at the moment.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeInvitations.map((invitation: RfxInvitation) => {
                  const isExpired = new Date(invitation.rfx.dueDate) < new Date();
                  const canRespond = !isExpired && invitation.status !== 'responded';
                  const vendorStatus = getVendorStatus(invitation);
                  
                  return (
                    <Card key={invitation.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-lg">{invitation.rfx.title || 'Untitled RFx'}</CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge className={getRfxTypeColor(invitation.rfx.type)}>
                                {invitation.rfx.type.toUpperCase()}
                              </Badge>
                              <Badge className={vendorStatus.color}>
                                {vendorStatus.text}
                              </Badge>
                              {isExpired && <Badge variant="destructive">Expired</Badge>}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className={isExpired ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                              Due: {format(new Date(invitation.rfx.dueDate), 'PPp')}
                            </span>
                          </div>
                          {invitation.rfx.budget && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">₹</span>
                              <span className="text-muted-foreground">Budget: ₹{invitation.rfx.budget}</span>
                            </div>
                          )}
                          {invitation.rfx.termsAndConditionsPath && (
                            <div className="flex items-center gap-2 text-sm">
                              <FileText className="h-4 w-4 text-orange-500" />
                              <span className="text-orange-600 font-medium">Terms & Conditions Required</span>
                            </div>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {invitation.rfx.scope || 'No description available'}
                        </p>

                        <div className="flex gap-2">
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              console.log('View Details clicked for invitation:', invitation);
                              setSelectedInvitation(invitation);
                            }}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => {
                              console.log('Respond clicked for invitation:', invitation);
                              setSelectedInvitation(invitation);
                            }}
                            disabled={!canRespond}
                            variant={canRespond ? "default" : "secondary"}
                          >
                            {isExpired ? 'Expired' : 
                             invitation.status === 'responded' ? 'Already Responded' : 
                             'Respond Now'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="responded">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">✅ Responded Invitations</h3>
            {respondedInvitations.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Responses Yet</h3>
                    <p className="text-muted-foreground">
                      You haven't responded to any RFx invitations yet.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {respondedInvitations.map((invitation: RfxInvitation) => {
                  const vendorStatus = getVendorStatus(invitation);
                  
                  return (
                    <Card key={invitation.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-lg">{invitation.rfx.title || 'Untitled RFx'}</CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge className={getRfxTypeColor(invitation.rfx.type)}>
                                {invitation.rfx.type.toUpperCase()}
                              </Badge>
                              <Badge className={vendorStatus.color}>
                                {vendorStatus.text}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Responded on: {invitation.respondedAt ? format(new Date(invitation.respondedAt), 'PPp') : 'N/A'}
                        </p>
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-2" />
                          View Response
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}