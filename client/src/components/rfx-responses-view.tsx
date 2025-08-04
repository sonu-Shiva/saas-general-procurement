
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, 
  IndianRupee, 
  Truck, 
  CreditCard, 
  Clock, 
  FileText,
  ShoppingCart,
  CheckCircle,
  AlertCircle,
  User
} from "lucide-react";

interface RfxResponsesViewProps {
  rfx: any;
  onClose: () => void;
  onCreatePO: (rfx: any) => void;
}

export function RfxResponsesView({ rfx, onClose, onCreatePO }: RfxResponsesViewProps) {
  const { toast } = useToast();
  const [selectedResponse, setSelectedResponse] = useState<any>(null);

  // Fetch responses for this RFx
  const { data: responses = [], isLoading } = useQuery({
    queryKey: [`/api/rfx/${rfx.id}/responses`],
    retry: false,
  });

  const handleCreatePOFromResponse = (response: any) => {
    setSelectedResponse(response);
    onCreatePO({
      ...rfx,
      selectedResponse: response,
      selectedVendor: response.vendor
    });
    onClose();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading responses...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 max-h-[calc(90vh-100px)] overflow-y-auto">
      {/* RFx Summary */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{rfx.title}</CardTitle>
              <p className="text-muted-foreground mt-1">{rfx.scope}</p>
            </div>
            <div className="flex space-x-2">
              <Badge variant="secondary">{rfx.type.toUpperCase()}</Badge>
              <Badge className={
                rfx.status === 'active' ? 'bg-green-100 text-green-800' :
                rfx.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                'bg-yellow-100 text-yellow-800'
              }>
                {rfx.status.toUpperCase()}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Responses Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Vendor Responses ({responses.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {responses.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Responses Yet</h3>
              <p className="text-muted-foreground">
                No vendors have submitted responses to this RFx yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {responses.map((response: any, index: number) => (
                <ResponseCard 
                  key={response.id} 
                  response={response} 
                  index={index}
                  onCreatePO={() => handleCreatePOFromResponse(response)}
                  rfxType={rfx.type}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {responses.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {responses.length} response{responses.length !== 1 ? 's' : ''} received
          </div>
        )}
      </div>
    </div>
  );
}

// Individual Response Card Component
function ResponseCard({ response, index, onCreatePO, rfxType }: any) {
  return (
    <Card className="border-l-4 border-l-blue-200">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-blue-800">{index + 1}</span>
            </div>
            <div>
              <h3 className="font-medium">
                {response.vendor?.companyName || 
                 response.vendor?.company_name || 
                 response.vendorName ||
                 `Vendor ${response.vendorId?.slice(-8) || 'Unknown'}`}
              </h3>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Submitted: {new Date(response.submittedAt || response.submitted_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <Badge variant="outline" className="bg-green-50 text-green-700">
              <CheckCircle className="w-3 h-3 mr-1" />
              Responded
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {response.quotedPrice && (
            <div className="flex items-center space-x-2">
              <IndianRupee className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Quoted Price</p>
                <p className="font-medium">₹{parseFloat(response.quotedPrice).toLocaleString('en-IN')}</p>
              </div>
            </div>
          )}
          
          {response.leadTime && (
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Lead Time</p>
                <p className="font-medium">{response.leadTime} days</p>
              </div>
            </div>
          )}
          
          {response.deliveryTerms && (
            <div className="flex items-center space-x-2">
              <Truck className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Delivery</p>
                <p className="font-medium text-sm">{response.deliveryTerms.substring(0, 20)}...</p>
              </div>
            </div>
          )}
          
          {response.paymentTerms && (
            <div className="flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Payment</p>
                <p className="font-medium text-sm">{response.paymentTerms.substring(0, 20)}...</p>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Detailed Response */}
        {response.response && (
          <div>
            <h4 className="font-medium mb-2">Detailed Response</h4>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm whitespace-pre-wrap">{response.response}</p>
            </div>
          </div>
        )}

        {/* Terms Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {response.deliveryTerms && (
            <div>
              <h4 className="font-medium mb-2">Delivery Terms</h4>
              <p className="text-sm text-muted-foreground">{response.deliveryTerms}</p>
            </div>
          )}
          
          {response.paymentTerms && (
            <div>
              <h4 className="font-medium mb-2">Payment Terms</h4>
              <p className="text-sm text-muted-foreground">{response.paymentTerms}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-2">
          {rfxType === 'rfq' && (
            <Button
              onClick={onCreatePO}
              className="bg-green-600 hover:bg-green-700"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Create PO
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
