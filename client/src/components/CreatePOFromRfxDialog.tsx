import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Building2, User, Clock, IndianRupee, FileText, ShoppingCart } from "lucide-react";

interface CreatePOFromRfxDialogProps {
  rfx: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreatePOFromRfxDialog({ rfx, onClose, onSuccess }: CreatePOFromRfxDialogProps) {
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedResponse, setSelectedResponse] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [deliverySchedule, setDeliverySchedule] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Fetch RFx responses
  const { data: rfxResponses, isLoading: isLoadingResponses } = useQuery({
    queryKey: ["/api/rfx-responses", rfx.id],
    queryFn: async () => {
      const response = await fetch(`/api/rfx-responses?rfxId=${rfx.id}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch RFx responses');
      return response.json();
    }
  });

  // Fetch vendors
  const { data: vendors, isLoading: isLoadingVendors } = useQuery({
    queryKey: ["/api/vendors"]
  });

  // Update form when vendor/response selection changes
  useEffect(() => {
    if (selectedResponse && rfxResponses) {
      const response = rfxResponses.find((r: any) => r.id === selectedResponse);
      if (response) {
        setTotalAmount(response.quotedPrice || "");
        setPaymentTerms(response.paymentTerms || "Net 30");
        setDeliverySchedule(response.deliverySchedule || "");
      }
    }
  }, [selectedResponse, rfxResponses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedVendor) {
      toast({
        title: "Error",
        description: "Please select a vendor",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/rfx/${rfx.id}/create-po`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          vendorId: selectedVendor,
          responseId: selectedResponse,
          totalAmount,
          paymentTerms,
          deliverySchedule,
          notes
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success",
          description: `Purchase Order ${result.purchaseOrder.poNumber} created successfully`,
        });
        onSuccess();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to create purchase order",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create purchase order",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVendorResponses = (vendorId: string) => {
    if (!rfxResponses) return [];
    return rfxResponses.filter((response: any) => response.vendorId === vendorId);
  };

  const getVendorName = (vendorId: string) => {
    if (!vendors || !Array.isArray(vendors)) return vendorId;
    const vendor = vendors.find((v: any) => v.id === vendorId);
    return vendor ? vendor.companyName : vendorId;
  };

  if (isLoadingResponses || isLoadingVendors) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading RFx responses...</p>
      </div>
    );
  }

  const vendorsWithResponses = (vendors && Array.isArray(vendors)) ? vendors.filter((vendor: any) => 
    rfxResponses?.some((response: any) => response.vendorId === vendor.id)
  ) : [];

  return (
    <div className="space-y-6">
      {/* RFx Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>RFx Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Title</Label>
              <p className="text-sm text-muted-foreground">{rfx.title}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Type</Label>
              <Badge variant="secondary">{rfx.type.toUpperCase()}</Badge>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Scope</Label>
            <p className="text-sm text-muted-foreground">{rfx.scope}</p>
          </div>
          {rfx.budget && (
            <div>
              <Label className="text-sm font-medium">Budget</Label>
              <p className="text-sm text-muted-foreground">₹{rfx.budget}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchase Order Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5" />
              <span>Purchase Order Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Vendor Selection */}
            <div className="space-y-2">
              <Label htmlFor="vendor">Select Vendor *</Label>
              <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a vendor who responded" />
                </SelectTrigger>
                <SelectContent>
                  {vendorsWithResponses.map((vendor: any) => {
                    const responses = getVendorResponses(vendor.id);
                    return (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-4 h-4" />
                          <span>{vendor.companyName}</span>
                          <Badge variant="outline" className="text-xs">
                            {responses.length} response{responses.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Response Selection */}
            {selectedVendor && (
              <div className="space-y-2">
                <Label htmlFor="response">Select Response (Optional)</Label>
                <Select value={selectedResponse} onValueChange={setSelectedResponse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose specific response or use latest" />
                  </SelectTrigger>
                  <SelectContent>
                    {getVendorResponses(selectedVendor).map((response: any) => (
                      <SelectItem key={response.id} value={response.id}>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span>
                            {response.quotedPrice ? `₹${response.quotedPrice}` : 'No price'} - 
                            {new Date(response.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Total Amount (₹) *</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="pl-10"
                  placeholder="Enter total amount"
                  required
                />
              </div>
            </div>

            {/* Payment Terms */}
            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Net 15">Net 15 days</SelectItem>
                  <SelectItem value="Net 30">Net 30 days</SelectItem>
                  <SelectItem value="Net 45">Net 45 days</SelectItem>
                  <SelectItem value="Net 60">Net 60 days</SelectItem>
                  <SelectItem value="Advance">Advance Payment</SelectItem>
                  <SelectItem value="COD">Cash on Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Delivery Schedule */}
            <div className="space-y-2">
              <Label htmlFor="deliverySchedule">Delivery Schedule</Label>
              <Input
                id="deliverySchedule"
                value={deliverySchedule}
                onChange={(e) => setDeliverySchedule(e.target.value)}
                placeholder="e.g. Within 15 business days"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Terms & Conditions / Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional terms, conditions, or notes for this purchase order"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Purchase Order"}
          </Button>
        </div>
      </form>
    </div>
  );
}