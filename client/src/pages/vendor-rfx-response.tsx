import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, Link, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Calendar, Clock, FileText, Send, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { queryClient } from '@/lib/queryClient';

export default function VendorRfxResponse() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Form state
  const [pricing, setPricing] = useState('');
  const [deliverySchedule, setDeliverySchedule] = useState('');
  const [technicalSpecs, setTechnicalSpecs] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Fetch RFx details
  const { data: rfx, isLoading } = useQuery({
    queryKey: ["/api/rfx", id],
    queryFn: async () => {
      const response = await fetch(`/api/rfx/${id}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch RFx details');
      return response.json();
    }
  });

  // Check if response already exists
  const { data: existingResponse } = useQuery({
    queryKey: ["/api/vendor/rfx-responses", id],
    queryFn: async () => {
      const response = await fetch('/api/vendor/rfx-responses', {
        credentials: 'include'
      });
      if (!response.ok) return null;
      const responses = await response.json();
      return responses.find((r: any) => r.rfxId === id);
    }
  });

  // Fetch BOM details if available
  const { data: bom } = useQuery({
    queryKey: ["/api/boms", rfx?.bomId],
    queryFn: async () => {
      if (!rfx?.bomId) return null;
      const response = await fetch(`/api/boms/${rfx.bomId}`, {
        credentials: 'include'
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!rfx?.bomId
  });

  // Submit response mutation
  const submitResponseMutation = useMutation({
    mutationFn: async (responseData: any) => {
      const response = await fetch('/api/vendor/rfx-responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(responseData)
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to submit response');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Response Submitted",
        description: "Your RFx response has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/rfx-responses"] });
      setLocation('/vendor-portal');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit response",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pricing.trim()) {
      toast({
        title: "Error",
        description: "Please provide pricing information",
        variant: "destructive",
      });
      return;
    }

    if (!deliverySchedule.trim()) {
      toast({
        title: "Error",
        description: "Please provide delivery schedule",
        variant: "destructive",
      });
      return;
    }

    submitResponseMutation.mutate({
      rfxId: id,
      pricing: parseFloat(pricing) || 0,
      deliverySchedule,
      technicalSpecs,
      additionalNotes,
      status: 'submitted'
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!rfx) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">RFx Not Found</h1>
          <p className="text-muted-foreground mt-2">The requested RFx could not be found.</p>
          <Link href="/vendor-portal">
            <Button className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Portal
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = rfx.dueDate ? new Date(rfx.dueDate) < new Date() : false;
  const canRespond = rfx.status === 'published' && !isExpired && !existingResponse;

  if (existingResponse) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
          <h1 className="text-2xl font-bold text-green-600">Response Already Submitted</h1>
          <p className="text-muted-foreground">
            You have already submitted a response for this RFx on{' '}
            {format(new Date(existingResponse.submittedAt), 'PPp')}
          </p>
          <Link href="/vendor-portal">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Portal
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!canRespond) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">
            {isExpired ? 'RFx Expired' : 'Response Not Available'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isExpired 
              ? 'The deadline for this RFx has passed.'
              : 'This RFx is not available for responses at this time.'
            }
          </p>
          <Link href="/vendor-portal">
            <Button className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Portal
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/vendor/rfx-details/${id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Details
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Submit Response</h1>
            <p className="text-muted-foreground">{rfx.title}</p>
          </div>
        </div>
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          {rfx.type?.toUpperCase() || 'RFX'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Response Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Your Response
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="pricing">Pricing (₹) *</Label>
                  <Input
                    id="pricing"
                    type="number"
                    step="0.01"
                    placeholder="Enter your quoted price"
                    value={pricing}
                    onChange={(e) => setPricing(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Provide your competitive pricing for the requirements
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deliverySchedule">Delivery Schedule *</Label>
                  <Input
                    id="deliverySchedule"
                    placeholder="e.g., 30 days from PO date"
                    value={deliverySchedule}
                    onChange={(e) => setDeliverySchedule(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Specify your delivery timeline
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="technicalSpecs">Technical Specifications</Label>
                  <Textarea
                    id="technicalSpecs"
                    placeholder="Provide technical details, certifications, compliance information..."
                    value={technicalSpecs}
                    onChange={(e) => setTechnicalSpecs(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additionalNotes">Additional Notes</Label>
                  <Textarea
                    id="additionalNotes"
                    placeholder="Any additional information, terms, or conditions..."
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="submit" 
                    disabled={submitResponseMutation.isPending}
                    className="flex-1"
                  >
                    {submitResponseMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit Response
                      </>
                    )}
                  </Button>
                  <Link href={`/vendor/rfx-details/${id}`}>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - RFx Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>RFx Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Reference No.</p>
                <p className="font-medium">{rfx.referenceNo}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <p className="font-medium">
                    {rfx.dueDate ? format(new Date(rfx.dueDate), 'PPp') : 'Not specified'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Budget</p>
                <p className="font-medium">
                  {rfx.budget ? `₹${parseFloat(rfx.budget).toLocaleString()}` : 'Not disclosed'}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Contact</p>
                <p className="font-medium">{rfx.contactPerson || 'Not specified'}</p>
              </div>
            </CardContent>
          </Card>

          {bom && (
            <Card>
              <CardHeader>
                <CardTitle>BOM Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">BOM Name</p>
                  <p className="font-medium">{bom.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Items Count</p>
                  <p className="font-medium">{bom.items?.length || 0} items</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Quantity</p>
                  <p className="font-medium">
                    {bom.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}