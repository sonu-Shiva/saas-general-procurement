import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calendar, DollarSign, FileText, Clock, AlertCircle, Check } from "lucide-react";

const rfxResponseSchema = z.object({
  quotedPrice: z.string().min(1, "Quoted price is required"),
  deliveryTerms: z.string().min(1, "Delivery terms are required"),
  paymentTerms: z.string().min(1, "Payment terms are required"),
  leadTime: z.string().min(1, "Lead time is required"),
  response: z.string().min(10, "Response must be at least 10 characters"),
  attachments: z.array(z.string()).optional(),
});

type RfxResponseFormData = z.infer<typeof rfxResponseSchema>;

interface RfxResponseFormProps {
  rfx: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function RfxResponseForm({ rfx, onClose, onSuccess }: RfxResponseFormProps) {
  console.log('DEBUG rfx-response-form.tsx: RECEIVED rfx prop:', rfx);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { toast } = useToast();

  const form = useForm<RfxResponseFormData>({
    resolver: zodResolver(rfxResponseSchema),
    defaultValues: {
      quotedPrice: "",
      deliveryTerms: "",
      paymentTerms: "",
      leadTime: "",
      response: "",
      attachments: [],
    },
  });

  const handleSubmit = async (data: RfxResponseFormData) => {
    if (rfx.rfx?.termsAndConditionsRequired && !termsAccepted) {
      toast({
        title: "Terms & Conditions Required",
        description: "Please accept the terms and conditions before submitting your response.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Submit the RFx response using the vendor endpoint
      console.log('DEBUG rfx-response-form.tsx: rfx object:', rfx);
      console.log('DEBUG rfx-response-form.tsx: rfx.id:', rfx.id);
      console.log('DEBUG rfx-response-form.tsx: rfx.rfxId:', rfx.rfxId);
      console.log('DEBUG rfx-response-form.tsx: Using ID:', rfx.rfxId || rfx.id);
      const payload = {
        rfxId: rfx.rfxId || rfx.id,
        quotedPrice: parseFloat(data.quotedPrice),
        leadTime: parseInt(data.leadTime),
        response: data.response,
        deliveryTerms: data.deliveryTerms,
        paymentTerms: data.paymentTerms,
        attachments: data.attachments || [],
      };
      console.log('DEBUG rfx-response-form.tsx: Full payload:', payload);
      
      await apiRequest('/api/vendor/rfx-responses', {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast({
        title: "Response Submitted",
        description: "Your RFx response has been submitted successfully.",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error submitting RFx response:", error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit your response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const rfxData = rfx.rfx || rfx;
  const dueDate = rfxData.dueDate ? new Date(rfxData.dueDate) : null;
  const isOverdue = dueDate && dueDate < new Date();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* RFx Information Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl">{rfxData.title}</CardTitle>
              <CardDescription className="mt-2">{rfxData.scope}</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Badge variant="secondary">{rfxData.type.toUpperCase()}</Badge>
              {isOverdue && (
                <Badge variant="destructive">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Overdue
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>Due: {dueDate ? dueDate.toLocaleDateString() : 'Not specified'}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <span className="w-4 h-4 text-muted-foreground">₹</span>
              <span>Budget: {rfxData.budget ? `₹${rfxData.budget}` : 'Not specified'}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span>Reference: {rfxData.referenceNo || 'N/A'}</span>
            </div>
          </div>
          
          {rfxData.criteria && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Evaluation Criteria</h4>
              <p className="text-sm text-muted-foreground">{rfxData.criteria}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Terms & Conditions */}
      {rfxData.termsAndConditionsRequired && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Terms & Conditions</CardTitle>
            <CardDescription>
              Please review and accept the terms and conditions before submitting your response.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rfxData.termsAndConditionsPath && (
                <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  window.open(`/api/terms/download/${rfxData.termsAndConditionsPath}`, '_blank');
                }}
              >
                <FileText className="w-4 h-4 mr-2" />
                Download Terms & Conditions (PDF)
              </Button>
              )}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="terms-acceptance"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="terms-acceptance" className="text-sm">
                  I have read and accept the terms and conditions
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Response Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Submit Your Response</CardTitle>
          <CardDescription>
            Provide your quotation and response details for this RFx.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quotedPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quoted Price (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Enter your quoted price"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="leadTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Time (Days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter lead time in days"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="deliveryTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Terms</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Specify your delivery terms and conditions"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Terms</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Specify your payment terms and conditions"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="response"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detailed Response</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide your detailed response to this RFx, including any additional information, capabilities, or value propositions"
                        rows={6}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <div className="flex justify-between items-center pt-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <div className="flex space-x-3">
                  <Button type="button" variant="secondary">
                    Save Draft
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || (rfxData.termsAndConditionsRequired && !termsAccepted)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isSubmitting ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Submit Response
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}