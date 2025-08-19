import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CreatePOFromAuctionDialog } from "@/components/CreatePOFromAuctionDialog";

import { TermsAcceptanceDialog } from "@/components/TermsAcceptanceDialog";
import { 
  Plus, 
  Search, 
  Timer,
  Trophy,
  Users,
  IndianRupee,
  Clock,
  Play,
  Pause,
  Square,
  Target,
  TrendingUp,
  TrendingDown,
  Gavel,
  Eye,
  Bell,
  Calendar,
  ShoppingCart,
  Upload,
  FileText,
  AlertTriangle,
  MessageSquare
} from "lucide-react";

// Challenge Tracker Component for Sourcing Executives
function ChallengeTracker({ auctionId }: { auctionId: string }) {
  const { data: challengePrices = [] } = useQuery({
    queryKey: ["/api/auctions", auctionId, "challenge-prices"],
    queryFn: () => apiRequest(`/api/auctions/${auctionId}/challenge-prices`),
    refetchInterval: 3000
  });

  if (challengePrices.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        No challenge prices sent yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {challengePrices.map((challenge: any) => (
        <div key={challenge.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-medium">
                Challenge to {challenge.vendorCompanyName || 'Unknown Vendor'}: ₹{parseFloat(challenge.challengeAmount).toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">
                Original bid: ₹{parseFloat(challenge.originalBidAmount || 0).toFixed(2)} • 
                Sent on {new Date(challenge.createdAt).toLocaleDateString()}
              </div>
              {challenge.notes && challenge.notes.trim() && (
                <div className="text-sm mt-2 p-2 bg-white rounded border">
                  <strong>Notes:</strong> {challenge.notes}
                </div>
              )}
            </div>
            <Badge variant={
              challenge.status === 'accepted' ? 'secondary' :
              challenge.status === 'rejected' ? 'destructive' :
              challenge.status === 'countered' ? 'outline' : 'default'
            }>
              {challenge.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

// Vendor Challenge View Component
function VendorChallengeView({ auctionId }: { auctionId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [counterAmount, setCounterAmount] = useState('');
  const [counterNotes, setCounterNotes] = useState('');
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [isCounterDialogOpen, setIsCounterDialogOpen] = useState(false);

  const { data: challengePrices = [] } = useQuery({
    queryKey: ["/api/vendor/auctions", auctionId, "challenges"],
    queryFn: () => apiRequest(`/api/vendor/auctions/${auctionId}/challenges`),
    refetchInterval: 3000,
    enabled: (user as any)?.role === 'vendor'
  });

  const respondToChallengeQuery = useMutation({
    mutationFn: async ({ challengeId, action, counterAmount, notes }: any) => {
      return apiRequest(`/api/vendor/challenges/${challengeId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action, counterAmount, notes }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (_, { action }) => {
      toast({ title: "Success", description: `Challenge ${action} successfully` });
      setIsCounterDialogOpen(false);
      setCounterAmount('');
      setCounterNotes('');
      setSelectedChallenge(null);
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/auctions", auctionId, "challenges"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to respond to challenge",
        variant: "destructive"
      });
    }
  });

  const handleAccept = (challenge: any) => {
    respondToChallengeQuery.mutate({
      challengeId: challenge.id,
      action: 'accept'
    });
  };

  const handleReject = (challenge: any) => {
    respondToChallengeQuery.mutate({
      challengeId: challenge.id,
      action: 'reject'
    });
  };

  const handleCounter = (challenge: any) => {
    setSelectedChallenge(challenge);
    setIsCounterDialogOpen(true);
  };

  const submitCounter = () => {
    if (!selectedChallenge || !counterAmount) return;

    respondToChallengeQuery.mutate({
      challengeId: selectedChallenge.id,
      action: 'counter',
      counterAmount: parseFloat(counterAmount),
      notes: counterNotes
    });
  };

  if (challengePrices.length === 0) return null;

  return (
    <div className="mt-4">
      <h4 className="font-medium mb-3 flex items-center space-x-2">
        <AlertTriangle className="w-4 h-4" />
        <span>Challenge Prices</span>
      </h4>
      <div className="space-y-3">
        {challengePrices.map((challenge: any) => (
          <div key={challenge.id} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">
                  Challenge Price: ₹{parseFloat(challenge.challengeAmount).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Your original bid: ₹{parseFloat(challenge.originalBidAmount || 0).toFixed(2)} • 
                  Received on {new Date(challenge.createdAt).toLocaleDateString()}
                </div>
                {challenge.notes && (
                  <div className="text-sm mt-2 p-2 bg-white rounded border">
                    <strong>Buyer Notes:</strong> {challenge.notes}
                  </div>
                )}
              </div>
              <div className="flex space-x-2">
                {challenge.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleAccept(challenge)}
                      disabled={respondToChallengeQuery.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(challenge)}
                      disabled={respondToChallengeQuery.isPending}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCounter(challenge)}
                      disabled={respondToChallengeQuery.isPending}
                    >
                      Counter
                    </Button>
                  </>
                )}
                {challenge.status !== 'pending' && (
                  <Badge variant={
                    challenge.status === 'accepted' ? 'secondary' :
                    challenge.status === 'rejected' ? 'destructive' :
                    challenge.status === 'countered' ? 'outline' : 'default'
                  }>
                    {challenge.status}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Counter Price Dialog */}
      <Dialog open={isCounterDialogOpen} onOpenChange={setIsCounterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Counter Price</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Challenge Price: ₹{selectedChallenge?.challengeAmount}</Label>
              <p className="text-sm text-muted-foreground">Your original bid: ₹{selectedChallenge?.originalBidAmount}</p>
            </div>
            <div>
              <Label htmlFor="counter-amount">Counter Amount (₹)</Label>
              <Input
                id="counter-amount"
                type="number"
                value={counterAmount}
                onChange={(e) => setCounterAmount(e.target.value)}
                placeholder="Enter your counter price"
              />
            </div>
            <div>
              <Label htmlFor="counter-notes">Notes (Optional)</Label>
              <Textarea
                id="counter-notes"
                value={counterNotes}
                onChange={(e) => setCounterNotes(e.target.value)}
                placeholder="Add notes for the buyer"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCounterDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={submitCounter}
                disabled={!counterAmount || respondToChallengeQuery.isPending}
              >
                {respondToChallengeQuery.isPending ? "Sending..." : "Send Counter"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Auction Results Component  
function AuctionResults({ auctionId, onCreatePO }: { auctionId: string; onCreatePO?: (auction: any) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for challenge pricing and auction extension
  const [challengeAmount, setChallengeAmount] = useState('');
  const [challengeNotes, setChallengeNotes] = useState('');
  const [extensionDuration, setExtensionDuration] = useState('');
  const [extensionReason, setExtensionReason] = useState('');
  const [selectedBidForChallenge, setSelectedBidForChallenge] = useState<any>(null);
  const [isExtendDialogOpen, setIsExtendDialogOpen] = useState(false);
  const [isChallengeDialogOpen, setIsChallengeDialogOpen] = useState(false);
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());

  // Check if user can send challenges and extend auctions
  const canManageAuction = ['sourcing_exec', 'sourcing_manager', 'admin'].includes((user as any)?.role || '');
  const isVendor = (user as any)?.role === 'vendor';

  // For vendors, show the VendorChallengeView instead
  if (isVendor) {
    return <VendorChallengeView auctionId={auctionId} />;
  }

  // Fetch counter prices for sourcing executives
  const { data: counterPrices = [] } = useQuery({
    queryKey: ["/api/auctions", auctionId, "counter-prices"],
    queryFn: () => apiRequest(`/api/auctions/${auctionId}/counter-prices`),
    refetchInterval: 3000,
    retry: false,
    enabled: canManageAuction
  });

  // Create challenge price mutation
  const challengePriceMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/auctions/${auctionId}/challenge-price`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Challenge price sent successfully" });
      setIsChallengeDialogOpen(false);
      setChallengeAmount('');
      setChallengeNotes('');
      setSelectedBidForChallenge(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to send challenge price",
        variant: "destructive"
      });
    }
  });

  // Extend auction mutation
  const extendAuctionMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/auctions/${auctionId}/extend`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Auction extended successfully" });
      setIsExtendDialogOpen(false);
      setExtensionDuration('');
      setExtensionReason('');
      queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to extend auction",
        variant: "destructive"
      });
    }
  });

  // Counter price response mutation
  const respondToCounterMutation = useMutation({
    mutationFn: async ({ counterId, action }: { counterId: string; action: 'accept' | 'reject' }) => {
      return apiRequest(`/api/auctions/${auctionId}/counter-prices/${counterId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (_, { action }) => {
      toast({ title: "Success", description: `Counter price ${action}ed successfully` });
      queryClient.invalidateQueries({ queryKey: ["/api/auctions", auctionId, "counter-prices"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to respond to counter price",
        variant: "destructive"
      });
    }
  });

  const handleSendChallenge = (bid: any) => {
    setSelectedBidForChallenge(bid);
    setIsChallengeDialogOpen(true);
  };

  const submitChallenge = () => {
    if (!selectedBidForChallenge || !challengeAmount) return;

    challengePriceMutation.mutate({
      bidId: selectedBidForChallenge.id,
      vendorId: selectedBidForChallenge.vendorId,
      challengeAmount: parseFloat(challengeAmount),
      notes: challengeNotes
    });
  };

  const submitExtension = () => {
    if (!extensionDuration) return;

    extendAuctionMutation.mutate({
      durationMinutes: parseInt(extensionDuration),
      reason: extensionReason
    });
  };

  const handleVendorSelection = (vendorId: string, checked: boolean) => {
    setSelectedVendors(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(vendorId);
      } else {
        newSet.delete(vendorId);
      }
      return newSet;
    });
  };

  const handleIssuePO = () => {
    if (selectedVendors.size === 0) {
      toast({
        title: "No Vendors Selected",
        description: "Please select at least one vendor to issue a purchase order.",
        variant: "destructive"
      });
      return;
    }
    
    // Call the onCreatePO function if provided
    if (onCreatePO && auction) {
      const selectedVendorsBids = Array.from(selectedVendors).map(vendorId => {
        const bidsArray = Array.isArray(bids) ? bids : [];
        return bidsArray.find((bid: any) => bid.vendorId === vendorId);
      }).filter(Boolean);
      
      onCreatePO({
        ...auction,
        selectedBids: selectedVendorsBids,
        selectedVendors: Array.from(selectedVendors)
      });
      
      toast({
        title: "Success",
        description: `Purchase order created for ${selectedVendors.size} selected vendor(s).`
      });
    } else {
      toast({
        title: "Issue PO",
        description: `Issuing purchase order for ${selectedVendors.size} selected vendor(s).`
      });
    }
  };
  
  // Fetch auction details
  const { data: auction, isLoading: auctionLoading, error: auctionError } = useQuery({
    queryKey: ["/api/auctions", auctionId],
    queryFn: async () => {
      const response = await fetch(`/api/auctions/${auctionId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    retry: false,
  });

  const { data: bids = [], isLoading, error } = useQuery({
    queryKey: ["/api/auctions", auctionId, "bids"],
    queryFn: async () => {
      const response = await fetch(`/api/auctions/${auctionId}/bids`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    },
    retry: false,
  });

  // Fetch challenge prices for this auction
  const { data: challengePrices = [] } = useQuery({
    queryKey: ["/api/auctions", auctionId, "challenge-prices"],
    queryFn: () => apiRequest(`/api/auctions/${auctionId}/challenge-prices`),
    retry: false,
  });

  console.log('Frontend: Received bids data:', bids);
  console.log('Frontend: First bid details:', bids[0]);
  console.log('Frontend: Query error:', error);

  if (isLoading || auctionLoading) {
    return <div className="text-center py-4">Loading results...</div>;
  }

  if (error || auctionError) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-red-300" />
          <h3 className="text-lg font-medium mb-2">Error Loading Results</h3>
          <p className="text-sm">{(error || auctionError)?.message || 'Failed to load auction results'}</p>
        </div>
      </div>
    );
  }

  // Ensure bids is always an array
  const bidsArray = Array.isArray(bids) ? bids : [];

  // Check if we have any bids
  if (bidsArray.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">No Bids Yet</h3>
          <p>This auction hasn't received any bids.</p>
        </div>
      </div>
    );
  }

  // Get latest bid per vendor (group by vendorId and take the latest timestamp)
  const latestBidsMap = new Map();
  bidsArray.forEach((bid: any) => {
    const vendorId = bid.vendorId;
    const existingBid = latestBidsMap.get(vendorId);
    
    if (!existingBid || new Date(bid.timestamp) > new Date(existingBid.timestamp)) {
      latestBidsMap.set(vendorId, bid);
    }
  });

  const latestBids = Array.from(latestBidsMap.values());

  // Sort latest bids by amount (ascending - lowest first)  
  const sortedBids = [...latestBids].sort((a: any, b: any) => {
    const amountA = Number(a.amount || a.bidAmount) || 999999;
    const amountB = Number(b.amount || b.bidAmount) || 999999;
    return amountA - amountB;
  });



  const formatBidDateTime = (timestamp: string) => {
    try {
      if (!timestamp) return 'Time not available';
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Final Rankings</h3>
        <p className="text-muted-foreground mb-4">Ranked by bid amount (lowest first)</p>
      </div>

      {/* Horizontal Scroll Layout for Cards */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-max">
          {sortedBids.map((bid: any, index: number) => {
            const isWinner = index === 0;
            const rankLabel = `L${index + 1}`;
            const vendorName = bid.vendorCompanyName || bid.companyName || `Vendor ${index + 1}`;
            
            // Check if there's a challenge for this vendor
            const hasChallenge = challengePrices.some((cp: any) => cp.vendorId === bid.vendorId);
            const challengeStatus = challengePrices.find((cp: any) => cp.vendorId === bid.vendorId)?.status || null;
            
            return (
              <div 
                key={bid.vendorId} 
                className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow min-h-[350px] w-[320px] flex-shrink-0 flex flex-col justify-between"
              >
                <div className="flex flex-col h-full">
                  {/* Header with checkbox and ranking */}
                  <div className="flex items-center justify-between mb-4">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 text-blue-600 rounded"
                      checked={selectedVendors.has(bid.vendorId)}
                      onChange={(e) => handleVendorSelection(bid.vendorId, e.target.checked)}
                      data-testid={`checkbox-vendor-${index}`}
                    />
                    
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                      isWinner 
                        ? 'bg-green-500' 
                        : index === 1 
                          ? 'bg-blue-500'
                          : index === 2
                            ? 'bg-orange-500'
                            : index === 3
                              ? 'bg-purple-500'
                              : 'bg-gray-500'
                    }`}>
                      {index + 1}
                    </div>
                    
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      isWinner 
                        ? 'bg-green-100 text-green-800' 
                        : index === 1 
                          ? 'bg-blue-100 text-blue-800'
                          : index === 2
                            ? 'bg-orange-100 text-orange-800'
                            : index === 3
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                    }`}>
                      {rankLabel} Bidder
                    </div>
                  </div>

                  {/* Vendor Name */}
                  <div className="mb-4 text-center">
                    <h3 className="font-bold text-lg text-gray-900 mb-1">
                      {vendorName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {formatBidDateTime(bid.timestamp)}
                    </p>
                  </div>

                  {/* Bid Price - Prominent Display */}
                  <div className="mb-4 text-center bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 flex-grow">
                    <div className="text-sm text-gray-600 mb-1">Bid Price:</div>
                    <div className="text-2xl font-bold text-purple-600 mb-1">
                      ₹{parseFloat(bid.amount || bid.bidAmount || 0).toLocaleString()}/MT
                    </div>
                    <div className="text-sm text-green-600 font-medium">
                      Savings: {((15000 - parseFloat(bid.amount || bid.bidAmount || 0)) / 15000 * 100).toFixed(2)}%
                    </div>
                  </div>

                  {/* Challenge Price Section */}
                  <div className="mb-4 text-center bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-600 mb-2">Challenge Price</div>
                    {hasChallenge ? (
                      <div>
                        <div className="font-bold text-lg text-gray-900 mb-1">₹14800/MT</div>
                        <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          challengeStatus === 'accepted' 
                            ? 'bg-green-100 text-green-700' 
                            : challengeStatus === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {challengeStatus === 'accepted' ? 'Accepted' : 
                           challengeStatus === 'rejected' ? 'Rejected' : 'Pending'}
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm">No challenge sent</div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="mt-auto">
                    {canManageAuction && (auction?.status === 'completed' || auction?.status === 'closed') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendChallenge(bid)}
                        className="w-full text-sm"
                        data-testid={`button-challenge-${index}`}
                      >
                        Challenge
                      </Button>
                    )}
                    
                    {hasChallenge && challengeStatus === 'rejected' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-sm text-red-600 border-red-300 mt-2"
                        data-testid={`button-counter-${index}`}
                      >
                        Send Counter Price
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Issue PO Section - Only for non-vendors */}
      {canManageAuction && !isVendor && (
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Issue Purchase Order</h4>
            <Button
              variant="default"
              size="default"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleIssuePO}
              disabled={selectedVendors.size === 0}
              data-testid="button-issue-po"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Issue PO ({selectedVendors.size})
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Select vendors above and click "Issue PO" to create purchase orders for the selected bidders.
          </p>
        </div>
      )}



        {/* Create PO Button for completed auctions - Only visible for non-vendors */}
        {sortedBids.length > 0 && !isVendor && (
          <div className="text-center mt-6 pt-4 border-t">
            <Button 
              onClick={() => onCreatePO && onCreatePO({ ...auction, winningBid: sortedBids[0] })}
              className="bg-green-600 hover:bg-green-700"
              disabled={!onCreatePO}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Create Purchase Order
            </Button>
          </div>
        )}

        {/* Challenge Price Dialog */}
        <Dialog open={isChallengeDialogOpen} onOpenChange={setIsChallengeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Challenge Price</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Vendor: {selectedBidForChallenge?.vendorCompanyName || selectedBidForChallenge?.vendor?.companyName}</Label>
                <p className="text-sm text-muted-foreground">Current bid: ₹{selectedBidForChallenge?.amount || selectedBidForChallenge?.bidAmount}</p>
              </div>
              <div>
                <Label htmlFor="challenge-amount">Challenge Amount (₹)</Label>
                <Input
                  id="challenge-amount"
                  type="number"
                  value={challengeAmount}
                  onChange={(e) => setChallengeAmount(e.target.value)}
                  placeholder="Enter challenge price"
                />
              </div>
              <div>
                <Label htmlFor="challenge-notes">Notes (Optional)</Label>
                <Textarea
                  id="challenge-notes"
                  value={challengeNotes}
                  onChange={(e) => setChallengeNotes(e.target.value)}
                  placeholder="Add notes for the vendor"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsChallengeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={submitChallenge}
                  disabled={!challengeAmount || challengePriceMutation.isPending}
                >
                  {challengePriceMutation.isPending ? "Sending..." : "Send Challenge"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Extend Auction Dialog */}
        <Dialog open={isExtendDialogOpen} onOpenChange={setIsExtendDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Extend Auction</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Current end time: {auction ? new Date(auction.endTime).toLocaleString() : 'Loading...'}</Label>
              </div>
              <div>
                <Label htmlFor="extension-duration">Extension Duration (minutes)</Label>
                <Input
                  id="extension-duration"
                  type="number"
                  value={extensionDuration}
                  onChange={(e) => setExtensionDuration(e.target.value)}
                  placeholder="Enter minutes to extend"
                />
              </div>
              <div>
                <Label htmlFor="extension-reason">Reason</Label>
                <Textarea
                  id="extension-reason"
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  placeholder="Reason for extending the auction"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsExtendDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={submitExtension}
                  disabled={!extensionDuration || extendAuctionMutation.isPending}
                >
                  {extendAuctionMutation.isPending ? "Extending..." : "Extend Auction"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
}

export default function AuctionCenter() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<any>(null);
  const [isLiveBiddingOpen, setIsLiveBiddingOpen] = useState(false);
  const [isPODialogOpen, setIsPODialogOpen] = useState(false);
  const [selectedAuctionForPO, setSelectedAuctionForPO] = useState<any>(null);
  const [selectedAuctionForView, setSelectedAuctionForView] = useState<any>(null);
  const [isAuctionDetailsOpen, setIsAuctionDetailsOpen] = useState(false);
  const [isTermsDialogOpen, setIsTermsDialogOpen] = useState(false);
  // Load accepted terms from localStorage on component mount
  const [acceptedTermsMap, setAcceptedTermsMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('acceptedAuctionTerms');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // WebSocket connection for live updates
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [liveAuctions, setLiveAuctions] = useState<Set<string>>(new Set());

  const isVendor = (user as any)?.role === 'vendor';

  const { data: auctions = [], isLoading } = useQuery({
    queryKey: ["/api/auctions"],
    retry: false,
  });

  const { data: boms = [] } = useQuery({
    queryKey: ["/api/boms"],
    retry: false,
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors"],
    retry: false,
  });

  // WebSocket setup for live auction updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connected for auction updates");
      setWs(socket);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'auction_status_change') {
          queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });

          if (data.status === 'live') {
            setLiveAuctions(prev => new Set(prev).add(data.auctionId));
          } else {
            setLiveAuctions(prev => {
              const newSet = new Set(prev);
              newSet.delete(data.auctionId);
              return newSet;
            });
          }
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
      setWs(null);
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [queryClient]);

  // Ensure auctions is always an array and define filteredAuctions
  const auctionsArray = Array.isArray(auctions) ? auctions : [];

  const filteredAuctions = auctionsArray.filter((auction: any) => {
    const matchesSearch = auction.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         auction.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || auction.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStartAuction = async (auctionId: string) => {
    try {
      const response = await fetch(`/api/auctions/${auctionId}/start`, {
        method: 'PATCH',
        credentials: "include",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Auction started successfully",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start auction",
        variant: "destructive",
      });
    }
  };

  const handleViewLiveBidding = (auction: any) => {
    if (isVendor && auction.status === 'live') {
      // Create a unique key for this vendor-auction combination
      const userId = (user as any)?.id;
      const termsKey = `${userId}-${auction.id}`;
      
      // Check if vendor has accepted terms for this specific auction before bidding
      if (auction.termsAndConditionsPath && !acceptedTermsMap[termsKey]) {
        setSelectedAuctionForView(auction);
        setIsTermsDialogOpen(true);
        return;
      }
    }
    setSelectedAuction(auction);
    setIsLiveBiddingOpen(true);
  };

  const handleViewAuctionDetails = (auction: any) => {
    setSelectedAuctionForView(auction);
    setIsAuctionDetailsOpen(true);
  };

  const handleCreatePOFromAuction = (auction: any) => {
    setSelectedAuctionForPO(auction);
    setIsPODialogOpen(true);
  };

  const handleTermsAccepted = () => {
    const userId = (user as any)?.id;
    if (selectedAuctionForView && userId) {
      // Create unique key for this vendor-auction combination
      const termsKey = `${userId}-${selectedAuctionForView.id}`;
      
      // Mark terms as accepted for this specific vendor-auction pair
      const newAcceptedTermsMap = {
        ...acceptedTermsMap,
        [termsKey]: true
      };
      
      // Update state and save to localStorage
      setAcceptedTermsMap(newAcceptedTermsMap);
      localStorage.setItem('acceptedAuctionTerms', JSON.stringify(newAcceptedTermsMap));
      
      setIsTermsDialogOpen(false);
      setSelectedAuction(selectedAuctionForView);
      setIsLiveBiddingOpen(true);
    }
  };

  const handleTermsDeclined = () => {
    setIsTermsDialogOpen(false);
    setSelectedAuctionForView(null);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      {!isVendor && (
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Auction Center</h1>
            <p className="text-muted-foreground">Manage reverse auctions and competitive bidding</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Create Auction
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Create New Reverse Auction</DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
                <CreateAuctionForm 
                  onClose={() => setIsCreateDialogOpen(false)}
                  onSuccess={() => {
                    setIsCreateDialogOpen(false);
                    queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
                  }}
                  boms={boms}
                  vendors={vendors}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {isVendor && (
        <div>
          <h1 className="text-3xl font-bold text-foreground">Available Auctions</h1>
          <p className="text-muted-foreground">View and participate in live auctions</p>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search auctions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Live Auctions Alert */}
      {liveAuctions.size > 0 && (
        <Card className="mb-6 border-2 border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">
                {liveAuctions.size} auction{liveAuctions.size > 1 ? 's' : ''} currently live
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auctions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Gavel className="w-5 h-5" />
            <span>Reverse Auctions</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading auctions...</p>
            </div>
          ) : filteredAuctions.length === 0 ? (
            <div className="p-12 text-center">
              <Gavel className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Auctions Found</h3>
              <p className="text-muted-foreground mb-6">
                {auctionsArray.length === 0 
                  ? isVendor ? "No auctions available for bidding." : "Create your first reverse auction to start competitive bidding."
                  : "No auctions match your current filters. Try adjusting your search criteria."
                }
              </p>
              {!isVendor && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Auction
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredAuctions.map((auction: any) => (
                <AuctionCard 
                  key={auction.id} 
                  auction={auction}
                  onStart={() => handleStartAuction(auction.id)}
                  onViewLive={() => handleViewLiveBidding(auction)}
                  onCreatePO={handleCreatePOFromAuction}
                  onViewAuctionDetails={handleViewAuctionDetails}
                  isLive={liveAuctions.has(auction.id)}
                  isVendor={isVendor}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Bidding Dialog */}
      <Dialog open={isLiveBiddingOpen} onOpenChange={setIsLiveBiddingOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Live Bidding - {selectedAuction?.name}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
            {selectedAuction && (
              isVendor ? (
                <div>
                  <LiveBiddingInterface 
                    auction={selectedAuction}
                    ws={ws}
                    onClose={() => setIsLiveBiddingOpen(false)}
                  />
                  <VendorChallengeView auctionId={selectedAuction.id} />
                </div>
              ) : (
                <LiveAuctionView 
                  auction={selectedAuction}
                  ws={ws}
                  onClose={() => setIsLiveBiddingOpen(false)}
                />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      {!isVendor && (
        <Dialog open={isPODialogOpen} onOpenChange={setIsPODialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Create Purchase Order from Auction</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
              {selectedAuctionForPO && (
                <CreatePOFromAuctionDialog 
                  auction={selectedAuctionForPO}
                  onClose={() => setIsPODialogOpen(false)}
                  onSuccess={() => {
                    setIsPODialogOpen(false);
                    queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
                  }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Auction Details Dialog for Vendors */}
      {isVendor && (
        <Dialog open={isAuctionDetailsOpen} onOpenChange={setIsAuctionDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Auction Details - {selectedAuctionForView?.name}</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
              {selectedAuctionForView && (
                <AuctionDetailsView 
                  auction={selectedAuctionForView}
                  onClose={() => setIsAuctionDetailsOpen(false)}
                  onBidNow={() => {
                    setIsAuctionDetailsOpen(false);
                    handleViewLiveBidding(selectedAuctionForView);
                  }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Terms Acceptance Dialog */}
      {isVendor && (
        <TermsAcceptanceDialog
          open={isTermsDialogOpen}
          onOpenChange={setIsTermsDialogOpen}
          rfxTitle={selectedAuctionForView?.name || ''}
          rfxType="auction"
          termsAndConditionsPath={selectedAuctionForView?.termsAndConditionsPath}
          onAccept={handleTermsAccepted}
          onDecline={handleTermsDeclined}
        />
      )}
    </div>
  );
}

// Auction Details View Component for Vendors
function AuctionDetailsView({ auction, onClose, onBidNow }: { auction: any; onClose: () => void; onBidNow: () => void }) {
  const { data: bomItems = [] } = useQuery({
    queryKey: ["/api/boms", auction.bomId, "items"],
    queryFn: async () => {
      if (!auction.bomId) return [];
      try {
        const itemsResponse = await apiRequest(`/api/boms/${auction.bomId}/items`);
        return Array.isArray(itemsResponse) ? itemsResponse : [];
      } catch (error) {
        console.error("Error fetching BOM items:", error);
        return [];
      }
    },
    enabled: !!auction.bomId,
    retry: false,
  });

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Auction Header */}
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-foreground mb-2">{auction.name}</h2>
        <p className="text-muted-foreground">{auction.description}</p>
        <div className="flex items-center space-x-4 mt-3">
          <Badge className={
            auction.status === 'scheduled' ? 'bg-blue-100 text-blue-700 border-blue-200' :
            auction.status === 'live' ? 'bg-green-100 text-green-700 border-green-200' :
            'bg-gray-100 text-gray-700 border-gray-200'
          }>
            {auction.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Auction Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5" />
              Pricing Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ceiling Price:</span>
              <span className="font-semibold">₹{parseFloat(auction.reservePrice || '0').toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Bid:</span>
              <span className="font-semibold text-green-600">₹{auction.currentBid || 'No bids yet'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Start Time:</span>
              <span className="font-semibold">{formatDateTime(auction.startTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">End Time:</span>
              <span className="font-semibold">{formatDateTime(auction.endTime)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* BOM Items */}
      {bomItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5" />
              Required Items (Bill of Materials)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bomItems.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <div>
                    <div className="font-medium">{item.productName}</div>
                    <div className="text-sm text-muted-foreground">{item.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">Qty: {item.quantity}</div>
                    <div className="text-sm text-muted-foreground">Est. ₹{parseFloat(item.unitPrice || '0').toLocaleString('en-IN')}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Terms & Conditions */}
      {auction.termsAndConditionsPath && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Terms & Conditions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-800 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Terms Acceptance Required</span>
              </div>
              <p className="text-yellow-700 text-sm mb-3">
                You must download, read, and accept the terms & conditions before participating in this auction.
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href={auction.termsAndConditionsPath} target="_blank" rel="noopener noreferrer">
                  <FileText className="w-4 h-4 mr-2" />
                  Download Terms & Conditions
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t">
        {auction.status === 'live' && (
          <Button 
            onClick={onBidNow}
            className="flex-1 bg-green-600 hover:bg-green-700"
            data-testid="button-bid-now"
          >
            <Gavel className="w-4 h-4 mr-2" />
            Start Bidding
          </Button>
        )}
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

// Auction Card Component
function AuctionCard({ auction, onStart, onViewLive, onCreatePO, onViewAuctionDetails, isLive, isVendor }: any) {
  const getRemainingTime = (endTime: string) => {
    const end = new Date(endTime);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return "Ended";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m remaining`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'live': return 'bg-green-100 text-green-700 border-green-200';
      case 'completed': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'closed': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="p-6 hover:bg-muted/50 transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-medium text-foreground">{auction.name}</h3>
            <Badge className={getStatusColor(auction.status)}>
              {auction.status}
            </Badge>
            {isLive && (
              <Badge className="bg-red-100 text-red-700 border-red-200 animate-pulse">
                LIVE
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mb-3">{auction.description}</p>
          <div className="flex items-center space-x-6 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Target className="w-4 h-4" />
              <span>Ceiling: ₹{auction.reservePrice || 'Not set'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <TrendingDown className="w-4 h-4" />
              <span>Current Bid: ₹{auction.currentBid || 'No bids'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>Vendors: {auction.participantCount || 0}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{getRemainingTime(auction.endTime)}</span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2 ml-4">
          {!isVendor && auction.status === 'scheduled' && (
            <>
              <Button variant="ghost" size="sm" onClick={onViewLive} data-testid="button-view-auction">
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>
              <Button variant="ghost" size="sm" onClick={onStart} data-testid="button-start-auction">
                <Play className="w-4 h-4 mr-1" />
                Start
              </Button>
            </>
          )}
          {isVendor && (
            <Button variant="outline" size="sm" onClick={() => onViewAuctionDetails && onViewAuctionDetails(auction)} data-testid="button-view-auction-details">
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
          )}
          {auction.status === 'live' && (
            <Button variant="ghost" size="sm" onClick={onViewLive} data-testid="button-view-live">
              <Eye className="w-4 h-4 mr-1" />
              {isVendor ? "Bid Now" : "View Live"}
            </Button>
          )}
          {(auction.status === 'live' || auction.status === 'completed' || auction.status === 'closed') && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" data-testid="button-view-results">
                  <Trophy className="w-4 h-4 mr-1" />
                  Results
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl w-[90vw] max-h-[85vh] overflow-hidden">
                <DialogHeader className="pb-2">
                  <DialogTitle>Auction Results - {auction.name}</DialogTitle>
                </DialogHeader>
                <div className="overflow-y-auto max-h-[calc(85vh-80px)] pr-2">
                  <AuctionResults auctionId={auction.id} onCreatePO={onCreatePO} />
                </div>
              </DialogContent>
            </Dialog>
          )}
          {!isVendor && (auction.status === 'completed' || auction.status === 'closed') && (
            <Button variant="ghost" size="sm" onClick={() => onCreatePO(auction)} data-testid="button-create-po">
              <ShoppingCart className="w-4 h-4 mr-1" />
              Create Purchase Order
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Create Auction Form Component
function CreateAuctionForm({ onClose, onSuccess, boms, vendors }: any) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    bomId: '',
    ceilingPrice: '',
    startTime: '',
    endTime: '',
    selectedVendors: [] as string[],
    selectedBomItems: [] as string[],
    termsFile: null as File | null,
  });

  const [uploadingTerms, setUploadingTerms] = useState(false);
  const [editableBomItems, setEditableBomItems] = useState<{[key: string]: {quantity: number, unitPrice: number}}>({});

  // Fetch BOM items when a BOM is selected
  const { data: bomItems = [], isLoading: bomItemsLoading, error: bomItemsError } = useQuery({
    queryKey: ["/api/boms", formData.bomId, "items"],
    queryFn: async () => {
      if (!formData.bomId || formData.bomId === 'none') {
        console.log("No BOM ID selected, returning empty array");
        return [];
      }

      console.log("=== AUCTION FORM: Fetching BOM items ===");
      console.log("BOM ID:", formData.bomId);
      console.log("BOM ID type:", typeof formData.bomId);
      console.log("BOM ID length:", formData.bomId.length);

      try {
        // Try the dedicated BOM items endpoint first
        console.log("Trying endpoint: /api/boms/" + formData.bomId + "/items");
        const itemsResponse = await apiRequest(`/api/boms/${formData.bomId}/items`);
        console.log("BOM items response:", itemsResponse);
        console.log("Response type:", typeof itemsResponse);
        console.log("Response is array:", Array.isArray(itemsResponse));
        console.log("Response length:", itemsResponse?.length);

        if (Array.isArray(itemsResponse) && itemsResponse.length > 0) {
          console.log("Found items via items endpoint:", itemsResponse.length);
          console.log("First item sample:", itemsResponse[0]);
          return itemsResponse;
        }

        console.log("No items from items endpoint, trying full BOM endpoint");

        // Fallback: Try getting BOM with items
        const bomResponse = await apiRequest(`/api/boms/${formData.bomId}`);
        console.log("BOM response:", bomResponse);
        console.log("BOM response items:", bomResponse?.items);
        console.log("BOM response items type:", typeof bomResponse?.items);
        console.log("BOM response items is array:", Array.isArray(bomResponse?.items));

        const items = bomResponse?.items || [];
        console.log("Final items array:", items);
        console.log("Final items length:", items.length);

        return items;
      } catch (error) {
        console.error("Error fetching BOM items:", error);
        console.error("Error details:", {
          message: (error as any)?.message,
          status: (error as any)?.status,
          response: (error as any)?.response
        });
        throw error; // Re-throw to trigger error state
      }
    },
    enabled: !!formData.bomId && formData.bomId !== 'none',
    retry: false,
  });

  // Debug log for bomItems state changes
  useEffect(() => {
    console.log("=== AUCTION FORM: bomItems state changed ===");
    console.log("bomItems:", bomItems);
    console.log("bomItems type:", typeof bomItems);
    console.log("bomItems is array:", Array.isArray(bomItems));
    console.log("bomItems length:", bomItems?.length);
    console.log("bomItemsLoading:", bomItemsLoading);
    console.log("bomItemsError:", bomItemsError);
    console.log("formData.bomId:", formData.bomId);
  }, [bomItems, bomItemsLoading, bomItemsError, formData.bomId]);

  const selectedBom = boms.find((bom: any) => bom.id === formData.bomId);

  const createAuctionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          bomId: data.bomId || null,
          bomLineItemId: null,
          selectedBomItems: data.selectedBomItems || [],
          selectedVendors: data.selectedVendors || [],
          reservePrice: data.ceilingPrice,
          startTime: data.startTime ? new Date(data.startTime).toISOString() : null,
          endTime: data.endTime ? new Date(data.endTime).toISOString() : null,
          status: 'scheduled',
          termsUrl: data.termsFile ? 'uploaded' : '',
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      return response.json();
    },
    onSuccess: (auction) => {
      toast({
        title: "Success",
        description: "Auction created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create auction",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name || !formData.description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate start and end times
    if (!formData.startTime || !formData.endTime) {
      toast({
        title: "Error",
        description: "Please specify both start and end times for the auction",
        variant: "destructive",
      });
      return;
    }

    // Validate that end time is after start time
    const startDate = new Date(formData.startTime);
    const endDate = new Date(formData.endTime);
    if (endDate <= startDate) {
      toast({
        title: "Error",
        description: "End time must be after start time",
        variant: "destructive",
      });
      return;
    }

    // Validate Terms & Conditions upload
    if (!formData.termsFile) {
      toast({
        title: "Error", 
        description: "Please upload Terms & Conditions before creating the auction",
        variant: "destructive",
      });
      return;
    }

    createAuctionMutation.mutate(formData);
  };

  const handleVendorToggle = (vendorId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedVendors: prev.selectedVendors.includes(vendorId)
        ? prev.selectedVendors.filter(id => id !== vendorId)
        : [...prev.selectedVendors, vendorId]
    }));
  };

  const handleBomItemToggle = (itemId: string, defaultItem?: any) => {
    setFormData(prev => ({
      ...prev,
      selectedBomItems: prev.selectedBomItems.includes(itemId)
        ? prev.selectedBomItems.filter(id => id !== itemId)
        : [...prev.selectedBomItems, itemId]
    }));

    // Initialize editable values for new selections
    if (!formData.selectedBomItems.includes(itemId) && defaultItem) {
      setEditableBomItems(prev => ({
        ...prev,
        [itemId]: {
          quantity: defaultItem.quantity || 1,
          unitPrice: defaultItem.unitPrice || 0
        }
      }));
    }
  };

  const updateBomItemPrice = (itemId: string, field: 'quantity' | 'unitPrice', value: number) => {
    setEditableBomItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };

  // Calculate total ceiling price from selected BOM items
  const calculateCeilingPrice = () => {
    const total = formData.selectedBomItems.reduce((sum, itemId) => {
      const item = editableBomItems[itemId];
      if (item) {
        return sum + (item.quantity * item.unitPrice);
      }
      return sum;
    }, 0);
    return total.toFixed(2);
  };

  // Auto-update ceiling price when BOM items change
  useEffect(() => {
    if (formData.selectedBomItems.length > 0) {
      const newCeilingPrice = calculateCeilingPrice();
      setFormData(prev => ({ ...prev, ceilingPrice: newCeilingPrice }));
    }
  }, [editableBomItems, formData.selectedBomItems]);

  const handleBomChange = (value: string) => {
    setFormData(prev => ({ 
      ...prev, 
      bomId: value,
      selectedBomItems: [] // Reset selected items when BOM changes
    }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, termsFile: file }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="auction-form">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Auction Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
            data-testid="input-auction-name"
          />
        </div>
        <div>
          <Label htmlFor="bomId">Bill of Materials</Label>
          <Select value={formData.bomId} onValueChange={handleBomChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select BOM (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {boms.map((bom: any) => (
                <SelectItem key={bom.id} value={bom.id}>
                  {bom.name} ({bom.version})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="ceilingPrice">Ceiling Price (₹)</Label>
          <Input
            id="ceilingPrice"
            type="number"
            value={formData.ceilingPrice}
            onChange={(e) => setFormData(prev => ({ ...prev, ceilingPrice: e.target.value }))}
            disabled={formData.selectedBomItems.length > 0}
            className={formData.selectedBomItems.length > 0 ? "bg-gray-100" : ""}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
          />
          {formData.selectedBomItems.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">Auto-calculated from selected BOM items</p>
          )}
        </div>
        <div>
          <Label htmlFor="startTime">Start Time *</Label>
          <Input
            id="startTime"
            type="datetime-local"
            value={formData.startTime}
            onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
            data-testid="input-start-time"
          />
        </div>
        <div>
          <Label htmlFor="endTime">End Time *</Label>
          <Input
            id="endTime"
            type="datetime-local"
            value={formData.endTime}
            onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
            data-testid="input-end-time"
          />
        </div>
      </div>

      {/* BOM Items Selection */}
      {formData.bomId && formData.bomId !== 'none' && selectedBom && (
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base font-medium">BOM Items for Auction</Label>
            <Badge variant="outline">{selectedBom.name} ({selectedBom.version})</Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Select specific items from this BOM to include in the auction:
          </p>
          {bomItemsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Loading BOM items...</p>
            </div>
          ) : bomItemsError ? (
            <div className="text-center py-8">
              <p className="text-sm text-red-600">Error loading BOM items</p>
              <p className="text-xs text-gray-400 mt-2">
                Error: {bomItemsError?.message || 'Unknown error'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                BOM ID: {formData.bomId}
              </p>
            </div>
          ) : !bomItems || bomItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No items found in this BOM</p>
              <p className="text-xs text-gray-400 mt-2">Please add items to this BOM first or select a different BOM.</p>
              <div className="text-xs text-gray-300 mt-4 p-2 bg-gray-50 rounded">
                <p>Debug info:</p>
                <p>BOM ID: {formData.bomId}</p>
                <p>bomItems: {JSON.stringify(bomItems)}</p>
                <p>Loading: {String(bomItemsLoading)}</p>
                <p>Error: {(bomItemsError as any)?.message || 'None'}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {bomItems.map((item: any) => (
                <div key={item.id} className="p-3 border rounded hover:bg-muted/50">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id={`bom-item-${item.id}`}
                      checked={formData.selectedBomItems.includes(item.id)}
                      onChange={() => handleBomItemToggle(item.id, item)}
                      className="rounded mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <Label htmlFor={`bom-item-${item.id}`} className="text-sm font-medium">
                            {item.itemName}
                          </Label>
                          {item.itemCode && (
                            <p className="text-xs text-muted-foreground">Code: {item.itemCode}</p>
                          )}
                          {item.specifications && typeof item.specifications === 'string' && (
                            <p className="text-xs text-muted-foreground mt-1">{item.specifications}</p>
                          )}
                          {item.specifications && typeof item.specifications === 'object' && Object.keys(item.specifications).length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {Object.entries(item.specifications).map(([key, value]) => `${key}: ${value}`).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Editable quantity and price for selected items */}
                      {formData.selectedBomItems.includes(item.id) && (
                        <div className="grid grid-cols-3 gap-2 mt-2 p-2 bg-blue-50 rounded">
                          <div>
                            <Label className="text-xs">Quantity</Label>
                            <Input
                              type="number"
                              value={editableBomItems[item.id]?.quantity || item.quantity || 1}
                              onChange={(e) => updateBomItemPrice(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm"
                              min="1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Unit Price (₹)</Label>
                            <Input
                              type="number"
                              value={editableBomItems[item.id]?.unitPrice || item.unitPrice || 0}
                              onChange={(e) => updateBomItemPrice(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm"
                              min="0"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Total</Label>
                            <div className="h-8 px-2 bg-gray-100 rounded text-sm flex items-center">
                              ₹{((editableBomItems[item.id]?.quantity || item.quantity || 1) * 
                                (editableBomItems[item.id]?.unitPrice || item.unitPrice || 0)).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Display calculated ceiling price */}
          {formData.selectedBomItems.length > 0 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
              <div className="flex justify-between items-center">
                <span className="font-medium text-green-800">Total Ceiling Price:</span>
                <span className="text-lg font-bold text-green-600">₹{calculateCeilingPrice()}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Terms & Conditions Upload */}
      <div className="space-y-3">
        <Label>Terms & Conditions *</Label>
        <p className="text-sm text-muted-foreground">
          Upload terms and conditions that vendors must accept before bidding
        </p>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById('terms-upload')?.click()}
            className="flex items-center gap-2"
            data-testid="button-upload-terms"
          >
            <Upload className="w-4 h-4" />
            Upload Terms & Conditions
          </Button>
          {formData.termsFile && (
            <span className="text-sm text-green-600 dark:text-green-400">
              ✓ {formData.termsFile.name}
            </span>
          )}
        </div>
        <input
          id="terms-upload"
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Invite Vendors */}
      <div className="space-y-3">
        <Label>Invite Vendors</Label>
        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
          {vendors.map((vendor: any) => (
            <div key={vendor.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`vendor-${vendor.id}`}
                checked={formData.selectedVendors.includes(vendor.id)}
                onChange={() => handleVendorToggle(vendor.id)}
                className="rounded border-gray-300"
              />
              <Label htmlFor={`vendor-${vendor.id}`} className="text-sm cursor-pointer">
                {vendor.companyName}
              </Label>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Selected: {formData.selectedVendors.length} vendors
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={createAuctionMutation.isPending}
          data-testid="button-create-auction"
        >
          {createAuctionMutation.isPending ? "Creating..." : "Create Auction"}
        </Button>
      </div>
    </form>
  );
}

// Live Auction View Component (for buyers - read-only view)
function LiveAuctionView({ auction, ws, onClose }: any) {
  const [bids, setBids] = useState<any[]>([]);
  const [currentBid, setCurrentBid] = useState('0');

  const { data: auctionBids = [] } = useQuery({
    queryKey: ["/api/auctions", auction.id, "bids"],
    queryFn: () => apiRequest(`/api/auctions/${auction.id}/bids`),
    refetchInterval: 2000, // Refresh every 2 seconds
    retry: false,
  });

  useEffect(() => {
    setBids(auctionBids);
    if (auctionBids.length > 0) {
      const lowestBid = auctionBids.reduce((lowest: any, bid: any) => 
        parseFloat(bid.amount) < parseFloat(lowest.amount) ? bid : lowest
      );
      setCurrentBid(lowestBid.amount);
    }
  }, [auctionBids]);

  const getRemainingTime = (endTime: string) => {
    const end = new Date(endTime);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return "Auction Ended";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatBidDateTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const [challengeAmount, setChallengeAmount] = useState('');
  const [challengeNotes, setChallengeNotes] = useState('');
  const [extensionDuration, setExtensionDuration] = useState('');
  const [extensionReason, setExtensionReason] = useState('');
  const [selectedBidForChallenge, setSelectedBidForChallenge] = useState<any>(null);
  const [isExtendDialogOpen, setIsExtendDialogOpen] = useState(false);
  const [isChallengeDialogOpen, setIsChallengeDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user can send challenges and extend auctions
  const canManageAuction = ['sourcing_exec', 'sourcing_manager', 'admin'].includes((user as any)?.role || '');

  // Fetch counter prices for sourcing executives
  const { data: counterPrices = [] } = useQuery({
    queryKey: ["/api/auctions", auction.id, "counter-prices"],
    queryFn: () => apiRequest(`/api/auctions/${auction.id}/counter-prices`),
    refetchInterval: 3000,
    retry: false,
    enabled: canManageAuction
  });

  // Create challenge price mutation
  const challengePriceMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/auctions/${auction.id}/challenge-price`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Challenge price sent successfully" });
      setIsChallengeDialogOpen(false);
      setChallengeAmount('');
      setChallengeNotes('');
      setSelectedBidForChallenge(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to send challenge price",
        variant: "destructive"
      });
    }
  });

  // Extend auction mutation
  const extendAuctionMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/auctions/${auction.id}/extend`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Auction extended successfully" });
      setIsExtendDialogOpen(false);
      setExtensionDuration('');
      setExtensionReason('');
      queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to extend auction",
        variant: "destructive"
      });
    }
  });

  const handleSendChallenge = (bid: any) => {
    setSelectedBidForChallenge(bid);
    setIsChallengeDialogOpen(true);
  };

  const submitChallenge = () => {
    if (!selectedBidForChallenge || !challengeAmount) return;

    challengePriceMutation.mutate({
      bidId: selectedBidForChallenge.id,
      vendorId: selectedBidForChallenge.vendorId,
      challengeAmount: parseFloat(challengeAmount),
      notes: challengeNotes
    });
  };

  const submitExtension = () => {
    if (!extensionDuration) return;

    extendAuctionMutation.mutate({
      durationMinutes: parseInt(extensionDuration),
      reason: extensionReason
    });
  };

  // Counter price response mutation
  const respondToCounterMutation = useMutation({
    mutationFn: async ({ counterId, action }: { counterId: string; action: 'accept' | 'reject' }) => {
      return apiRequest(`/api/auctions/${auction.id}/counter-prices/${counterId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (_, { action }) => {
      toast({ title: "Success", description: `Counter price ${action}ed successfully` });
      queryClient.invalidateQueries({ queryKey: ["/api/auctions", auction.id, "counter-prices"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to respond to counter price",
        variant: "destructive"
      });
    }
  });

  return (
    <div className="space-y-6">
      {/* Auction Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">₹{currentBid}</div>
              <div className="text-sm text-muted-foreground">Current Best Bid</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">₹{auction.reservePrice || '0'}</div>
              <div className="text-sm text-muted-foreground">Ceiling Price</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{getRemainingTime(auction.endTime)}</div>
              <div className="text-sm text-muted-foreground">Time Remaining</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auction Management Controls */}
      {canManageAuction && (
        <Card>
          <CardHeader>
            <CardTitle>Auction Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <Button 
                onClick={() => setIsExtendDialogOpen(true)}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Clock className="w-4 h-4" />
                <span>Extend Auction</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Counter Prices Section for Sourcing Executives */}
      {canManageAuction && counterPrices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5" />
              <span>Counter Offers</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {counterPrices.map((counter: any) => (
                <div key={counter.id} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">
                        Counter Offer: ₹{parseFloat(counter.counterAmount).toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        From {counter.vendorCompanyName || 'Vendor'} on {new Date(counter.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Original challenge: ₹{parseFloat(counter.originalChallengeAmount || 0).toFixed(2)}
                      </div>
                      {counter.notes && (
                        <div className="text-sm mt-2 p-2 bg-white rounded border">
                          <strong>Notes:</strong> {counter.notes}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {counter.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => respondToCounterMutation.mutate({ counterId: counter.id, action: 'accept' })}
                            disabled={respondToCounterMutation.isPending}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => respondToCounterMutation.mutate({ counterId: counter.id, action: 'reject' })}
                            disabled={respondToCounterMutation.isPending}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {counter.status !== 'pending' && (
                        <Badge variant={counter.status === 'accepted' ? 'secondary' : 'destructive'}>
                          {counter.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Bid History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingDown className="w-5 h-5" />
            <span>Live Bid History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {bids.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                No bids placed yet
              </div>
            ) : (
              (() => {
                // Sort bids by amount (lowest first for ranking)
                const sortedByAmount = [...bids].sort((a: any, b: any) => parseFloat(a.amount) - parseFloat(b.amount));

                // Sort bids by timestamp (latest first for display)
                const sortedByTime = [...bids].sort((a: any, b: any) => new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime());

                return sortedByTime.map((bid: any, index: number) => {
                  // Find the ranking based on amount
                  const rankIndex = sortedByAmount.findIndex(b => b.id === bid.id);

                  return (
                    <div key={bid.id} className="flex justify-between items-center p-3 bg-muted/30 rounded">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {bid.vendorCompanyName?.[0] || 'V'}
                        </div>
                        <div>
                          <div className="font-medium">{bid.vendorCompanyName || 'Vendor'}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatBidDateTime(bid.timestamp || bid.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">₹{parseFloat(bid.amount).toFixed(2)}</div>
                        <div className="flex items-center space-x-2">
                          {canManageAuction && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendChallenge(bid)}
                              className="text-xs h-6"
                            >
                              Challenge
                            </Button>
                          )}
                          {index === 0 && (
                            <Badge variant="secondary" className="text-xs">Latest</Badge>
                          )}
                          <Badge className={`text-xs ${
                            rankIndex === 0 ? 'bg-green-100 text-green-700 border-green-200' :
                            rankIndex === 1 ? 'bg-blue-100 text-blue-700 border-blue-200' :
                            rankIndex === 2 ? 'bg-orange-100 text-orange-700 border-orange-200' :
                            'bg-gray-100 text-gray-700 border-gray-200'
                          }`}>
                            L{rankIndex + 1}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </div>
        </CardContent>
      </Card>

      {/* Buyer Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-blue-700">
            <Eye className="w-5 h-5" />
            <span className="font-medium">Buyer View</span>
          </div>
          <p className="text-blue-600 text-sm mt-2">
            You are viewing this auction as a buyer. Vendors can place bids in real-time. 
            {auction.status === 'completed' && " The auction has ended - you can now create a Purchase Order."}
          </p>
        </CardContent>
      </Card>

      {/* Challenge Price Dialog */}
      <Dialog open={isChallengeDialogOpen} onOpenChange={setIsChallengeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Challenge Price</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vendor: {selectedBidForChallenge?.vendorCompanyName}</Label>
              <p className="text-sm text-muted-foreground">Current bid: ₹{selectedBidForChallenge?.amount}</p>
            </div>
            <div>
              <Label htmlFor="challenge-amount">Challenge Amount (₹)</Label>
              <Input
                id="challenge-amount"
                type="number"
                value={challengeAmount}
                onChange={(e) => setChallengeAmount(e.target.value)}
                placeholder="Enter challenge price"
              />
            </div>
            <div>
              <Label htmlFor="challenge-notes">Notes (Optional)</Label>
              <Textarea
                id="challenge-notes"
                value={challengeNotes}
                onChange={(e) => setChallengeNotes(e.target.value)}
                placeholder="Add notes for the vendor"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsChallengeDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={submitChallenge}
                disabled={!challengeAmount || challengePriceMutation.isPending}
              >
                {challengePriceMutation.isPending ? "Sending..." : "Send Challenge"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Extend Auction Dialog */}
      <Dialog open={isExtendDialogOpen} onOpenChange={setIsExtendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Auction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current end time: {new Date(auction.endTime).toLocaleString()}</Label>
            </div>
            <div>
              <Label htmlFor="extension-duration">Extension Duration (minutes)</Label>
              <Input
                id="extension-duration"
                type="number"
                value={extensionDuration}
                onChange={(e) => setExtensionDuration(e.target.value)}
                placeholder="Enter minutes to extend"
              />
            </div>
            <div>
              <Label htmlFor="extension-reason">Reason</Label>
              <Textarea
                id="extension-reason"
                value={extensionReason}
                onChange={(e) => setExtensionReason(e.target.value)}
                placeholder="Reason for extending the auction"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsExtendDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={submitExtension}
                disabled={!extensionDuration || extendAuctionMutation.isPending}
              >
                {extendAuctionMutation.isPending ? "Extending..." : "Extend Auction"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Live Bidding Interface Component
function LiveBiddingInterface({ auction, ws, onClose }: any) {
  const [currentBid, setCurrentBid] = useState('');
  const [bids, setBids] = useState<any[]>([]);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterNotes, setCounterNotes] = useState('');
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [isCounterDialogOpen, setIsCounterDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch current bids
  const { data: auctionBids = [] } = useQuery({
    queryKey: ["/api/auctions", auction.id, "bids"],
    queryFn: () => apiRequest(`/api/auctions/${auction.id}/bids`),
    refetchInterval: 2000, // Refresh every 2 seconds
    retry: false,
  });

  // Fetch challenge prices for this vendor
  const { data: challengePrices = [] } = useQuery({
    queryKey: ["/api/auctions", auction.id, "challenge-prices"],
    queryFn: () => apiRequest(`/api/auctions/${auction.id}/challenge-prices`),
    refetchInterval: 3000, // Refresh every 3 seconds
    retry: false,
  });

  useEffect(() => {
    setBids(auctionBids);
  }, [auctionBids]);

  // Challenge price response mutations
  const respondToChallengeMutation = useMutation({
    mutationFn: async ({ challengeId, action }: { challengeId: string; action: 'accept' | 'reject' }) => {
      return apiRequest(`/api/auctions/${auction.id}/challenge-prices/${challengeId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (_, { action }) => {
      toast({ title: "Success", description: `Challenge price ${action}ed successfully` });
      queryClient.invalidateQueries({ queryKey: ["/api/auctions", auction.id, "challenge-prices"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to respond to challenge price",
        variant: "destructive"
      });
    }
  });

  // Counter price mutation
  const counterPriceMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/auctions/${auction.id}/counter-price`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Counter price sent successfully" });
      setIsCounterDialogOpen(false);
      setCounterAmount('');
      setCounterNotes('');
      setSelectedChallenge(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to send counter price",
        variant: "destructive"
      });
    }
  });

  const handleSendCounter = (challenge: any) => {
    setSelectedChallenge(challenge);
    setIsCounterDialogOpen(true);
  };

  const submitCounter = () => {
    if (!selectedChallenge || !counterAmount) return;

    counterPriceMutation.mutate({
      challengeId: selectedChallenge.id,
      counterAmount: parseFloat(counterAmount),
      notes: counterNotes
    });
  };

  const formatBidDateTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Get current user's ranking
  const getCurrentUserRanking = () => {
    const sortedBids = [...bids].sort((a: any, b: any) => parseFloat(a.amount) - parseFloat(b.amount));
    const userBids = sortedBids.filter((bid: any) => bid.vendorId === (user as any)?.id);
    if (userBids.length === 0) return null;

    const bestUserBid = userBids[0];
    const rankIndex = sortedBids.findIndex(bid => bid.id === bestUserBid.id);
    return rankIndex + 1;
  };

  const userRanking = getCurrentUserRanking();

  const submitBid = async () => {
    if (!currentBid) return;

    const bidAmount = parseFloat(currentBid);
    if (isNaN(bidAmount) || bidAmount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid bid amount",
        variant: "destructive",
      });
      return;
    }

    // Validate bid amount against ceiling price
    const ceilingPrice = parseFloat(auction.reservePrice || '0');
    if (ceilingPrice > 0 && bidAmount >= ceilingPrice) {
      toast({
        title: "Error",
        description: `Bid amount must be less than ceiling price of ₹${ceilingPrice.toLocaleString('en-IN')}`,
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/auctions/${auction.id}/bid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: bidAmount }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to place bid" }));
        throw new Error(errorData.message || "Failed to place bid");
      }

      const result = await response.json();

      toast({
        title: "Success",
        description: "Your bid has been placed successfully",
      });

      setCurrentBid('');

      // Refresh bids immediately using query client
      queryClient.invalidateQueries({ queryKey: ["/api/auctions", auction.id, "bids"] });

    } catch (error: any) {
      console.error("Bid submission error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to place bid",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">₹{bids.length > 0 ? Math.min(...bids.map(b => parseFloat(b.amount))).toFixed(2) : '0'}</div>
              <div className="text-sm text-muted-foreground">Current Best Bid</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">₹{auction.reservePrice || '0'}</div>
              <div className="text-sm text-muted-foreground">Ceiling Price</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{bids.length}</div>
              <div className="text-sm text-muted-foreground">Total Bids</div>
            </div>
          </CardContent>
        </Card>
        <Card className={userRanking ? (userRanking <= 3 ? 'border-green-200 bg-green-50' : 'border-gray-200') : 'border-gray-200'}>
          <CardContent className="p-4">
            <div className="text-center">
              {userRanking ? (
                <>
                  <div className={`text-2xl font-bold ${
                    userRanking === 1 ? 'text-green-600' :
                    userRanking === 2 ? 'text-blue-600' :
                    userRanking === 3 ? 'text-orange-600' :
                    'text-gray-600'
                  }`}>L{userRanking}</div>
                  <div className="text-sm text-muted-foreground">Your Ranking</div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-gray-400">-</div>
                  <div className="text-sm text-muted-foreground">No Bids Yet</div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex space-x-4">
          <div className="flex-1">
            <Input
              type="number"
              placeholder="Enter your bid amount"
              value={currentBid}
              onChange={(e) => setCurrentBid(e.target.value)}
              step="0.01"
              min="0"
              max={auction.reservePrice ? parseFloat(auction.reservePrice) - 0.01 : undefined}
            />
            <div className="text-sm text-muted-foreground mt-1">
              {auction.reservePrice && (
                <span>Must be less than ceiling price of ₹{parseFloat(auction.reservePrice).toLocaleString('en-IN')}</span>
              )}
            </div>
          </div>
          <Button 
            onClick={submitBid}
            disabled={!currentBid || parseFloat(currentBid || '0') <= 0 || 
                     (auction.reservePrice && parseFloat(currentBid || '0') >= parseFloat(auction.reservePrice))}
          >
            Submit Bid
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingDown className="w-5 h-5" />
            <span>Live Bid History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {bids.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                No bids placed yet
              </div>
            ) : (
              (() => {
                // Sort bids by amount (lowest first for ranking)
                const sortedByAmount = [...bids].sort((a: any, b: any) => parseFloat(a.amount) - parseFloat(b.amount));

                // Sort bids by timestamp (latest first for display)
                const sortedByTime = [...bids].sort((a: any, b: any) => new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime());

                return sortedByTime.map((bid: any, index: number) => {
                  // Find the ranking based on amount
                  const rankIndex = sortedByAmount.findIndex(b => b.id === bid.id);
                  
                  // Debug logging
                  console.log('=== BID COMPARISON DEBUG ===');
                  console.log('bid.vendorId:', bid.vendorId);
                  console.log('user:', user);
                  console.log('user.vendorId:', (user as any)?.vendorId);
                  console.log('user.id:', (user as any)?.id);
                  console.log('user.role:', (user as any)?.role);
                  
                  // Try both vendorId and id for comparison
                  const isCurrentUser = bid.vendorId === (user as any)?.vendorId || 
                                       bid.vendorId === (user as any)?.id;

                  return (
                    <div key={bid.id} className={`flex justify-between items-center p-3 rounded ${
                      isCurrentUser ? 'bg-blue-50 border border-blue-200' : 'bg-muted/30'
                    }`}>
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          isCurrentUser ? 'bg-blue-500 text-white' : 'bg-primary text-white'
                        }`}>
                          {isCurrentUser ? 'You' : 
                           ((user as any)?.role === 'vendor' ? 'V' : (bid.vendorCompanyName?.[0] || 'V'))}
                        </div>
                        <div>
                          <div className="font-medium">
                            {isCurrentUser ? 'Your Bid' : 
                             ((user as any)?.role === 'vendor' ? 'Vendor' : (bid.vendorCompanyName || 'Vendor'))}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatBidDateTime(bid.timestamp || bid.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">₹{parseFloat(bid.amount).toFixed(2)}</div>
                        <div className="flex items-center space-x-2">
                          {index === 0 && (
                            <Badge variant="secondary" className="text-xs">Latest</Badge>
                          )}
                          {/* Only show L-ranking for top 3 positions */}
                          {rankIndex < 3 && (
                            <Badge className={`text-xs ${
                              rankIndex === 0 ? 'bg-green-100 text-green-700 border-green-200' :
                              rankIndex === 1 ? 'bg-blue-100 text-blue-700 border-blue-200' :
                              'bg-orange-100 text-orange-700 border-orange-200'
                            }`}>
                              L{rankIndex + 1}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </div>
        </CardContent>
      </Card>

      {/* Challenge Prices Section */}
      {challengePrices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Challenge Prices</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {challengePrices.map((challenge: any) => (
                <div key={challenge.id} className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">Challenge Price: ₹{parseFloat(challenge.challengeAmount).toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">
                        Sent by sourcing team on {new Date(challenge.createdAt).toLocaleDateString()}
                      </div>
                      {challenge.notes && (
                        <div className="text-sm mt-2 p-2 bg-white rounded border">
                          <strong>Notes:</strong> {challenge.notes}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {challenge.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => respondToChallengeMutation.mutate({ challengeId: challenge.id, action: 'accept' })}
                            disabled={respondToChallengeMutation.isPending}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => respondToChallengeMutation.mutate({ challengeId: challenge.id, action: 'reject' })}
                            disabled={respondToChallengeMutation.isPending}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSendCounter(challenge)}
                          >
                            Counter Offer
                          </Button>
                        </>
                      )}
                      {challenge.status !== 'pending' && (
                        <Badge variant={challenge.status === 'accepted' ? 'secondary' : 'destructive'}>
                          {challenge.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Counter Price Dialog */}
      <Dialog open={isCounterDialogOpen} onOpenChange={setIsCounterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Counter Price</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Challenge Amount: ₹{selectedChallenge?.challengeAmount}</Label>
              <p className="text-sm text-muted-foreground">Respond with your counter offer</p>
            </div>
            <div>
              <Label htmlFor="counter-amount">Counter Amount (₹)</Label>
              <Input
                id="counter-amount"
                type="number"
                value={counterAmount}
                onChange={(e) => setCounterAmount(e.target.value)}
                placeholder="Enter counter price"
              />
            </div>
            <div>
              <Label htmlFor="counter-notes">Notes (Optional)</Label>
              <Textarea
                id="counter-notes"
                value={counterNotes}
                onChange={(e) => setCounterNotes(e.target.value)}
                placeholder="Add notes for your counter offer"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCounterDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={submitCounter}
                disabled={!counterAmount || counterPriceMutation.isPending}
              >
                {counterPriceMutation.isPending ? "Sending..." : "Send Counter Offer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}