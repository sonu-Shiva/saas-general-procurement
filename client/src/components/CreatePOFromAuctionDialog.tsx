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
import { Building2, Trophy, Clock, IndianRupee, Target, ShoppingCart } from "lucide-react";

interface CreatePOFromAuctionDialogProps {
  auction: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreatePOFromAuctionDialog({ auction, onClose, onSuccess }: CreatePOFromAuctionDialogProps) {
  const [selectedVendor, setSelectedVendor] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [deliverySchedule, setDeliverySchedule] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Fetch auction bids
  const { data: auctionBids, isLoading: isLoadingBids } = useQuery({
    queryKey: ["/api/auction-bids", auction.id],
    queryFn: async () => {
      const response = await fetch(`/api/auctions/${auction.id}/bids`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch auction bids');
      return response.json();
    }
  });

  // Fetch vendors
  const { data: vendors, isLoading: isLoadingVendors } = useQuery({
    queryKey: ["/api/vendors"]
  });

  // Update form when vendor selection changes
  useEffect(() => {
    if (selectedVendor && auctionBids && Array.isArray(auctionBids)) {
      const vendorBids = auctionBids.filter((bid: any) => bid.vendorId === selectedVendor);
      if (vendorBids.length > 0) {
        // Use the lowest (winning) bid from this vendor
        const lowestBid = vendorBids.sort((a: any, b: any) => Number(a.amount) - Number(b.amount))[0];
        setBidAmount(lowestBid.amount);
      }
    }
  }, [selectedVendor, auctionBids]);

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
      const response = await fetch(`/api/auctions/${auction.id}/create-po`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          vendorId: selectedVendor,
          bidAmount,
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

  const getVendorBids = (vendorId: string) => {
    if (!auctionBids || !Array.isArray(auctionBids)) return [];
    return auctionBids.filter((bid: any) => bid.vendorId === vendorId);
  };

  const getVendorName = (vendorId: string) => {
    if (!vendors || !Array.isArray(vendors)) return vendorId;
    const vendor = vendors.find((v: any) => v.id === vendorId);
    return vendor ? vendor.companyName : vendorId;
  };

  const getVendorBestBid = (vendorId: string) => {
    const bids = getVendorBids(vendorId);
    if (bids.length === 0) return null;
    return bids.sort((a: any, b: any) => Number(a.amount) - Number(b.amount))[0];
  };

  if (isLoadingBids || isLoadingVendors) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading auction data...</p>
      </div>
    );
  }

  const vendorsWithBids = (vendors && Array.isArray(vendors)) ? vendors.filter((vendor: any) => 
    auctionBids?.some((bid: any) => bid.vendorId === vendor.id)
  ) : [];

  return (
    <div className="space-y-6">
      {/* Auction Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="w-5 h-5" />
            <span>Auction Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Auction Name</Label>
              <p className="text-sm text-muted-foreground">{auction.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <Badge variant="outline">{auction.status.toUpperCase()}</Badge>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Description</Label>
            <p className="text-sm text-muted-foreground">{auction.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Ceiling Price</Label>
              <p className="text-lg font-bold text-blue-600">₹{auction.reservePrice}</p>
            </div>
            {auction.currentBid && (
              <div>
                <Label className="text-sm font-medium">Winning Bid</Label>
                <p className="text-lg font-bold text-green-600">₹{auction.currentBid}</p>
              </div>
            )}
          </div>
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
                  <SelectValue placeholder="Choose a vendor who participated" />
                </SelectTrigger>
                <SelectContent>
                  {vendorsWithBids.map((vendor: any) => {
                    const bestBid = getVendorBestBid(vendor.id);
                    return (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center space-x-2">
                            <Building2 className="w-4 h-4" />
                            <span>{vendor.companyName}</span>
                          </div>
                          {bestBid && (
                            <Badge variant="outline" className="text-xs">
                              Best: ₹{bestBid.amount}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Selected Vendor Info */}
            {selectedVendor && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Selected Vendor Bids</Label>
                  <div className="space-y-1">
                    {getVendorBids(selectedVendor).slice(0, 3).map((bid: any, index: number) => (
                      <div key={bid.id} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          {index === 0 ? '🏆 Best' : `#${index + 1}`}: ₹{bid.amount}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(bid.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Purchase Amount (₹) *</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="pl-10"
                  placeholder="Enter purchase amount"
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