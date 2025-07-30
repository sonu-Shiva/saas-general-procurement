import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Play, Pause, Trophy, Eye, Clock } from "lucide-react";

export default function AuctionCenter() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [selectedAuction, setSelectedAuction] = useState<any>(null);
  const [isLiveBiddingOpen, setIsLiveBiddingOpen] = useState(false);

  // Fetch data
  const { data: auctions = [], isLoading: isLoadingAuctions } = useQuery({
    queryKey: ["/api/auctions"],
  });

  const { data: boms = [] } = useQuery({
    queryKey: ["/api/boms"],
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors"],
  });

  // WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connection established");
      setWs(socket);
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed");
      setWs(null);
    };

    return () => {
      socket.close();
    };
  }, []);

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString();
  };

  const getRemainingTime = (endTime: string) => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const diff = end - now;
    
    if (diff <= 0) return "Ended";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'live': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStartAuction = async (auctionId: string) => {
    try {
      const response = await fetch(`/api/auctions/${auctionId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: 'live' }),
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to start auction");

      toast({
        title: "Success",
        description: "Auction started successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start auction",
        variant: "destructive",
      });
    }
  };

  const handleViewLiveAuction = (auction: any) => {
    setSelectedAuction(auction);
    setIsLiveBiddingOpen(true);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Auction Center</h1>
          <p className="text-muted-foreground">
            Manage reverse auctions and competitive bidding
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Auction
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
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

      {/* Auction Grid */}
      {isLoadingAuctions ? (
        <div className="text-center py-8">Loading auctions...</div>
      ) : Array.isArray(auctions) && auctions.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-muted-foreground mb-4">
            <Trophy className="w-12 h-12 mx-auto mb-2" />
            <h3 className="text-lg font-semibold">No auctions yet</h3>
            <p>Create your first reverse auction to start competitive bidding</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.isArray(auctions) && auctions.map((auction: any) => (
            <AuctionCard 
              key={auction.id} 
              auction={auction}
              onStart={() => handleStartAuction(auction.id)}
              onViewLive={() => handleViewLiveAuction(auction)}
            />
          ))}
        </div>
      )}

      {/* Live Bidding Dialog */}
      {selectedAuction && (
        <Dialog open={isLiveBiddingOpen} onOpenChange={setIsLiveBiddingOpen}>
          <DialogContent className="max-w-6xl">
            <DialogHeader>
              <DialogTitle>Live Auction: {selectedAuction.name}</DialogTitle>
            </DialogHeader>
            <LiveBiddingInterface 
              auction={selectedAuction}
              ws={ws}
              onClose={() => setIsLiveBiddingOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function AuctionCard({ auction, onStart, onViewLive }: any) {
  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString();
  };

  const getRemainingTime = (endTime: string) => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const diff = end - now;
    
    if (diff <= 0) return "Ended";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'live': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{auction.name}</CardTitle>
            <CardDescription>{auction.description}</CardDescription>
          </div>
          <Badge className={getStatusColor(auction.status)}>
            {auction.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Ceiling Price:</span>
            <span className="font-semibold">₹{auction.reservePrice}</span>
          </div>
          
          <div className="text-sm space-y-1">
            <div>Start: {formatDateTime(auction.startTime)}</div>
            <div>End: {formatDateTime(auction.endTime)}</div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{getRemainingTime(auction.endTime)}</span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2 ml-4">
          {auction.status === 'scheduled' && (
            <Button variant="ghost" size="sm" onClick={onStart}>
              <Play className="w-4 h-4 mr-1" />
              Start
            </Button>
          )}
          {auction.status === 'live' && (
            <Button variant="ghost" size="sm" onClick={onViewLive}>
              <Eye className="w-4 h-4 mr-1" />
              View Live
            </Button>
          )}
          <Button variant="ghost" size="sm">
            <Trophy className="w-4 h-4 mr-1" />
            Results
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateAuctionForm({ onClose, onSuccess, boms, vendors }: any) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    description: '', 
    bomId: '',
    ceilingPrice: '',
    startTime: '',
    endTime: '',
    selectedVendors: [] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.ceilingPrice || !formData.startTime || !formData.endTime) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          bomId: formData.bomId || null,
          bomLineItemId: null,
          reservePrice: formData.ceilingPrice,
          startTime: formData.startTime ? new Date(formData.startTime).toISOString() : null,
          endTime: formData.endTime ? new Date(formData.endTime).toISOString() : null,
          status: 'scheduled',
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      
      const auction = await response.json();
      
      // Register selected vendors for the auction
      if (formData.selectedVendors.length > 0) {
        await Promise.all(
          formData.selectedVendors.map(vendorId =>
            fetch("/api/auction-participants", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                auctionId: auction.id,
                vendorId: vendorId,
              }),
              credentials: "include",
            })
          )
        );
      }
      
      toast({
        title: "Success",
        description: "Auction created successfully",
      });
      onSuccess();
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create auction",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-1">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Auction Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter auction name"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="ceilingPrice">Ceiling Price (₹) *</Label>
          <Input
            id="ceilingPrice"
            type="number"
            value={formData.ceilingPrice}
            onChange={(e) => setFormData({ ...formData, ceilingPrice: e.target.value })}
            placeholder="Maximum price"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Auction description and requirements"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bomId">BOM Selection (Optional)</Label>
        <Select 
          value={formData.bomId} 
          onValueChange={(value) => setFormData({ ...formData, bomId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select BOM (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No BOM (General Auction)</SelectItem>
            {Array.isArray(boms) && boms.map((bom: any) => (
              <SelectItem key={bom.id} value={bom.id}>
                {bom.name} (v{bom.version})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Link to a specific BOM for targeted procurement or leave blank for general auction
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startTime">Start Time *</Label>
          <Input
            id="startTime"
            type="datetime-local"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endTime">End Time *</Label>
          <Input
            id="endTime"
            type="datetime-local"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-4">
        <Label>Select Vendors for Auction</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
          {Array.isArray(vendors) && vendors.map((vendor: any) => (
            <Card key={vendor.id} className="p-4 cursor-pointer hover:border-primary/50">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  value={vendor.id}
                  checked={formData.selectedVendors.includes(vendor.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({ 
                        ...formData, 
                        selectedVendors: [...formData.selectedVendors, vendor.id] 
                      });
                    } else {
                      setFormData({ 
                        ...formData, 
                        selectedVendors: formData.selectedVendors.filter(id => id !== vendor.id) 
                      });
                    }
                  }}
                  className="h-4 w-4 mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium">{vendor.companyName || vendor.name}</div>
                  <div className="text-sm text-muted-foreground">{vendor.categories}</div>
                </div>
              </label>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Auction"}
        </Button>
      </div>
    </form>
  );
}

function LiveBiddingInterface({ auction, ws, onClose }: any) {
  const [currentBids, setCurrentBids] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [newBidAmount, setNewBidAmount] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: bids = [] } = useQuery({
    queryKey: ["/api/auctions", auction.id, "bids"],
    refetchInterval: 2000, // Refresh every 2 seconds
  });

  useEffect(() => {
    if (Array.isArray(bids)) {
      setCurrentBids(bids);
      
      // Calculate rankings
      const vendorBids = bids.reduce((acc: any, bid: any) => {
        if (!acc[bid.vendorId] || bid.amount < acc[bid.vendorId].amount) {
          acc[bid.vendorId] = bid;
        }
        return acc;
      }, {});

      const ranked = Object.values(vendorBids)
        .sort((a: any, b: any) => parseFloat(a.amount) - parseFloat(b.amount))
        .map((bid: any, index: number) => ({
          ...bid,
          rank: index + 1,
          rankLabel: index === 0 ? 'L1' : index === 1 ? 'L2' : index === 2 ? 'L3' : `L${index + 1}`
        }));

      setRankings(ranked);
    }
  }, [bids]);

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newBidAmount || parseFloat(newBidAmount) <= 0) {
      toast({
        title: "Invalid Bid",
        description: "Please enter a valid bid amount",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(newBidAmount) > parseFloat(auction.reservePrice)) {
      toast({
        title: "Bid Too High",
        description: `Bid cannot exceed ceiling price of ₹${auction.reservePrice}`,
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auctionId: auction.id,
          amount: newBidAmount,
        }),
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to submit bid");

      toast({
        title: "Bid Submitted",
        description: "Your bid has been placed successfully",
      });

      setNewBidAmount('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit bid",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Rankings */}
        <Card>
          <CardHeader>
            <CardTitle>Current Rankings</CardTitle>
            <CardDescription>Live vendor rankings based on best bids</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rankings.map((bid: any) => (
                <div key={bid.vendorId} className="flex justify-between items-center p-3 border rounded">
                  <div className="flex items-center space-x-3">
                    <Badge 
                      variant={bid.rank === 1 ? "default" : "secondary"}
                      className={bid.rank === 1 ? "bg-green-600" : ""}
                    >
                      {bid.rankLabel}
                    </Badge>
                    <span className="font-medium">{bid.vendorName || `Vendor ${bid.vendorId}`}</span>
                  </div>
                  <span className="font-bold">₹{bid.amount}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bidding Interface */}
        <Card>
          <CardHeader>
            <CardTitle>Place Bid</CardTitle>
            <CardDescription>
              Ceiling Price: ₹{auction.reservePrice}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitBid} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bidAmount">Your Bid Amount (₹)</Label>
                <Input
                  id="bidAmount"
                  type="number"
                  step="0.01"
                  value={newBidAmount}
                  onChange={(e) => setNewBidAmount(e.target.value)}
                  placeholder="Enter your bid"
                  max={auction.reservePrice}
                />
              </div>
              <Button type="submit" className="w-full">
                Submit Bid
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bids */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bids</CardTitle>
          <CardDescription>Latest bidding activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {currentBids.slice(-10).reverse().map((bid: any, index: number) => (
              <div key={index} className="flex justify-between items-center p-2 border rounded text-sm">
                <span>{bid.vendorName || `Vendor ${bid.vendorId}`}</span>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">₹{bid.amount}</span>
                  <span className="text-muted-foreground">
                    {new Date(bid.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}