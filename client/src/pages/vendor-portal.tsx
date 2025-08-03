import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { TermsAcceptanceDialog } from "@/components/TermsAcceptanceDialog";
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Send,
  Eye,
  DollarSign,
  Calendar,
  Building2,
  Mail,
  Phone,
  ExternalLink
} from "lucide-react";

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
    type: string;
    scope: string;
    dueDate: string;
    status: string;
    budget?: string;
    termsAndConditionsPath?: string;
    criteria?: string;
    evaluationParameters?: string;
  };
}

interface RfxResponse {
  id: string;
  rfxId: string;
  vendorId: string;
  proposedPrice: number;
  deliveryTime: string;
  technicalSpecification: string;
  additionalNotes?: string;
  status: string;
  submittedAt: string;
}

export default function VendorPortal() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInvitation, setSelectedInvitation] = useState<RfxInvitation | null>(null);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [isTermsDialogOpen, setIsTermsDialogOpen] = useState(false);
  const [responseData, setResponseData] = useState({
    proposedPrice: "",
    deliveryTime: "",
    technicalSpecification: "",
    additionalNotes: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch vendor's RFx invitations
  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ["/api/vendor/rfx-invitations"],
    retry: false,
  });

  // Fetch vendor's submitted responses
  const { data: responses = [] } = useQuery({
    queryKey: ["/api/vendor/rfx-responses"],
    retry: false,
  });

  // Check if vendor has accepted terms for specific RFx
  const checkTermsAcceptance = async (rfxId: string) => {
    try {
      const response = await fetch(`/api/terms/check?entityType=rfx&entityId=${rfxId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const { hasAccepted } = await response.json();
        return hasAccepted;
      }
    } catch (error) {
      console.error("Error checking terms acceptance:", error);
    }
    return false;
  };

  // Submit RFx response
  const submitResponseMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/vendor/rfx-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfxId: selectedInvitation?.rfxId,
          proposedPrice: parseFloat(data.proposedPrice),
          deliveryTime: data.deliveryTime,
          technicalSpecification: data.technicalSpecification,
          additionalNotes: data.additionalNotes || "",
        }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Response Submitted",
        description: "Your RFx response has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/rfx-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/rfx-responses"] });
      setIsResponseDialogOpen(false);
      setResponseData({
        proposedPrice: "",
        deliveryTime: "",
        technicalSpecification: "",
        additionalNotes: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit response",
        variant: "destructive",
      });
    },
  });

  const handleRespondToRfx = async (invitation: RfxInvitation) => {
    setSelectedInvitation(invitation);
    
    // Check if vendor has accepted terms
    if (invitation.rfx.termsAndConditionsPath) {
      const hasAccepted = await checkTermsAcceptance(invitation.rfxId);
      if (!hasAccepted) {
        setIsTermsDialogOpen(true);
        return;
      }
    }
    
    setIsResponseDialogOpen(true);
  };

  const handleTermsAccepted = () => {
    setIsTermsDialogOpen(false);
    setIsResponseDialogOpen(true);
  };

  const handleSubmitResponse = () => {
    if (!responseData.proposedPrice || !responseData.deliveryTime || !responseData.technicalSpecification) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    submitResponseMutation.mutate(responseData);
  };

  const filteredInvitations = invitations.filter((invitation: RfxInvitation) => {
    const matchesSearch = invitation.rfx.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         invitation.rfx.scope.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || invitation.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "responded":
        return <Badge variant="secondary"><CheckCircle className="w-3 h-3 mr-1" />Responded</Badge>;
      case "declined":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Declined</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRfxTypeBadge = (type: string) => {
    const colors = {
      rfi: "bg-blue-100 text-blue-800",
      rfp: "bg-green-100 text-green-800",
      rfq: "bg-purple-100 text-purple-800",
    };
    return <Badge className={colors[type as keyof typeof colors] || ""}>{type.toUpperCase()}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-8">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading your RFx invitations...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-foreground">Vendor Portal</h1>
              <p className="text-muted-foreground">Manage your RFx invitations and responses</p>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search RFx invitations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="responded">Responded</option>
                <option value="declined">Declined</option>
              </select>
            </div>

            {/* RFx Invitations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  RFx Invitations ({filteredInvitations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredInvitations.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No RFx invitations found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>RFx Details</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Budget</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvitations.map((invitation: RfxInvitation) => (
                        <TableRow key={invitation.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{invitation.rfx.title}</div>
                              <div className="text-sm text-muted-foreground line-clamp-2">
                                {invitation.rfx.scope}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getRfxTypeBadge(invitation.rfx.type)}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {new Date(invitation.rfx.dueDate).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            {invitation.rfx.budget ? (
                              <div className="flex items-center">
                                <DollarSign className="w-4 h-4 mr-1" />
                                {invitation.rfx.budget}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Not specified</span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRespondToRfx(invitation)}
                                disabled={invitation.status === "responded" || invitation.rfx.status === "closed"}
                              >
                                <Send className="w-4 h-4 mr-1" />
                                {invitation.status === "responded" ? "Responded" : "Respond"}
                              </Button>
                              {invitation.rfx.termsAndConditionsPath && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(invitation.rfx.termsAndConditionsPath, '_blank')}
                                >
                                  <ExternalLink className="w-4 h-4 mr-1" />
                                  T&C
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Response History */}
            <Card>
              <CardHeader>
                <CardTitle>My Responses ({responses.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {responses.length === 0 ? (
                  <div className="text-center py-8">
                    <Send className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No responses submitted yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>RFx Title</TableHead>
                        <TableHead>Proposed Price</TableHead>
                        <TableHead>Delivery Time</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {responses.map((response: RfxResponse) => (
                        <TableRow key={response.id}>
                          <TableCell className="font-medium">{response.rfxId}</TableCell>
                          <TableCell>₹{response.proposedPrice.toLocaleString()}</TableCell>
                          <TableCell>{response.deliveryTime}</TableCell>
                          <TableCell>{new Date(response.submittedAt).toLocaleDateString()}</TableCell>
                          <TableCell>{getStatusBadge(response.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Terms Acceptance Dialog */}
      {selectedInvitation && (
        <TermsAcceptanceDialog
          open={isTermsDialogOpen}
          onOpenChange={setIsTermsDialogOpen}
          entityType="rfx"
          entityId={selectedInvitation.rfxId}
          entityTitle={selectedInvitation.rfx.title}
          termsAndConditionsPath={selectedInvitation.rfx.termsAndConditionsPath}
          onAccepted={handleTermsAccepted}
        />
      )}

      {/* Response Dialog */}
      <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Send className="w-5 h-5 mr-2" />
              Submit Response: {selectedInvitation?.rfx.title}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(90vh-100px)] space-y-6">
            {selectedInvitation && (
              <>
                {/* RFx Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">RFx Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium">Type</div>
                        <div>{getRfxTypeBadge(selectedInvitation.rfx.type)}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Due Date</div>
                        <div>{new Date(selectedInvitation.rfx.dueDate).toLocaleDateString()}</div>
                      </div>
                      {selectedInvitation.rfx.budget && (
                        <div>
                          <div className="text-sm font-medium">Budget</div>
                          <div>{selectedInvitation.rfx.budget}</div>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-2">Scope</div>
                      <div className="text-sm text-muted-foreground">{selectedInvitation.rfx.scope}</div>
                    </div>
                    {selectedInvitation.rfx.criteria && (
                      <div>
                        <div className="text-sm font-medium mb-2">Requirements</div>
                        <div className="text-sm text-muted-foreground">{selectedInvitation.rfx.criteria}</div>
                      </div>
                    )}
                    {selectedInvitation.rfx.evaluationParameters && (
                      <div>
                        <div className="text-sm font-medium mb-2">Evaluation Criteria</div>
                        <div className="text-sm text-muted-foreground">{selectedInvitation.rfx.evaluationParameters}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Response Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Your Response</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Proposed Price (₹) *</label>
                        <Input
                          type="number"
                          placeholder="Enter your price"
                          value={responseData.proposedPrice}
                          onChange={(e) => setResponseData(prev => ({ ...prev, proposedPrice: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Delivery Time *</label>
                        <Input
                          placeholder="e.g., 2-3 weeks, 30 days"
                          value={responseData.deliveryTime}
                          onChange={(e) => setResponseData(prev => ({ ...prev, deliveryTime: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Technical Specification *</label>
                      <Textarea
                        placeholder="Describe your technical approach, specifications, and capabilities..."
                        rows={4}
                        value={responseData.technicalSpecification}
                        onChange={(e) => setResponseData(prev => ({ ...prev, technicalSpecification: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Additional Notes</label>
                      <Textarea
                        placeholder="Any additional information, terms, or conditions..."
                        rows={3}
                        value={responseData.additionalNotes}
                        onChange={(e) => setResponseData(prev => ({ ...prev, additionalNotes: e.target.value }))}
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end space-x-4 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsResponseDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmitResponse} disabled={submitResponseMutation.isPending}>
                    {submitResponseMutation.isPending ? "Submitting..." : "Submit Response"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}