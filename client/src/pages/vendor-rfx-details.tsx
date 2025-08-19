import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, FileText, Building, Mail } from 'lucide-react';
import { format } from 'date-fns';

export default function VendorRfxDetails() {
  const { id } = useParams();

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

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'published':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'closed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'awarded':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const isExpired = rfx.dueDate ? new Date(rfx.dueDate) < new Date() : false;
  const canRespond = rfx.status === 'published' && !isExpired;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/vendor-portal">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Portal
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{rfx.title}</h1>
            <p className="text-muted-foreground">{rfx.referenceNo}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getRfxTypeColor(rfx.type)}>
            {rfx.type?.toUpperCase() || 'RFX'}
          </Badge>
          <Badge className={getStatusColor(rfx.status)}>
            {rfx.status?.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - RFx Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                RFx Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Scope of Work</h3>
                <p className="text-muted-foreground">{rfx.scope || 'No scope provided'}</p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Evaluation Criteria</h3>
                <p className="text-muted-foreground">{rfx.criteria || 'No criteria provided'}</p>
              </div>

              {rfx.evaluationParameters && (
                <div>
                  <h3 className="font-medium mb-2">Evaluation Parameters</h3>
                  <div className="text-sm text-muted-foreground">
                    {JSON.stringify(rfx.evaluationParameters, null, 2)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* BOM Details */}
          {bom && (
            <Card>
              <CardHeader>
                <CardTitle>Bill of Materials</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium">BOM Name:</span>
                    <span>{bom.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Items Count:</span>
                    <span>{bom.items?.length || 0} items</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Total Quantity:</span>
                    <span>{bom.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Key Information */}
        <div className="space-y-6">
          {/* Key Details */}
          <Card>
            <CardHeader>
              <CardTitle>Key Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Due Date</p>
                  <p className="text-sm text-muted-foreground">
                    {rfx.dueDate ? format(new Date(rfx.dueDate), 'PPp') : 'Not specified'}
                  </p>
                  {isExpired && (
                    <Badge variant="destructive" className="text-xs mt-1">
                      Expired
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Building className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Budget</p>
                  <p className="text-sm text-muted-foreground">
                    {rfx.budget ? `₹${parseFloat(rfx.budget).toLocaleString()}` : 'Not disclosed'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Contact Person</p>
                  <p className="text-sm text-muted-foreground">
                    {rfx.contactPerson || 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(rfx.createdAt), 'PPp')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {canRespond ? (
                <Link href={`/vendor/rfx-response/${rfx.id}`}>
                  <Button className="w-full" size="lg">
                    Submit Response
                  </Button>
                </Link>
              ) : (
                <Button disabled className="w-full" size="lg">
                  {isExpired ? 'RFx Expired' : 'Response Not Available'}
                </Button>
              )}
              
              <Link href="/vendor-portal">
                <Button variant="outline" className="w-full">
                  Back to Portal
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}