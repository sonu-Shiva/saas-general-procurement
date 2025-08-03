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

// Auction Results Component  
function AuctionResults({ auctionId, onCreatePO }: { auctionId: string; onCreatePO?: (auction: any) => void }) {
  const { data: bids = [], isLoading } = useQuery({
    queryKey: ["/api/auctions", auctionId, "bids"],
    retry: false,
  });



  if (isLoading) {
    return <div className="text-center py-4">Loading results...</div>;
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

  // Use all bids - they come from the database with proper structure
  const validBids = bidsArray;



  // Sort bids by amount (ascending - lowest first)  
  const sortedBids = [...validBids].sort((a: any, b: any) => {
    const amountA = Number(a.amount) || 999999;
    const amountB = Number(b.amount) || 999999;
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
        <div className="space-y-2">
          {sortedBids.map((bid: any, index: number) => (
            <Card key={bid.id} className={index === 0 ? 'border-green-500 bg-green-50' : ''}>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index === 0 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{bid.vendor?.companyName || bid.vendorName || 'Unknown Vendor'}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatBidDateTime(bid.timestamp || bid.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      ₹{bid.amount ? Number(String(bid.amount)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                    </div>
                    <Badge className={`${
                      index === 0 ? 'bg-green-100 text-green-700 border-green-200' :
                      index === 1 ? 'bg-blue-100 text-blue-700 border-blue-200' :
                      index === 2 ? 'bg-orange-100 text-orange-700 border-orange-200' :
                      'bg-gray-100 text-gray-700 border-gray-200'
                    }`}>
                      L{index + 1} Bidder
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Create PO Button for completed auctions */}
        {sortedBids.length > 0 && onCreatePO && (
          <div className="text-center mt-6 pt-4 border-t">
            <Button 
              onClick={() => onCreatePO({ id: auctionId, winningBid: sortedBids[0] })}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Create Purchase Order
            </Button>
          </div>
        )}
      </div>
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
              isVendor ? (
                <LiveBiddingInterface 
                  auction={selectedAuction}
                  ws={ws}
                  onClose={() => setIsLiveBiddingOpen(false)}
                />
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
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Auction Results - {auction.name}</DialogTitle>
                </DialogHeader>
                <AuctionResults auctionId={auction.id} onCreatePO={onCreatePO} />
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
    termsUrl: '',
  });

  const [editableBomItems, setEditableBomItems] = useState<{[key: string]: {quantity: number, unitPrice: number}}>({});

  // Fetch BOM items when a BOM is selected
  const { data: bomItems = [] } = useQuery({
    queryKey: ["/api/bom-items", formData.bomId],
    queryFn: () => formData.bomId && formData.bomId !== 'none' 
      ? apiRequest(`/api/bom-items/${formData.bomId}`)
      : Promise.resolve([]),
    enabled: !!formData.bomId && formData.bomId !== 'none',
    retry: false,
  });

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
          reservePrice: data.ceilingPrice,
          startTime: data.startTime ? new Date(data.startTime).toISOString() : null,
          endTime: data.endTime ? new Date(data.endTime).toISOString() : null,
          status: 'scheduled',
          termsUrl: data.termsUrl,
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
    
    // Validate required fields
    if (!formData.name || !formData.description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate Terms & Conditions upload
    if (!formData.termsUrl) {
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
          <Label htmlFor="startTime">Start Time</Label>
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
          />
        </div>
        <div>
          <Label htmlFor="endTime">End Time</Label>
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
          {bomItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Loading BOM items...</p>
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
      <div className="border rounded-lg p-4">
        <Label className="text-base font-medium">Terms & Conditions *</Label>
        <p className="text-sm text-muted-foreground mb-3">
          Upload terms and conditions that vendors must accept before bidding
        </p>
        <TermsUploader
          onTermsUpload={(url: string) => setFormData(prev => ({ ...prev, termsUrl: url }))}
          currentTermsUrl={formData.termsUrl}
        />
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
                {vendor.companyName}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={createAuctionMutation.isPending || !formData.termsUrl}
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
                          {bid.vendor?.companyName?.[0] || 'V'}
                        </div>
                        <div>
                          <div className="font-medium">{bid.vendor?.companyName || 'Vendor'}</div>
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
    </div>
  );
}

// Live Bidding Interface Component
function LiveBiddingInterface({ auction, ws, onClose }: any) {
  const [currentBid, setCurrentBid] = useState('');
  const [bids, setBids] = useState<any[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch current bids
  const { data: auctionBids = [] } = useQuery({
    queryKey: ["/api/auctions", auction.id, "bids"],
    queryFn: () => apiRequest(`/api/auctions/${auction.id}/bids`),
    refetchInterval: 2000, // Refresh every 2 seconds
    retry: false,
  });

  useEffect(() => {
    setBids(auctionBids);
  }, [auctionBids]);

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

    try {
      await apiRequest(`/api/auctions/${auction.id}/bid`, {
        method: "POST",
        body: JSON.stringify({ amount: bidAmount })
      });
      
      toast({
        title: "Success",
        description: "Your bid has been placed successfully",
      });
      
      setCurrentBid('');
    } catch (error: any) {
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
                  const isCurrentUser = bid.vendorId === (user as any)?.id;
                  
                  return (
                    <div key={bid.id} className={`flex justify-between items-center p-3 rounded ${
                      isCurrentUser ? 'bg-blue-50 border border-blue-200' : 'bg-muted/30'
                    }`}>
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          isCurrentUser ? 'bg-blue-500 text-white' : 'bg-primary text-white'
                        }`}>
                          {isCurrentUser ? 'You' : (bid.vendor?.companyName?.[0] || 'V')}
                        </div>
                        <div>
                          <div className="font-medium">{isCurrentUser ? 'Your Bid' : (bid.vendor?.companyName || 'Vendor')}</div>
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
    </div>
  );
}