import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, CheckCircle, Clock } from 'lucide-react';
import { RfxResponseForm } from '@/components/rfx-response-form';

export default function VendorRfxResponse() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  // Fetch RFx details - using the same pattern as vendor-portal
  const { data: rfx, isLoading: rfxLoading, error: rfxError } = useQuery({
    queryKey: [`/api/rfx/${id}`],
  });

  // Check if response already exists
  const { data: existingResponses = [] } = useQuery({
    queryKey: ["/api/vendor/rfx-responses"],
  });

  console.log('VendorRfxResponse - RFx data:', rfx);
  console.log('VendorRfxResponse - Loading:', rfxLoading);
  console.log('VendorRfxResponse - Error:', rfxError);

  if (rfxLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/2"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-48 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!rfx) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">RFx Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The RFx you're looking for doesn't exist or you don't have access to it.
            </p>
            <Link href="/vendor-portal">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Portal
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if already responded
  const hasResponded = existingResponses.some((response: any) => 
    response.rfxId === id || response.rfx?.id === id
  );

  // Check if expired
  const isExpired = rfx.dueDate ? new Date(rfx.dueDate) < new Date() : false;

  const handleSuccess = () => {
    setLocation('/vendor-portal');
  };

  const handleClose = () => {
    setLocation('/vendor-portal');
  };

  if (hasResponded) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Link href="/vendor-portal">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Portal
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Response Already Submitted</h3>
            <p className="text-muted-foreground mb-4">
              You have already submitted a response to this {(rfx.type || 'RFx').toUpperCase()}.
            </p>
            <div className="space-x-2">
              <Link href={`/vendor/rfx-details/${id}`}>
                <Button variant="outline">View RFx Details</Button>
              </Link>
              <Link href="/vendor-portal">
                <Button>Back to Portal</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Link href="/vendor-portal">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Portal
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="py-8 text-center">
            <Clock className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">RFx Expired</h3>
            <p className="text-muted-foreground mb-4">
              The deadline for responding to this {(rfx.type || 'RFx').toUpperCase()} has passed.
            </p>
            <div className="space-x-2">
              <Link href={`/vendor/rfx-details/${id}`}>
                <Button variant="outline">View RFx Details</Button>
              </Link>
              <Link href="/vendor-portal">
                <Button>Back to Portal</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Link href="/vendor-portal">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Portal
          </Button>
        </Link>
      </div>

      <div className="max-w-4xl mx-auto">
        <RfxResponseForm 
          rfx={rfx}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
}