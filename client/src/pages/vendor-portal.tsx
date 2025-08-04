import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { FileText, Clock, DollarSign, Truck, AlertCircle, CheckCircle, Calendar, Download } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TermsAcceptanceDialog } from "@/components/TermsAcceptanceDialog";

const rfxResponseSchema = z.object({
  proposedPrice: z.number().min(0.01, "Price must be greater than 0"),
  deliveryTime: z.string().min(1, "Delivery time is required"),
  technicalSpecification: z.string().min(10, "Technical specification must be at least 10 characters"),
  additionalNotes: z.string().optional(),
});

type RfxResponseFormData = z.infer<typeof rfxResponseSchema>;

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
    dueDate: string;
    status: string;
    budget?: string;
    contactPerson?: string;
    termsAndConditionsPath?: string;
    criteria?: string;
    evaluationParameters?: string;
    attachments?: string;
  };
}

interface RfxResponse {
  id: string;
  rfxId: string;
  vendorId: string;
  proposedPrice: string;
  deliveryTime: string;
  technicalSpecification: string;
  additionalNotes: string;
  status: string;
  submittedAt: string;
}

function getStatusColor(status: string) {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    case 'responded': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'expired': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    case 'submitted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'accepted': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
}

function getRfxTypeColor(type: string) {
  switch (type.toLowerCase()) {
    case 'rfq': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'rfp': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
    case 'rfi': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
}

function RfxResponseDialog({ invitation, isOpen, onClose }: { invitation: RfxInvitation; isOpen?: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const form = useForm<RfxResponseFormData>({
    resolver: zodResolver(rfxResponseSchema),
    defaultValues: {
      proposedPrice: 0,
      deliveryTime: "",
      technicalSpecification: "",
      additionalNotes: "",
    },
  });

  // Check if terms are already accepted
  const { data: termsStatus } = useQuery({
    queryKey: ['/api/terms/check', invitation.rfxId],
    queryFn: () => apiRequest(`/api/terms/check?entityType=rfx&entityId=${invitation.rfxId}`),
    enabled: !!invitation.rfx.termsAndConditionsPath,
  });

  const submitResponseMutation = useMutation({
    mutationFn: async (data: RfxResponseFormData & { isDraft?: boolean }) => {
      console.log('DEBUG: invitation object:', invitation);
      console.log('DEBUG: rfxId being sent:', invitation.rfxId);
      console.log('DEBUG: full payload:', { rfxId: invitation.rfxId, ...data });
      
      return apiRequest('/api/vendor/rfx-responses', {
        method: 'POST',
        body: JSON.stringify({
          rfxId: invitation.rfxId,
          ...data,
        }),
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: variables.isDraft ? "Draft Saved" : "Response Submitted",
        description: variables.isDraft 
          ? "Your draft has been saved successfully." 
          : "Your RFx response has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/rfx-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/rfx-responses'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit response. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: RfxResponseFormData) => {
    if (invitation.rfx.termsAndConditionsPath && !termsAccepted && !termsStatus?.hasAccepted) {
      setShowTermsDialog(true);
      return;
    }
    submitResponseMutation.mutate({ ...data, isDraft: false });
  };

  const handleSaveDraft = () => {
    const data = form.getValues();
    submitResponseMutation.mutate({ ...data, isDraft: true });
  };

  const handleTermsAccepted = async () => {
    try {
      // Record T&C acceptance
      await apiRequest('/api/terms/accept', {
        method: 'POST',
        body: JSON.stringify({
          entityType: 'rfx',
          entityId: invitation.rfxId,
          termsAndConditionsPath: invitation.rfx.termsAndConditionsPath,
        }),
      });
      
      setTermsAccepted(true);
      setShowTermsDialog(false);
      
      // Submit the form after terms acceptance
      submitResponseMutation.mutate(form.getValues());
    } catch (error) {
      toast({
        title: "Terms Acceptance Failed",
        description: "Failed to record terms acceptance. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isExpired = new Date(invitation.rfx.dueDate) < new Date();
  const canRespond = ['invited', 'pending'].includes(invitation.status) && !isExpired && invitation.rfx.status === 'active';

  return (
    <>
      <Dialog open onOpenChange={() => onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Respond to {invitation.rfx.title}
            </DialogTitle>
            <DialogDescription>
              Submit your response to this {invitation.rfx.type} request
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* RFx Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Request Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Type</p>
                    <Badge className={getRfxTypeColor(invitation.rfx.type)}>
                      {invitation.rfx.type.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge variant="outline" className="text-green-700 border-green-700">
                      {invitation.rfx.status?.toUpperCase() || 'ACTIVE'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Reference No</p>
                    <p className="text-sm">{invitation.rfx.referenceNo || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                    <p className={`text-sm ${isExpired ? 'text-red-600 font-medium' : ''}`}>
                      {format(new Date(invitation.rfx.dueDate), 'PPp')}
                    </p>
                  </div>
                  {invitation.rfx.budget && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Budget</p>
                      <p className="text-sm font-medium text-green-600">₹{invitation.rfx.budget}</p>
                    </div>
                  )}
                  {invitation.rfx.contactPerson && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Contact Person</p>
                      <p className="text-sm">{invitation.rfx.contactPerson}</p>
                    </div>
                  )}
                </div>

                {invitation.rfx.scope && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Scope of Work</p>
                    <p className="text-sm bg-muted p-3 rounded-md">{invitation.rfx.scope}</p>
                  </div>
                )}

                {invitation.rfx.criteria && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Evaluation Criteria</p>
                    <p className="text-sm bg-muted p-3 rounded-md">{invitation.rfx.criteria}</p>
                  </div>
                )}

                {invitation.rfx.evaluationParameters && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Evaluation Parameters</p>
                    <div className="text-sm bg-muted p-3 rounded-md">
                      <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(invitation.rfx.evaluationParameters, null, 2)}</pre>
                    </div>
                  </div>
                )}

                {invitation.rfx.termsAndConditionsPath && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Terms & Conditions</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.open(invitation.rfx.termsAndConditionsPath, '_blank')}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Download Terms & Conditions
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Response Form */}
            {canRespond ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Submit Your Response</CardTitle>
                  <CardDescription>
                    Provide your proposal for this {invitation.rfx.type} request
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="proposedPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Proposed Price ($) <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  data-testid="input-proposed-price"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="deliveryTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Delivery Time <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g., 2-3 weeks, 30 days" 
                                  {...field} 
                                  data-testid="input-delivery-time"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="technicalSpecification"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Technical Specification <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe your technical approach, specifications, and methodology..."
                                className="min-h-[120px]"
                                {...field}
                                data-testid="textarea-technical-spec"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="additionalNotes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Additional Notes (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Any additional information, terms, or clarifications..."
                                className="min-h-[80px]"
                                {...field}
                                data-testid="textarea-additional-notes"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end gap-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={onClose}
                          data-testid="button-cancel-response"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleSaveDraft}
                          disabled={submitResponseMutation.isPending}
                          data-testid="button-save-draft"
                        >
                          {submitResponseMutation.isPending ? "Saving..." : "Save as Draft"}
                        </Button>
                        <Button
                          type="submit"
                          disabled={submitResponseMutation.isPending}
                          data-testid="button-submit-response"
                        >
                          {submitResponseMutation.isPending ? "Submitting..." : "Submit Response"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Cannot Respond</h3>
                    <p className="text-muted-foreground">
                      {invitation.status === 'responded' 
                        ? "You have already responded to this RFx."
                        : isExpired 
                        ? "This RFx has expired and is no longer accepting responses."
                        : "This RFx is not accepting responses at this time."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {showTermsDialog && invitation.rfx.termsAndConditionsPath && (
        <TermsAcceptanceDialog
          open={showTermsDialog}
          onOpenChange={setShowTermsDialog}
          termsAndConditionsPath={invitation.rfx.termsAndConditionsPath}
          rfxTitle={invitation.rfx.title}
          rfxType={invitation.rfx.type}
          onAccept={handleTermsAccepted}
          onDecline={() => {
            setShowTermsDialog(false);
            toast({
              title: "Terms Required",
              description: "You must accept the terms & conditions to participate in this RFx.",
              variant: "destructive",
            });
          }}
        />
      )}
    </>
  );
}

export default function VendorPortal() {
  const [selectedInvitation, setSelectedInvitation] = useState<RfxInvitation | null>(null);

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

  const pendingInvitations = invitations.filter((inv: RfxInvitation) => 
    ['invited', 'pending'].includes(inv.status) && inv.rfx.status === 'active'
  );
  const respondedInvitations = invitations.filter((inv: RfxInvitation) => inv.status === 'responded');
  
  console.log('DEBUG: All invitations:', invitations);
  console.log('DEBUG: Pending invitations:', pendingInvitations);
  console.log('DEBUG: Responded invitations:', respondedInvitations);

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Vendor Portal</h1>
        <p className="text-muted-foreground">
          Manage your RFx invitations and responses
        </p>
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
          {invitationsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
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
          ) : pendingInvitations.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Pending Invitations</h3>
                  <p className="text-muted-foreground">
                    You don't have any pending RFx invitations at the moment.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingInvitations.map((invitation: RfxInvitation) => {
                const isExpired = new Date(invitation.rfx.dueDate) < new Date();
                return (
                  <Card key={invitation.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{invitation.rfx.title}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge className={getRfxTypeColor(invitation.rfx.type)}>
                              {invitation.rfx.type}
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
                          <span className={isExpired ? 'text-red-600' : 'text-muted-foreground'}>
                            Due: {format(new Date(invitation.rfx.dueDate), 'PPp')}
                          </span>
                        </div>
                        {invitation.rfx.budget && (
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Budget: ₹{invitation.rfx.budget}</span>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {invitation.rfx.scope}
                      </p>

                      <Button 
                        className="w-full" 
                        onClick={() => setSelectedInvitation(invitation)}
                        disabled={isExpired || invitation.status === 'responded'}
                      >
                        {isExpired ? 'Expired' : invitation.status === 'responded' ? 'Already Responded' : 'Respond'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="responded" className="space-y-4">
          {respondedInvitations?.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Responded Invitations</h3>
                  <p className="text-muted-foreground">
                    You haven't responded to any RFx invitations yet.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {respondedInvitations?.map((invitation: RfxInvitation) => (
                <Card key={invitation.id} className="border border-green-200 bg-green-50">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-green-800">{invitation.rfx.title}</h3>
                        <p className="text-sm text-muted-foreground">{invitation.rfx.referenceNo}</p>
                      </div>
                      <div className="flex space-x-2">
                        <Badge variant="outline" className="text-green-700 border-green-300">
                          {invitation.rfx.type.toUpperCase()}
                        </Badge>
                        <Badge variant="default" className="bg-green-600">
                          Responded
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{invitation.rfx.scope}</p>
                    <div className="text-xs text-green-600">
                      Responded on: {invitation.respondedAt ? format(new Date(invitation.respondedAt), 'PPp') : 'N/A'}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="responses" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Responses Submitted</h3>
                <p className="text-muted-foreground">
                  You haven't submitted any RFx responses yet.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedInvitation && (
        <RfxResponseDialog
          invitation={selectedInvitation}
          onClose={() => setSelectedInvitation(null)}
        />
      )}
    </div>
  );
}
                      <Calendar className="h-4 w-4" />
