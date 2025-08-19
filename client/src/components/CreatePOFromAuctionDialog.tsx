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

  // Fetch challenge prices for this auction
  const { data: challengePrices = [] } = useQuery({
    queryKey: ["/api/auctions", auction.id, "challenge-prices"],
    queryFn: async () => {
      const response = await fetch(`/api/auctions/${auction.id}/challenge-prices`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch challenge prices');
      return response.json();
    }
  });

  // Fetch all counter prices for all challenge prices in this auction
  const { data: allCounterPrices = [] } = useQuery({
    queryKey: ["/api/auctions", auction.id, "all-counter-prices"], 
    queryFn: async () => {
      const allCounters: any[] = [];
      for (const challenge of challengePrices) {
        try {
          const response = await fetch(`/api/challenge-prices/${challenge.id}/counter-prices`, {
            credentials: 'include'
          });
          if (response.ok) {
            const counterPrices = await response.json();
            const enhancedCounters = counterPrices.map((cp: any) => ({
              ...cp,
              challengeInfo: challenge
            }));
            allCounters.push(...enhancedCounters);
          }
        } catch (error) {
          console.log(`No counter prices for challenge ${challenge.id}`);
        }
      }
      return allCounters;
    },
    enabled: challengePrices.length > 0
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
        
        // Check for accepted challenge price for this vendor
        const vendorChallengePrice = challengePrices.find((cp: any) => cp.vendorId === selectedVendor && cp.status === 'accepted');
        
        // Check for accepted counter price for this vendor
        const vendorCounterPrices = allCounterPrices.filter((cp: any) => cp.challengeInfo?.vendorId === selectedVendor);
        const acceptedCounterPrice = vendorCounterPrices.find((cp: any) => cp.status === 'accepted');
        
        // Priority: Counter price > Challenge price > Original bid
        let finalAmount: string;
        if (acceptedCounterPrice) {
          finalAmount = acceptedCounterPrice.counterAmount;
        } else if (vendorChallengePrice) {
          finalAmount = vendorChallengePrice.challengeAmount;
        } else {
          finalAmount = lowestBid.amount;
        }
        setBidAmount(finalAmount);
      }
    }
  }, [selectedVendor, auctionBids, allCounterPrices]);

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

    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid purchase amount",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log('Submitting PO creation with data:', {
        vendorId: selectedVendor,
        bidAmount: parseFloat(bidAmount),
        paymentTerms,
        deliverySchedule,
        notes
      });

      const response = await fetch(`/api/auctions/${auction.id}/create-po`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          vendorId: selectedVendor,
          bidAmount: parseFloat(bidAmount),
          paymentTerms,
          deliverySchedule,
          notes
        }),
      });

      const result = await response.json();
      console.log('PO creation response:', result);

      if (response.ok && result.success) {
        toast({
          title: "Success",
          description: result.message || `Purchase Order ${result.purchaseOrder?.poNumber} created successfully`,
        });
        onSuccess();
      } else {
        console.error('PO creation failed:', result);
        toast({
          title: "Error",
          description: result.message || result.error || "Failed to create purchase order",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('PO creation error:', error);
      toast({
        title: "Error",
        description: error.message || "Network error - failed to create purchase order",
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

  // Calculate rankings for vendors with bids
  const getVendorsWithRankings = () => {
    if (!vendorsWithBids.length || !auctionBids) return [];
    
    // Get best final amount for each vendor (considering counter prices)
    const vendorBestBids = vendorsWithBids.map((vendor: any) => {
      const bestBid = getVendorBestBid(vendor.id);
      
      // Check for accepted challenge price for this vendor
      const vendorChallengePrice = challengePrices.find((cp: any) => cp.vendorId === vendor.id && cp.status === 'accepted');
      
      // Check for accepted counter price for this vendor
      const vendorCounterPrices = allCounterPrices.filter((cp: any) => cp.challengeInfo?.vendorId === vendor.id);
      const acceptedCounterPrice = vendorCounterPrices.find((cp: any) => cp.status === 'accepted');
      
      // Priority: Counter price > Challenge price > Original bid
      let finalAmount: number;
      if (acceptedCounterPrice) {
        finalAmount = parseFloat(acceptedCounterPrice.counterAmount);
      } else if (vendorChallengePrice) {
        finalAmount = parseFloat(vendorChallengePrice.challengeAmount);
      } else {
        finalAmount = bestBid ? Number(bestBid.amount) : 999999;
      }
      
      return {
        vendor,
        bestBid,
        acceptedCounterPrice,
        acceptedChallengePrice: vendorChallengePrice,
        amount: finalAmount,
        originalAmount: bestBid ? Number(bestBid.amount) : 999999
      };
    }).sort((a, b) => a.amount - b.amount);

    // Add ranking to each vendor
    return vendorBestBids.map((item, index) => ({
      ...item.vendor,
      bestBid: item.bestBid,
      acceptedCounterPrice: item.acceptedCounterPrice,
      acceptedChallengePrice: item.acceptedChallengePrice,
      finalAmount: item.amount,
      originalAmount: item.originalAmount,
      ranking: `L${index + 1}`
    }));
  };

  const rankedVendors = getVendorsWithRankings();

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
              <div className="mt-1">
                <Badge variant="outline">{auction.status.toUpperCase()}</Badge>
              </div>
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
            {(auction.winningBid?.amount || auction.currentBid) && (
              <div>
                <Label className="text-sm font-medium">Winning Bid</Label>
                {(() => {
                  // Calculate actual winning amount considering counter prices and challenge prices
                  if (rankedVendors.length > 0) {
                    const winningVendor = rankedVendors[0];
                    const originalBidAmount = winningVendor.bestBid ? winningVendor.bestBid.amount : (auction.winningBid?.amount || auction.currentBid);
                    const winningAmount = winningVendor.finalAmount;
                    
                    // Check if final amount is different from original (either counter price or challenge price accepted)
                    const hasFinalPriceChange = parseFloat(winningAmount) !== parseFloat(originalBidAmount);
                    
                    return (
                      <div>
                        <p className="text-lg font-bold text-green-600">₹{winningAmount}</p>
                        {hasFinalPriceChange && (
                          <p className="text-sm text-gray-500 line-through">
                            Original: ₹{originalBidAmount}
                          </p>
                        )}
                      </div>
                    );
                  }
                  return <p className="text-lg font-bold text-green-600">₹{auction.winningBid?.amount || auction.currentBid}</p>;
                })()}
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
                  {rankedVendors.map((vendor: any) => {
                    return (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        <div className="flex items-center justify-between w-full min-w-0">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${
                              vendor.ranking === 'L1' 
                                ? 'bg-green-500' 
                                : vendor.ranking === 'L2'
                                  ? 'bg-blue-500'
                                  : vendor.ranking === 'L3'
                                    ? 'bg-orange-500'
                                    : 'bg-gray-500'
                            }`}>
                              {vendor.ranking}
                            </div>
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <Building2 className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{vendor.companyName}</span>
                            </div>
                          </div>
                          {vendor.bestBid && (
                            <div className="flex flex-col items-end ml-4 flex-shrink-0">
                              {(vendor.acceptedCounterPrice || vendor.acceptedChallengePrice) ? (
                                <>
                                  <Badge variant="secondary" className="text-xs mb-1">
                                    Final: ₹{vendor.finalAmount}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs line-through">
                                    ₹{vendor.originalAmount}
                                  </Badge>
                                </>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  Best: ₹{vendor.bestBid.amount}
                                </Badge>
                              )}
                            </div>
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
                  <Label className="text-sm font-medium">Selected Vendor Pricing</Label>
                  <div className="space-y-1">
                    {(() => {
                      const vendorChallengePrice = challengePrices.find((cp: any) => cp.vendorId === selectedVendor && cp.status === 'accepted');
                      const vendorCounterPrices = allCounterPrices.filter((cp: any) => cp.challengeInfo?.vendorId === selectedVendor);
                      const acceptedCounterPrice = vendorCounterPrices.find((cp: any) => cp.status === 'accepted');
                      
                      if (acceptedCounterPrice) {
                        return (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-green-600 font-medium">
                                🎯 Final Price (Counter Accepted): ₹{acceptedCounterPrice.counterAmount}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Original bids:
                            </div>
                            {getVendorBids(selectedVendor).slice(0, 2).map((bid: any, index: number) => (
                              <div key={bid.id} className="flex justify-between items-center text-sm opacity-75">
                                <span className="text-muted-foreground line-through">
                                  {index === 0 ? '🏆 Best' : `#${index + 1}`}: ₹{bid.amount}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(bid.timestamp).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      } else if (vendorChallengePrice) {
                        return (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-blue-600 font-medium">
                                ⚡ Final Price (Challenge Accepted): ₹{vendorChallengePrice.challengeAmount}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Original bids:
                            </div>
                            {getVendorBids(selectedVendor).slice(0, 2).map((bid: any, index: number) => (
                              <div key={bid.id} className="flex justify-between items-center text-sm opacity-75">
                                <span className="text-muted-foreground line-through">
                                  {index === 0 ? '🏆 Best' : `#${index + 1}`}: ₹{bid.amount}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(bid.timestamp).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      
                      return getVendorBids(selectedVendor).slice(0, 3).map((bid: any, index: number) => (
                        <div key={bid.id} className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">
                            {index === 0 ? '🏆 Best' : `#${index + 1}`}: ₹{bid.amount}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(bid.timestamp).toLocaleString()}
                          </span>
                        </div>
                      ));
                    })()}
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