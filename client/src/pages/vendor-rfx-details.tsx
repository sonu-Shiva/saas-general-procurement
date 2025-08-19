import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, FileText, Building, Mail, IndianRupee } from 'lucide-react';
import { format } from 'date-fns';

function getRfxTypeColor(type: string) {
  switch (type?.toLowerCase()) {
    case 'rfi':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
    case 'rfp':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'rfq':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
}

export default function VendorRfxDetails() {
  const { id } = useParams();

  // Fetch RFx details - using the same pattern as vendor-portal
  const { data: rfx, isLoading, error } = useQuery({
    queryKey: [`/api/rfx/${id}`],
  });

  console.log('VendorRfxDetails - RFx data:', rfx);
  console.log('VendorRfxDetails - Loading:', isLoading);
  console.log('VendorRfxDetails - Error:', error);

  // Fetch BOM details if available
  const { data: bom } = useQuery({
    queryKey: [`/api/boms/${rfx?.bomId}`],
    enabled: !!rfx?.bomId
  });

  if (isLoading) {
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

  const rfxType = (rfx.type || 'RFx').toUpperCase();
  const isExpired = rfx.dueDate ? new Date(rfx.dueDate) < new Date() : false;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/vendor-portal">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Portal
          </Button>
        </Link>
        
        {!isExpired && (
          <Link href={`/vendor/rfx-response/${id}`}>
            <Button data-testid="button-respond-rfx">
              Respond to {rfxType}
            </Button>
          </Link>
        )}
      </div>

      {/* RFx Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{rfx.title}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge className={getRfxTypeColor(rfx.type)}>
                  {rfxType}
                </Badge>
                {isExpired && (
                  <Badge variant="destructive">Expired</Badge>
                )}
              </div>
            </div>
            <div className="text-sm text-muted-foreground text-right">
              <div>Ref: {rfx.referenceNo || 'N/A'}</div>
              {rfx.createdAt && (
                <div>Created: {format(new Date(rfx.createdAt), 'PP')}</div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rfx.dueDate && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Due Date</div>
                  <div className={`font-medium ${isExpired ? 'text-red-600' : ''}`}>
                    {format(new Date(rfx.dueDate), 'PPp')}
                  </div>
                </div>
              </div>
            )}
            
            {rfx.budget && (
              <div className="flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Budget</div>
                  <div className="font-medium">₹{rfx.budget.toLocaleString('en-IN')}</div>
                </div>
              </div>
            )}

            {rfx.contactPerson && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Contact Person</div>
                  <div className="font-medium">{rfx.contactPerson}</div>
                </div>
              </div>
            )}
          </div>
          
          {rfx.scope && (
            <div>
              <div className="text-sm text-muted-foreground mb-2">Scope of Work</div>
              <div className="p-3 bg-muted rounded-lg text-sm">
                {rfx.scope}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Requirements */}
      {rfx.criteria && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {rfxType === 'RFI' ? 'Information Required' : 'Requirements & Criteria'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
              {rfx.criteria}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evaluation Parameters */}
      {rfx.evaluationParameters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evaluation Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
              {rfx.evaluationParameters}
            </div>
          </CardContent>
        </Card>
      )}

      {/* BOM Details */}
      {bom && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="h-5 w-5" />
              Bill of Materials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="font-medium">{bom.name}</div>
              {bom.description && (
                <div className="text-sm text-muted-foreground">{bom.description}</div>
              )}
              {bom.items && bom.items.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Product</th>
                        <th className="text-left p-2">Quantity</th>
                        <th className="text-left p-2">Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bom.items.map((item: any, index: number) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">{item.product?.name || item.productName || 'N/A'}</td>
                          <td className="p-2">{item.quantity || 'N/A'}</td>
                          <td className="p-2">{item.unit || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      {rfx.attachments && rfx.attachments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rfx.attachments.map((attachment: string, index: number) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={attachment} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    Document {index + 1}
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Response Action */}
      {!isExpired && (
        <Card className="border-2 border-primary/20">
          <CardContent className="py-6">
            <div className="text-center space-y-4">
              <div>
                <h3 className="text-lg font-medium">Ready to Respond?</h3>
                <p className="text-muted-foreground">
                  Submit your response to this {rfxType} by the due date above.
                </p>
              </div>
              <Link href={`/vendor/rfx-response/${id}`}>
                <Button size="lg" data-testid="button-respond-bottom">
                  Respond to {rfxType}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}