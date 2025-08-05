import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Send, FileText, Clock, Package, Upload, X, AlertTriangle, Trash2 } from "lucide-react";
import { TermsAcceptanceDialog } from "./TermsAcceptanceDialog";
import { RfxAttachmentUploader } from "./RfxAttachmentUploader";

const rfxResponseSchema = z.object({
  response: z.string().min(1, "Response is required"),
  quotedPrice: z.string().optional(),
  deliveryTerms: z.string().optional(),
  paymentTerms: z.string().optional(),
  leadTime: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions"
  }),
});

type RfxResponseFormData = z.infer<typeof rfxResponseSchema>;

interface RfxResponseFormProps {
  rfx: any;
  onClose: () => void;
  onSuccess: () => void;
}

interface AttachmentInfo {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  uploadedAt: Date;
}

export function RfxResponseForm({ rfx, onClose, onSuccess }: RfxResponseFormProps) {
  const { toast } = useToast();
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Handle nested RFx data structure properly
  const rfxData = rfx.rfx || rfx;
  const rfxType = (rfxData.type || rfx.rfxType || rfx.type || 'rfx').toUpperCase();
  const termsPath = rfxData.termsAndConditionsPath || rfx.rfxTermsAndConditionsPath || rfx.termsAndConditionsPath;
  const rfxId = rfx.rfxId || rfx.id || rfxData.id;

  const form = useForm<RfxResponseFormData>({
    resolver: zodResolver(rfxResponseSchema),
    defaultValues: {
      response: "",
      quotedPrice: "",
      deliveryTerms: "",
      paymentTerms: "",
      leadTime: "",
      attachments: [],
      termsAccepted: false,
    },
  });

  // Check if terms are already accepted
  const { data: termsStatus } = useQuery({
    queryKey: ['/api/terms/check', rfxId],
    queryFn: async () => {
      const response = await fetch(`/api/terms/check?entityType=rfx&entityId=${rfxId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        return response.json();
      }
      return { accepted: false };
    },
    enabled: !!termsPath && !!rfxId,
  });

  useEffect(() => {
    if (termsStatus?.accepted) {
      setTermsAccepted(true);
      form.setValue('termsAccepted', true);
    }
  }, [termsStatus, form]);

  const handleGetUploadParameters = useCallback(async (fileName: string) => {
    try {
      const response = await fetch('/api/objects/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to get upload parameters');
      }

      const data = await response.json();
      return {
        method: "PUT" as const,
        url: data.uploadURL,
        filePath: data.filePath || `/rfx-responses/${rfxId}/${fileName}`,
      };
    } catch (error) {
      console.error('Error getting upload parameters:', error);
      throw error;
    }
  }, [rfxId]);

  const handleAttachmentsChange = useCallback((newAttachments: AttachmentInfo[]) => {
    setAttachments(newAttachments);
  }, []);

  const removeAttachment = (attachmentId: string) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId));
  };

  const handleTermsAccepted = async () => {
    try {
      const response = await fetch('/api/terms/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'rfx',
          entityId: rfxId,
          termsAndConditionsPath: termsPath,
        }),
        credentials: 'include',
      });

      if (response.ok) {
        setTermsAccepted(true);
        form.setValue('termsAccepted', true);
        setShowTermsDialog(false);
        toast({
          title: "Terms Accepted",
          description: "You can now submit your response",
        });
      } else {
        throw new Error('Failed to accept terms');
      }
    } catch (error) {
      console.error('Terms acceptance error:', error);
      toast({
        title: "Error",
        description: "Failed to accept terms",
        variant: "destructive",
      });
    }
  };

  const submitResponseMutation = useMutation({
    mutationFn: async (data: RfxResponseFormData) => {
      const attachmentPaths = attachments.map(att => att.filePath);
      console.log('Submitting RFx response with data:', { rfxId, ...data, attachments: attachmentPaths });

      const response = await fetch("/api/vendor/rfx-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfxId: rfxId,
          ...data,
          attachments: attachmentPaths,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response submission failed:', response.status, errorText);
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || "Failed to submit response");
        } catch {
          throw new Error(`Failed to submit response: ${response.status}`);
        }
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Your response has been submitted successfully",
      });
      onSuccess();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit response",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RfxResponseFormData) => {
    if (termsPath && !termsAccepted) {
      setShowTermsDialog(true);
      return;
    }
    submitResponseMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* RFx Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Responding to {rfxType}</span>
            <Badge className={
              rfxType === 'RFI' ? 'bg-indigo-100 text-indigo-700' :
              rfxType === 'RFP' ? 'bg-purple-100 text-purple-700' :
              'bg-blue-100 text-blue-700'
            }>
              {rfxType}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Title</div>
              <div className="font-medium">{rfxData.title || rfx.rfxTitle}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Reference</div>
              <div className="font-medium">{rfxData.referenceNo || rfx.rfxReferenceNo}</div>
            </div>
            {(rfxData.dueDate || rfx.rfxDueDate) && (
              <div>
                <div className="text-sm text-muted-foreground">Due Date</div>
                <div className="font-medium flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(rfxData.dueDate || rfx.rfxDueDate).toLocaleDateString()}</span>
                </div>
              </div>
            )}
            {(rfxData.budget || rfx.rfxBudget) && (
              <div>
                <div className="text-sm text-muted-foreground">Budget</div>
                <div className="font-medium">₹{(rfxData.budget || rfx.rfxBudget)?.toLocaleString()}</div>
              </div>
            )}
          </div>
          {(rfxData.scope || rfx.rfxScope) && (
            <div>
              <div className="text-sm text-muted-foreground">Scope</div>
              <div className="text-sm p-2 bg-gray-50 rounded">{rfxData.scope || rfx.rfxScope}</div>
            </div>
          )}
          {(rfxData.criteria || rfx.rfxCriteria) && (
            <div>
              <div className="text-sm text-muted-foreground">
                {rfxType === 'RFI' ? 'Information Required' : 'Requirements'}
              </div>
              <div className="text-sm p-2 bg-gray-50 rounded">{rfxData.criteria || rfx.rfxCriteria}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Terms & Conditions */}
      {termsPath && (
        <Card className={`border-2 ${termsAccepted ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className={`w-5 h-5 mt-0.5 ${termsAccepted ? 'text-green-600' : 'text-orange-600'}`} />
              <div className="flex-1">
                <h3 className="font-medium mb-2">Terms & Conditions</h3>
                {termsAccepted ? (
                  <div className="text-sm text-green-700">
                    ✓ You have accepted the terms and conditions for this {rfxType}.
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-orange-700 mb-3">
                      You must read and accept the terms and conditions before submitting your response.
                    </p>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(termsPath, '_blank')}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View Terms
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setShowTermsDialog(true)}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        Accept Terms
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Response Form */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Response</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="response">
                {rfxType === 'RFI' ? 'Information Response' : 
                 rfxType === 'RFP' ? 'Proposal Response' : 'Quote Response'} *
              </Label>
              <Textarea
                id="response"
                {...form.register("response")}
                rows={6}
                placeholder={
                  rfxType === 'RFI' ? 'Provide the requested information in detail...' :
                  rfxType === 'RFP' ? 'Describe your proposed solution, approach, and capabilities...' :
                  'Provide your detailed quote with specifications and pricing...'
                }
                className="border-2 border-border focus:border-primary"
              />
              {form.formState.errors.response && (
                <p className="text-sm text-destructive">{form.formState.errors.response.message}</p>
              )}
            </div>

            {rfxType !== 'RFI' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quotedPrice">
                      {rfxType === 'RFP' ? 'Proposed Price' : 'Quoted Price'}
                    </Label>
                    <Input
                      id="quotedPrice"
                      {...form.register("quotedPrice")}
                      placeholder="e.g., ₹50,000"
                      className="border-2 border-border focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="leadTime">Delivery/Lead Time</Label>
                    <Input
                      id="leadTime"
                      {...form.register("leadTime")}
                      placeholder="e.g., 2-3 weeks"
                      className="border-2 border-border focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deliveryTerms">Delivery Terms</Label>
                    <Textarea
                      id="deliveryTerms"
                      {...form.register("deliveryTerms")}
                      rows={3}
                      placeholder="Specify delivery terms, conditions, and logistics..."
                      className="border-2 border-border focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentTerms">Payment Terms</Label>
                    <Textarea
                      id="paymentTerms"
                      {...form.register("paymentTerms")}
                      rows={3}
                      placeholder="Specify payment terms, conditions, and schedule..."
                      className="border-2 border-border focus:border-primary"
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Attachments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="w-5 h-5" />
              <span>Supporting Documents</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Upload Attachments (Optional)</Label>
              <p className="text-sm text-muted-foreground">
                Upload relevant documents to support your {rfxType.toLowerCase()} response. 
                Maximum 10 files, 25MB each.
              </p>
              
              <RfxAttachmentUploader
                maxNumberOfFiles={10}
                maxFileSize={26214400} // 25MB
                attachments={attachments}
                onAttachmentsChange={handleAttachmentsChange}
                onGetUploadParameters={handleGetUploadParameters}
                rfxId={rfxId}
                buttonClassName="w-full"
              >
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 font-medium">
                    Click to upload files or drag and drop
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PDF, DOC, XLS, Images, ZIP (Max 25MB each)
                  </p>
                </div>
              </RfxAttachmentUploader>
            </div>

            {attachments.length > 0 && (
              <div className="space-y-2">
                <Label>Uploaded Files ({attachments.length}/10)</Label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {attachment.fileName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(attachment.fileSize / 1024 / 1024).toFixed(2)} MB • {attachment.fileType}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(attachment.id)}
                        className="flex-shrink-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={submitResponseMutation.isPending || (termsPath && !termsAccepted)}
            className="bg-primary hover:bg-primary/90"
          >
            {submitResponseMutation.isPending ? (
              "Submitting..."
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit {rfxType} Response
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Terms Acceptance Dialog */}
      {showTermsDialog && termsPath && (
        <TermsAcceptanceDialog
          open={showTermsDialog}
          onOpenChange={setShowTermsDialog}
          termsAndConditionsPath={termsPath}
          rfxTitle={rfxData.title || rfx.rfxTitle}
          rfxType={rfxType}
          onAccept={handleTermsAccepted}
          onDecline={() => {
            setShowTermsDialog(false);
            toast({
              title: "Terms Required",
              description: "You must accept the terms & conditions to submit your response.",
              variant: "destructive",
            });
          }}
        />
      )}
    </div>
  );
}