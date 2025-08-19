import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Clock, 
  TrendingDown, 
  Users, 
  MapPin, 
  Truck, 
  Package2, 
  Volume2, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Send,
  Calendar,
  Plus
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';

interface Bid {
  id: string;
  auctionId: string;
  vendorId: string;
  amount: string;
  submittedAt: string;
  vendor?: {
    id: string;
    companyName: string;
    email: string;
    phone: string;
    address: string;
  };
}

interface ChallengePrice {
  id: string;
  auctionId: string;
  vendorId: string;
  bidId: string;
  proposedPrice: string;
  reason: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  createdBy: string;
}

interface CounterPrice {
  id: string;
  challengePriceId: string;
  proposedPrice: string;
  reason: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

interface AuctionExtension {
  id: string;
  auctionId: string;
  previousEndTime: string;
  newEndTime: string;
  reason: string;
  createdBy: string;
  createdAt: string;
}

const LANE_DETAILS = [
  {
    id: 'L1',
    route: 'Mumbai → Gurugram',
    pickup: '0 Pickups • 0 Drops',
    vehicle: 'HCVs-Multi Axle-(10 Wheeler)',
    capacity: '21 MT',
    dataBody: 'Data body',
    volume: '20 MT',
    lpp: '₹ --/MT',
    asp: '₹ --/MT',
    participation: '66.6 %',
    ceilingPrice: '₹ 30000/MT',
    biddingCompetency: 'Medium',
    distance: '1472 Kms • 5 Days'
  },
  {
    id: 'L2',
    route: 'Pune → Chennai',
    pickup: '1 Pickup • 0 Drops',
    vehicle: 'HCVs-Multi Axle-(10 Wheeler)',
    capacity: '25 MT',
    dataBody: 'Data body',
    volume: '25 MT',
    lpp: '₹ --/MT',
    asp: '₹ --/MT',
    participation: '99.9 %',
    ceilingPrice: '₹ 40000/MT',
    biddingCompetency: 'Medium',
    distance: '1000 Kms • 4 Days'
  }
];

const VENDOR_BIDS = [
  {
    laneId: 'L1',
    vendor: 'Acer',
    address: 'Warehouse: 302.508.252.521',
    bidPrice: '₹ 20000/MT',
    savings: '33.33% • ₹ 9000',
    challengePrice: '₹ 19000/MT',
    challengeStatus: 'Accepted',
    letterOfIntent: '₹ 19000/MT',
    loiStatus: 'Accepted',
    color: 'green'
  },
  {
    laneId: 'L1',
    vendor: 'Lenovo',
    address: 'Warehouse: 302.508.252.521',
    bidPrice: '₹ 26000/MT',
    savings: '13.33% • ₹ 4000',
    challengePrice: null,
    challengeStatus: null,
    letterOfIntent: null,
    loiStatus: null,
    color: 'orange',
    actions: ['Cancel LOI', 'LOI Sent']
  },
  {
    laneId: 'L2',
    vendor: 'Acer',
    address: 'Address: 302.508.252.521',
    bidPrice: '₹ 28000/MT',
    savings: '30.00% • ₹ 6000',
    challengePrice: '₹ 30000/MT',
    challengeStatus: 'Rejected',
    counterPrice: '₹ 27000/MT',
    counterStatus: 'Accepted',
    letterOfIntent: '₹ 27000/MT',
    loiStatus: 'Accepted',
    color: 'green'
  },
  {
    laneId: 'L2',
    vendor: 'Lenovo',
    address: 'Address: 302.508.252.521',
    bidPrice: '₹ 37000/MT',
    savings: '7.50% • ₹ 3000',
    challengePrice: '',
    challengeStatus: null,
    counterPrice: null,
    counterStatus: null,
    letterOfIntent: null,
    loiStatus: null,
    color: 'default',
    showChallengePriceInput: true
  }
];

export default function AuctionResults() {
  const [match, params] = useRoute('/auctions/:id/results');
  const auctionId = params?.id;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [challengePrices, setChallengePrices] = useState<{ [key: string]: string }>({});
  const [challengeReasons, setChallengeReasons] = useState<{ [key: string]: string }>({});
  const [extendAuctionTime, setExtendAuctionTime] = useState('');
  const [extendReason, setExtendReason] = useState('');

  // Fetch auction details
  const { data: auction } = useQuery({
    queryKey: ['/api/auctions', auctionId],
    enabled: !!auctionId
  });

  // Fetch auction bids
  const { data: bids = [] } = useQuery({
    queryKey: ['/api/auctions', auctionId, 'bids'],
    enabled: !!auctionId
  });

  // Fetch challenge prices
  const { data: challengePricesData = [] } = useQuery({
    queryKey: ['/api/auctions', auctionId, 'challenge-prices'],
    enabled: !!auctionId
  });

  // Fetch auction extensions
  const { data: extensions = [] } = useQuery({
    queryKey: ['/api/auctions', auctionId, 'extensions'],
    enabled: !!auctionId
  });

  // Create challenge price mutation
  const createChallengeMutation = useMutation({
    mutationFn: async (data: { vendorId: string; bidId: string; proposedPrice: string; reason: string }) => {
      return apiRequest(`/api/auctions/${auctionId}/challenge-price`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auctions', auctionId, 'challenge-prices'] });
      setChallengePrices({});
      setChallengeReasons({});
    }
  });

  // Extend auction mutation
  const extendAuctionMutation = useMutation({
    mutationFn: async (data: { newEndTime: string; reason: string }) => {
      return apiRequest(`/api/auctions/${auctionId}/extend`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auctions', auctionId] });
      queryClient.invalidateQueries({ queryKey: ['/api/auctions', auctionId, 'extensions'] });
      setExtendAuctionTime('');
      setExtendReason('');
    }
  });

  const handleChallengePrice = (vendorId: string, bidId: string) => {
    const key = `${vendorId}-${bidId}`;
    const proposedPrice = challengePrices[key];
    const reason = challengeReasons[key];

    if (!proposedPrice || !reason) return;

    createChallengeMutation.mutate({
      vendorId,
      bidId,
      proposedPrice,
      reason
    });
  };

  const handleExtendAuction = () => {
    if (!extendAuctionTime || !extendReason) return;

    extendAuctionMutation.mutate({
      newEndTime: extendAuctionTime,
      reason: extendReason
    });
  };

  const isSourceingRole = (user as any)?.role === 'sourcing_exec' || (user as any)?.role === 'sourcing_manager';

  if (!match || !auctionId) {
    return <div>Auction not found</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              10015-04-06-2025 • Spot Contract
            </h1>
            <p className="text-muted-foreground">
              04 Jun, 2025 | 12:40 PM - 04 Jun, 2025 | 12:52 PM
            </p>
          </div>
          <div className="flex gap-2">
            {isSourceingRole && (
              <>
                <Button variant="outline">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Close Auction
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Clock className="w-4 h-4 mr-2" />
                      Extend Auction
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Extend Auction</DialogTitle>
                      <DialogDescription>
                        Extend the auction end time
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">New End Time</label>
                        <Input
                          type="datetime-local"
                          value={extendAuctionTime}
                          onChange={(e) => setExtendAuctionTime(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Reason</label>
                        <Textarea
                          placeholder="Enter reason for extension..."
                          value={extendReason}
                          onChange={(e) => setExtendReason(e.target.value)}
                        />
                      </div>
                      <Button 
                        onClick={handleExtendAuction}
                        className="w-full"
                        disabled={extendAuctionMutation.isPending}
                      >
                        Extend Auction
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button>
                  <Calendar className="w-4 h-4 mr-2" />
                  Auction History
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input 
          placeholder="Search by origin, destination, vendor"
          className="max-w-md"
        />
      </div>

      {/* Lane Details */}
      {LANE_DETAILS.map((lane, laneIndex) => (
        <Card key={lane.id} className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="px-3 py-1 text-sm font-semibold">
                  {lane.id}
                </Badge>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{lane.route}</span>
                </div>
                <span className="text-sm text-muted-foreground">{lane.pickup}</span>
              </div>
            </div>

            <div className="grid grid-cols-8 gap-4 mb-4 text-sm">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-500" />
                <span>{lane.vehicle}</span>
              </div>
              <div className="flex items-center gap-2">
                <Package2 className="w-4 h-4 text-green-500" />
                <span>Capacity: {lane.capacity}</span>
              </div>
              <div>
                <span>{lane.dataBody}</span>
              </div>
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-orange-500" />
                <span>Volume: {lane.volume}</span>
              </div>
              <div>
                <span>LPP: {lane.lpp}</span>
              </div>
              <div>
                <span>ASP: {lane.asp}</span>
              </div>
              <div>
                <span>Participation: {lane.participation}</span>
              </div>
              <div>
                <Badge 
                  variant={lane.biddingCompetency === 'Medium' ? 'secondary' : 'default'}
                  className="text-xs"
                >
                  Bidding Competency: {lane.biddingCompetency}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{lane.distance}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Ceiling Price:</span>
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                  {lane.ceilingPrice}
                </Badge>
              </div>
            </div>

            {/* Vendor Bids */}
            <div className="space-y-3">
              {VENDOR_BIDS.filter(bid => bid.laneId === lane.id).map((bid, bidIndex) => (
                <div key={bidIndex} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <div className="font-medium">{bid.vendor}</div>
                        <div className="text-muted-foreground">{bid.address}</div>
                      </div>
                      <div className={`px-3 py-2 rounded ${
                        bid.color === 'green' 
                          ? 'bg-green-100 text-green-800 border border-green-300' 
                          : bid.color === 'orange'
                          ? 'bg-orange-100 text-orange-800 border border-orange-300'
                          : 'bg-gray-100 text-gray-800 border border-gray-300'
                      }`}>
                        <div className="font-semibold">{bid.bidPrice}</div>
                        <div className="text-xs">Savings: {bid.savings}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Challenge Price */}
                      {bid.challengePrice && (
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground mb-1">Challenge Price</div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{bid.challengePrice}</span>
                            <Badge 
                              variant={bid.challengeStatus === 'Accepted' ? 'default' : 'destructive'}
                              className={
                                bid.challengeStatus === 'Accepted' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }
                            >
                              {bid.challengeStatus}
                            </Badge>
                          </div>
                        </div>
                      )}

                      {/* Challenge Price Input */}
                      {bid.showChallengePriceInput && isSourceingRole && (
                        <div className="flex items-center gap-2">
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground mb-1">Challenge Price</div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">₹</span>
                              <Input 
                                className="w-20 h-8 text-center"
                                placeholder="0"
                                value={challengePrices[`${bid.vendor}-${bidIndex}`] || ''}
                                onChange={(e) => setChallengePrices(prev => ({
                                  ...prev,
                                  [`${bid.vendor}-${bidIndex}`]: e.target.value
                                }))}
                              />
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            className="h-8 px-3"
                            onClick={() => handleChallengePrice(bid.vendor, `bid-${bidIndex}`)}
                            disabled={!challengePrices[`${bid.vendor}-${bidIndex}`]}
                          >
                            Send CP
                          </Button>
                        </div>
                      )}

                      {/* Counter Price */}
                      {bid.counterPrice && (
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground mb-1">Counter Price</div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{bid.counterPrice}</span>
                            <Badge 
                              variant={bid.counterStatus === 'Accepted' ? 'default' : 'destructive'}
                              className={
                                bid.counterStatus === 'Accepted' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }
                            >
                              {bid.counterStatus}
                            </Badge>
                          </div>
                        </div>
                      )}

                      {/* Letter of Intent */}
                      {bid.letterOfIntent && (
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground mb-1">Letter of Intent</div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{bid.letterOfIntent}</span>
                            <Badge 
                              variant={bid.loiStatus === 'Accepted' ? 'default' : 'destructive'}
                              className={
                                bid.loiStatus === 'Accepted' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }
                            >
                              {bid.loiStatus}
                            </Badge>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      {bid.actions && isSourceingRole && (
                        <div className="flex gap-2">
                          {bid.actions.map((action, actionIndex) => (
                            <Button 
                              key={actionIndex}
                              variant={action === 'Cancel LOI' ? 'destructive' : 'default'}
                              size="sm"
                              className="h-8 px-3 text-xs"
                            >
                              {action}
                            </Button>
                          ))}
                        </div>
                      )}

                      {/* Send LOI Button */}
                      {!bid.letterOfIntent && !bid.actions && isSourceingRole && (
                        <Button size="sm" className="h-8 px-3 text-xs bg-purple-600 hover:bg-purple-700">
                          Send LOI
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}