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
import { Send, FileText, Clock, Package, Upload, X, AlertTriangle, Trash2, Download } from "lucide-react";
// Removed TermsAcceptanceDialog - using simple checkbox approach like auctions
import { RfxAttachmentUploader } from "./RfxAttachmentUploader";

const createRfxResponseSchema = (budgetAmount?: number) => z.object({
  response: z.string().min(1, "Response is required"),
  quotedPrice: z.string().min(1, "Quoted price is required").refine((val) => {
    const price = parseFloat(val);
    if (isNaN(price)) return false;
    if (price <= 0) return false;
    if (budgetAmount && budgetAmount > 0 && price >= budgetAmount) return false;
    return true;
  }, {
    message: budgetAmount && budgetAmount > 0
      ? `Quoted price must be less than budget (₹${budgetAmount.toLocaleString()})`
      : "Quoted price must be a valid positive number"
  }),
  deliveryTerms: z.string().optional(),
  paymentTerms: z.string().optional(),
  leadTime: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions to submit your response"
  }),
});

type RfxResponseFormData = z.infer<ReturnType<typeof createRfxResponseSchema>>;

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
  // Remove terms dialog - use simple checkbox approach like auctions
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Handle nested RFx data structure properly - vendor invitations come with rfx nested
  const rfxData = rfx.rfx || rfx;
  const rfxType = (rfxData.type || rfx.rfxType || rfx.type || 'rfx').toUpperCase();
  const termsPath = rfxData.termsAndConditionsPath || rfx.rfxTermsAndConditionsPath || rfx.termsAndConditionsPath || '/dummy-terms.pdf'; // Always show terms section
  const rfxId = rfx.rfxId || rfx.id || rfxData.id;
  const budgetAmount = parseFloat(rfxData.budget || rfx.budget || rfxData.budgetAmount || rfx.budgetAmount || 0);

  console.log('RfxResponseForm - Debug data:', {
    rfx,
    rfxData,
    rfxId,
    rfxType,
    termsPath,
    budgetAmount
  });

  const rfxResponseSchema = createRfxResponseSchema(budgetAmount);
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
        body: JSON.stringify({ 
          fileName, 
          entityType: 'rfx-response',
          entityId: rfxId 
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to get upload parameters');
      }

      const data = await response.json();
      console.log('Upload parameters received:', data);
      return {
        method: "PUT" as const,
        url: data.uploadURL,
        filePath: data.filePath,
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

  // Simple terms handling - no dialog needed (like auctions)
  const handleTermsAccepted = () => {
    setTermsAccepted(true);
    form.setValue('termsAccepted', true);
    toast({
      title: "Terms Accepted",
      description: "You can now submit your response",
    });
  };

  const submitResponseMutation = useMutation({
    mutationFn: async (data: RfxResponseFormData) => {
      const attachmentPaths = attachments.map(att => att.filePath);
      
      const submissionData = {
        rfxId: rfxId,
        response: data.response,
        quotedPrice: data.quotedPrice || null,
        deliveryTerms: data.deliveryTerms || null,
        paymentTerms: data.paymentTerms || null,
        leadTime: data.leadTime || null,
        attachments: attachmentPaths,
      };
      
      console.log('Submitting RFx response with data:', submissionData);

      const response = await fetch("/api/vendor/rfx-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
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
    console.log('Form submission attempted:', data);
    console.log('Terms accepted:', termsAccepted);
    console.log('Form errors:', form.formState.errors);
    
    // Check terms acceptance
    if (!termsAccepted) {
      toast({
        title: "Terms Required",
        description: "You must accept the terms and conditions before submitting.",
        variant: "destructive",
      });
      return;
    }
    
    // Check price validation
    if (data.quotedPrice && budgetAmount > 0) {
      const price = parseFloat(data.quotedPrice);
      if (price >= budgetAmount) {
        toast({
          title: "Invalid Price",
          description: `Quoted price (₹${price.toLocaleString()}) must be less than budget (₹${budgetAmount.toLocaleString()})`,
          variant: "destructive",
        });
        return;
      }
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
            {budgetAmount > 0 && (
              <div>
                <div className="text-sm text-muted-foreground">Budget</div>
                <div className="font-medium">₹{budgetAmount.toLocaleString()}</div>
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

      {/* Terms & Conditions - Always required */}
      <Card className={`border-2 ${termsAccepted ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className={`w-5 h-5 mt-0.5 ${termsAccepted ? 'text-green-600' : 'text-red-600'}`} />
            <div className="flex-1">
              <h3 className="font-medium mb-2">Terms & Conditions *</h3>
              {termsAccepted ? (
                <div className="text-sm text-green-700">
                  ✓ You have accepted the terms and conditions for this {rfxType}.
                </div>
              ) : (
                <>
                  <p className="text-sm text-red-700 mb-3">
                    <strong>MANDATORY:</strong> You must accept the terms and conditions before submitting your response.
                  </p>
                  <div className="flex items-center space-x-3 mb-3">
                    <Checkbox
                      id="terms-checkbox"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => {
                        setTermsAccepted(checked === true);
                        form.setValue('termsAccepted', checked === true);
                      }}
                      data-testid="checkbox-terms"
                    />
                    <Label htmlFor="terms-checkbox" className="text-sm">
                      I accept the terms and conditions for this {rfxType}
                    </Label>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (termsPath && termsPath !== '/dummy-terms.pdf') {
                          window.open(termsPath, '_blank');
                        } else {
                          // Show terms content in new tab
                          const termsContent = `
                            <html>
                              <head><title>Terms and Conditions - ${rfxType}</title></head>
                              <body style="font-family: Arial, sans-serif; padding: 20px;">
                                <h1>Terms and Conditions</h1>
                                <h2>${rfxType} - ${rfxData.title}</h2>
                                <h3>Reference: ${rfxData.referenceNo}</h3>
                                <p>Standard terms and conditions apply for this ${rfxType}.</p>
                                <p>By accepting these terms, you agree to participate in this procurement process.</p>
                              </body>
                            </html>
                          `;
                          const newTab = window.open();
                          if (newTab) {
                            newTab.document.write(termsContent);
                            newTab.document.close();
                          }
                        }
                      }}
                      data-testid="button-view-terms"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      View Terms
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          // Use the download API endpoint
                          const downloadUrl = '/api/terms/download/dummy-terms.pdf';
                          const response = await fetch(downloadUrl);
                          
                          if (response.ok) {
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `terms-and-conditions-${rfxType}-${rfxData.referenceNo}.pdf`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(url);
                            toast({
                              title: "Download Started",
                              description: "Terms and conditions document is being downloaded.",
                            });
                          } else {
                            throw new Error(`Download failed with status: ${response.status}`);
                          }
                        } catch (error) {
                          console.error('Download error:', error);
                          toast({
                            title: "Download Failed", 
                            description: "Unable to download terms document. Please try again.",
                            variant: "destructive",
                          });
                        }
                      }}
                      data-testid="button-download-terms"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Terms
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keep original terms section for backward compatibility */}
      {false && termsPath && (
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
          <CardContent className="space-y-6">
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
                data-testid="textarea-response"
              />
              {form.formState.errors.response && (
                <p className="text-sm text-destructive">{form.formState.errors.response.message}</p>
              )}
            </div>

            {rfxType !== 'RFI' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="quotedPrice" className="text-sm font-medium">
                      {rfxType === 'RFP' ? 'Proposed Price' : 'Quoted Price'}
                      {budgetAmount && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (Budget: ₹{budgetAmount.toLocaleString()})
                        </span>
                      )}
                    </Label>
                    <Input
                      id="quotedPrice"
                      {...form.register("quotedPrice")}
                      placeholder="e.g., ₹50,000"
                      className="border-2 border-border focus:border-primary"
                      data-testid="input-quoted-price"
                    />
                    {form.formState.errors.quotedPrice && (
                      <p className="text-sm text-destructive">{form.formState.errors.quotedPrice.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="leadTime" className="text-sm font-medium">Delivery/Lead Time</Label>
                    <Input
                      id="leadTime"
                      {...form.register("leadTime")}
                      placeholder="e.g., 2-3 weeks"
                      className="border-2 border-border focus:border-primary"
                      data-testid="input-lead-time"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="deliveryTerms" className="text-sm font-medium">Delivery Terms</Label>
                    <Textarea
                      id="deliveryTerms"
                      {...form.register("deliveryTerms")}
                      rows={3}
                      placeholder="Specify delivery terms, conditions, and logistics..."
                      className="border-2 border-border focus:border-primary"
                      data-testid="textarea-delivery-terms"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentTerms" className="text-sm font-medium">Payment Terms</Label>
                    <Textarea
                      id="paymentTerms"
                      {...form.register("paymentTerms")}
                      rows={3}
                      placeholder="Specify payment terms, conditions, and schedule..."
                      className="border-2 border-border focus:border-primary"
                      data-testid="textarea-payment-terms"
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

        {/* Terms Acceptance Reminder and Form Actions */}
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            {!termsAccepted && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2 text-red-800">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Terms & Conditions Required</span>
                </div>
                <p className="text-sm text-red-700 mt-2">
                  You must accept the terms and conditions above before submitting your response.
                </p>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submitResponseMutation.isPending || !termsAccepted || !form.formState.isValid}
                className="bg-primary hover:bg-primary/90 min-w-[180px]"
                data-testid="button-submit"
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
          </CardContent>
        </Card>
      </form>
    </div>
  );
}