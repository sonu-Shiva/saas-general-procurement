import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { TermsUploader } from "@/components/TermsUploader";
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
  ShoppingCart
} from "lucide-react";

export default function AuctionCenter() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<any>(null);
  const [isLiveBiddingOpen, setIsLiveBiddingOpen] = useState(false);
  const [isPODialogOpen, setIsPODialogOpen] = useState(false);
  const [selectedAuctionForPO, setSelectedAuctionForPO] = useState<any>(null);
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
    setSelectedAuction(auction);
    setIsLiveBiddingOpen(true);
  };

  const handleCreatePOFromAuction = (auction: any) => {
    setSelectedAuctionForPO(auction);
    setIsPODialogOpen(true);
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
              <LiveBiddingInterface 
                auction={selectedAuction}
                ws={ws}
                onClose={() => setIsLiveBiddingOpen(false)}
              />
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
    </div>
  );
}

// Auction Card Component
function AuctionCard({ auction, onStart, onViewLive, onCreatePO, isLive, isVendor }: any) {
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
            <Button variant="ghost" size="sm" onClick={onStart}>
              <Play className="w-4 h-4 mr-1" />
              Start
            </Button>
          )}
          {auction.status === 'live' && (
            <Button variant="ghost" size="sm" onClick={onViewLive}>
              <Eye className="w-4 h-4 mr-1" />
              {isVendor ? "Bid Now" : "View Live"}
            </Button>
          )}
          {(auction.status === 'live' || auction.status === 'completed') && (
            <Button variant="ghost" size="sm">
              <Trophy className="w-4 h-4 mr-1" />
              Results
            </Button>
          )}
          {!isVendor && (auction.status === 'live' || auction.status === 'completed') && (
            <Button variant="ghost" size="sm" onClick={() => onCreatePO(auction)}>
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
  });

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
          reservePrice: data.ceilingPrice,
          startTime: data.startTime ? new Date(data.startTime).toISOString() : null,
          endTime: data.endTime ? new Date(data.endTime).toISOString() : null,
          status: 'scheduled',
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
      if (formData.selectedVendors.length > 0) {
        Promise.all(
          formData.selectedVendors.map(vendorId =>
            fetch("/api/auction-participants", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ auctionId: auction.id, vendorId }),
              credentials: "include",
            })
          )
        );
      }
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
    
    if (!formData.name || !formData.description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Auction Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="bomId">Bill of Materials</Label>
          <Select value={formData.bomId} onValueChange={(value) => setFormData(prev => ({ ...prev, bomId: value }))}>
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
          />
        </div>
        <div>
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            id="startTime"
            type="datetime-local"
            value={formData.startTime}
            onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="endTime">End Time</Label>
          <Input
            id="endTime"
            type="datetime-local"
            value={formData.endTime}
            onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <Label>Invite Vendors</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {vendors.map((vendor: any) => (
            <div key={vendor.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`vendor-${vendor.id}`}
                checked={formData.selectedVendors.includes(vendor.id)}
                onChange={() => handleVendorToggle(vendor.id)}
                className="rounded"
              />
              <Label htmlFor={`vendor-${vendor.id}`} className="text-sm">
                {vendor.name}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={createAuctionMutation.isPending}>
          {createAuctionMutation.isPending ? "Creating..." : "Create Auction"}
        </Button>
      </div>
    </form>
  );
}

// Live Bidding Interface Component
function LiveBiddingInterface({ auction, ws, onClose }: any) {
  const [currentBid, setCurrentBid] = useState('');
  const [bids, setBids] = useState<any[]>([]);
  const { toast } = useToast();

  const submitBid = () => {
    if (!currentBid || !ws) return;

    const bidAmount = parseFloat(currentBid);
    if (isNaN(bidAmount) || bidAmount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid bid amount",
        variant: "destructive",
      });
      return;
    }

    ws.send(JSON.stringify({
      type: 'bid',
      auctionId: auction.id,
      amount: bidAmount
    }));

    setCurrentBid('');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">₹{auction.currentBid || '0'}</div>
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
      </div>

      <div className="flex space-x-4">
        <div className="flex-1">
          <Input
            type="number"
            placeholder="Enter your bid amount"
            value={currentBid}
            onChange={(e) => setCurrentBid(e.target.value)}
          />
        </div>
        <Button onClick={submitBid}>
          Submit Bid
        </Button>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Bid History</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {bids.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No bids yet</p>
          ) : (
            bids.map((bid, index) => (
              <Card key={index}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">₹{bid.amount}</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(bid.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}