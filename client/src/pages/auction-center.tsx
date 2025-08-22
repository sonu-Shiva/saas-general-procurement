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
  ShoppingCart,
  Trash2
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AuctionCenter() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<any>(null);
  const [isLiveBiddingOpen, setIsLiveBiddingOpen] = useState(false);
  const [isPODialogOpen, setIsPODialogOpen] = useState(false);
  const [selectedAuctionForPO, setSelectedAuctionForPO] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedAuctionForView, setSelectedAuctionForView] = useState<any>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // WebSocket connection for live updates
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [liveAuctions, setLiveAuctions] = useState<Set<string>>(new Set());

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
        if (data.type === 'auction_update') {
          // Update auction data in real-time
          queryClient.setQueryData(["/api/auctions"], (oldData: any) => {
            if (!Array.isArray(oldData)) return oldData;
            return oldData.map((auction: any) => 
              auction.id === data.auctionId ? { ...auction, ...data.updates } : auction
            );
          });
          
          // Show live ranking updates
          if (data.ranking) {
            toast({
              title: "Live Ranking Update",
              description: `New L1: ${data.ranking.l1?.vendorName} - ₹${data.ranking.l1?.amount}`,
            });
          }
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
      setWs(null);
    };

    return () => {
      socket.close();
    };
  }, [queryClient, toast]);

  const auctionsArray = Array.isArray(auctions) ? auctions : [];
  
  const filteredAuctions = auctionsArray.filter((auction: any) => {
    const matchesSearch = auction.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         auction.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || auction.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'live': return 'bg-green-100 text-green-700 border-green-200';
      case 'completed': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handleStartAuction = async (auctionId: string) => {
    try {
      const response = await fetch(`/api/auctions/${auctionId}/start`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (response.ok) {
        toast({
          title: "Auction Started",
          description: "Live bidding is now active",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
        setLiveAuctions(prev => {
          const newSet = new Set(Array.from(prev));
          newSet.add(auctionId);
          return newSet;
        });
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

  const handleViewAuction = (auction: any) => {
    setSelectedAuctionForView(auction);
    setIsViewDialogOpen(true);
  };



  const deleteAuctionMutation = useMutation({
    mutationFn: (auctionId: string) => 
      fetch(`/api/auctions/${auctionId}`, { method: 'DELETE' }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
      toast({ title: "Success", description: "Auction deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete auction", variant: "destructive" });
    }
  });

  const handleDeleteAuction = (auctionId: string) => {
    if (confirm("Are you sure you want to delete this auction?")) {
      deleteAuctionMutation.mutate(auctionId);
    }
  };

  const isVendor = (user as any)?.role === 'vendor';
  
  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Auction Center</h1>
          <p className="text-muted-foreground">Live reverse auctions for competitive procurement</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Table/Cards Toggle */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
              data-testid="button-table-view"
            >
              Table
            </Button>
            <Button
              variant={viewMode === "cards" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("cards")}
              data-testid="button-cards-view"
            >
              Cards
            </Button>
          </div>
          {!isVendor && (
            <>
            <div className="h-4 w-px bg-border"></div>
            <div className="flex space-x-3">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => {
                    console.log("Create Auction button clicked");
                    setIsCreateDialogOpen(true);
                  }}
                >
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
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-64">
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
          ) : viewMode === "table" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Vendors</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAuctions.map((auction: any) => (
                  <TableRow key={auction.id}>
                    <TableCell className="font-medium">{auction.name}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(auction.status)}>
                        {auction.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{auction.type}</TableCell>
                    <TableCell>{new Date(auction.startTime).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(auction.endTime).toLocaleDateString()}</TableCell>
                    <TableCell>{auction.vendors?.length || 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewAuction(auction)}
                          data-testid={`button-view-${auction.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {auction.status === 'live' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewLiveBidding(auction)}
                            data-testid={`button-live-${auction.id}`}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                        {(auction.status === 'live' || auction.status === 'completed' || auction.status === 'closed') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewLiveBidding(auction)}
                            data-testid={`button-results-${auction.id}`}
                          >
                            <Trophy className="w-4 h-4" />
                          </Button>
                        )}
                        {!isVendor && auction.status !== 'live' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteAuction(auction.id)}
                            data-testid={`button-delete-${auction.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="divide-y divide-border">
              {filteredAuctions.map((auction: any) => (
                <AuctionCard 
                  key={auction.id} 
                  auction={auction}
                  onStart={() => handleStartAuction(auction.id)}
                  onViewLive={() => handleViewLiveBidding(auction)}
                  onCreatePO={handleCreatePOFromAuction}
                  onView={() => handleViewAuction(auction)}
                  onViewResults={() => handleViewLiveBidding(auction)}
                  onDelete={() => handleDeleteAuction(auction.id)}
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
            <DialogTitle>
              {selectedAuction?.status === 'live' ? 'Live Bidding' : 'Auction Results'} - {selectedAuction?.name}
            </DialogTitle>
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

      {/* View Auction Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Auction Details - {selectedAuctionForView?.name}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
            {selectedAuctionForView && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Name</Label>
                    <p className="text-sm text-muted-foreground">{selectedAuctionForView.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge className={getStatusColor(selectedAuctionForView.status)}>
                      {selectedAuctionForView.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Type</Label>
                    <p className="text-sm text-muted-foreground capitalize">{selectedAuctionForView.type}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Duration</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedAuctionForView.startTime).toLocaleDateString()} - {new Date(selectedAuctionForView.endTime).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {selectedAuctionForView.description && (
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm text-muted-foreground">{selectedAuctionForView.description}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium">Invited Vendors ({selectedAuctionForView.vendors?.length || 0})</Label>
                  <div className="mt-2 space-y-2">
                    {selectedAuctionForView.vendors?.map((vendor: any) => (
                      <div key={vendor.id} className="flex items-center justify-between p-2 border rounded">
                        <span>{vendor.name}</span>
                        <Badge variant="outline">{vendor.status || 'Invited'}</Badge>
                      </div>
                    )) || <p className="text-sm text-muted-foreground">No vendors invited</p>}
                  </div>
                </div>
              </div>
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
function AuctionCard({ auction, onStart, onViewLive, onCreatePO, onView, onViewResults, onDelete, isLive, isVendor }: any) {
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
          <Button variant="ghost" size="sm" onClick={() => onView(auction)}>
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
          {!isVendor && auction.status === 'scheduled' && (
            <Button variant="ghost" size="sm" onClick={onStart}>
              <Play className="w-4 h-4 mr-1" />
              Start
            </Button>
          )}
          {auction.status === 'live' && (
            <Button variant="ghost" size="sm" onClick={onViewLive}>
              <Play className="w-4 h-4 mr-1" />
              {isVendor ? "Bid Now" : "Live"}
            </Button>
          )}
          {(auction.status === 'live' || auction.status === 'completed' || auction.status === 'closed') && (
            <Button variant="ghost" size="sm" onClick={onViewLive}>
              <Trophy className="w-4 h-4 mr-1" />
              Results
            </Button>
          )}
          {!isVendor && (auction.status === 'live' || auction.status === 'completed') && (
            <Button variant="ghost" size="sm" onClick={() => onCreatePO(auction)}>
              <ShoppingCart className="w-4 h-4 mr-1" />
              PO
            </Button>
          )}
          {!isVendor && auction.status !== 'live' && (
            <Button variant="ghost" size="sm" onClick={() => onDelete(auction.id)}>
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
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

  // Remove BOM items query - no longer needed since we simplified to BOM-only selection

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
      // Register selected vendors for the auction
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
    createAuctionMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
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

      {/* Vendor Selection */}
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
        <Button type="submit" disabled={createAuctionMutation.isPending}>
          {createAuctionMutation.isPending ? "Creating..." : "Create Auction"}
        </Button>
      </div>
    </form>
  );
}

// Live Bidding Interface Component
function LiveBiddingInterface({ auction, ws, onClose }: any) {
  const [currentBids, setCurrentBids] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [newBidAmount, setNewBidAmount] = useState('');
  const [counterAmount, setCounterAmount] = useState('');
  const [counterNotes, setCounterNotes] = useState('');
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [isCounterDialogOpen, setIsCounterDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bids = [] } = useQuery({
    queryKey: ["/api/auctions", auction.id, "bids"],
    refetchInterval: 2000, // Refresh every 2 seconds
  });

  // Fetch challenge prices
  const { data: challengePrices = [] } = useQuery({
    queryKey: ["/api/auctions", auction.id, "challenge-prices"],
    refetchInterval: 3000, // Refresh every 3 seconds
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

  const submitBid = async () => {
    if (!newBidAmount || parseFloat(newBidAmount) <= 0) return;

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

      if (response.ok) {
        setNewBidAmount('');
        toast({
          title: "Bid Submitted",
          description: `Your bid of ₹${newBidAmount} has been submitted`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit bid",
        variant: "destructive",
      });
    }
  };

  // Challenge price response mutations
  const respondToChallengeMutation = useMutation({
    mutationFn: async ({ challengeId, action }: { challengeId: string; action: 'accept' | 'reject' }) => {
      const response = await fetch(`/api/auctions/${auction.id}/challenge-prices/${challengeId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action }),
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
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

  const handleSendChallenge = async (vendorId: string, bidId: string) => {
    try {
      const challengeAmount = parseFloat(newBidAmount);
      if (!challengeAmount || challengeAmount <= 0) return;

      const response = await fetch(`/api/auctions/${auction.id}/challenge-prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          bidId,
          challengeAmount,
          notes: "Challenge price for better value"
        })
      });

      if (response.ok) {
        toast({ title: "Success", description: "Challenge price sent successfully" });
        setNewBidAmount('');
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to send challenge price", variant: "destructive" });
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-green-100 text-green-700 border-green-200';
      case 2: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 3: return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Auction Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <Target className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <div className="text-sm text-muted-foreground">Ceiling Price</div>
            <div className="text-xl font-bold">₹{auction.reservePrice}</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <TrendingDown className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <div className="text-sm text-muted-foreground">Current L1</div>
            <div className="text-xl font-bold">₹{rankings[0]?.amount || 'No bids'}</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <Timer className="w-8 h-8 mx-auto mb-2 text-red-600" />
            <div className="text-sm text-muted-foreground">Time Remaining</div>
            <div className="text-xl font-bold">15:30</div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Rankings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="w-5 h-5" />
              <span>Live Rankings</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rankings.map((bid: any, index: number) => {
                const vendorChallenges = challengePrices.filter((cp: any) => cp.vendorId === bid.vendorId);
                const hasAcceptedChallenge = vendorChallenges.some((cp: any) => cp.status === 'accepted');
                const hasPendingChallenge = vendorChallenges.some((cp: any) => cp.status === 'pending');
                
                return (
                  <div key={bid.id} className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center space-x-3">
                        <Badge className={getRankColor(bid.rank)}>
                          {bid.rankLabel}
                        </Badge>
                        <div>
                          <div className="font-medium">{bid.vendorName || `Vendor ${bid.vendorId.slice(0, 8)}`}</div>
                          <div className="text-sm text-muted-foreground">
                            Bid: ₹{bid.amount}
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-x-2 flex items-center">
                        <div className="text-sm text-muted-foreground">
                          {new Date(bid.timestamp).toLocaleTimeString()}
                        </div>
                        {user?.role === 'SOURCING_EXECUTIVE' && bid.rank <= 3 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendChallenge(bid.vendorId, bid.id)}
                            disabled={hasAcceptedChallenge || hasPendingChallenge}
                          >
                            {hasAcceptedChallenge ? 'Accepted' : hasPendingChallenge ? 'Sent' : 'Challenge'}
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Challenge Price Status */}
                    {vendorChallenges.map((challenge: any) => (
                      <div key={challenge.id} className="ml-8 p-2 bg-blue-50 rounded border-l-4 border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">Challenge Price: ₹{challenge.challengeAmount}</div>
                            <div className="text-xs text-muted-foreground">
                              Status: <Badge variant={
                                challenge.status === 'accepted' ? 'default' :
                                challenge.status === 'rejected' ? 'destructive' : 'secondary'
                              }>
                                {challenge.status}
                              </Badge>
                            </div>
                          </div>
                          {challenge.status === 'pending' && user?.role === 'SOURCING_MANAGER' && (
                            <div className="space-x-2">
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
                                variant="destructive"
                                onClick={() => respondToChallengeMutation.mutate({ challengeId: challenge.id, action: 'reject' })}
                                disabled={respondToChallengeMutation.isPending}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                          {challenge.status === 'accepted' && (
                            <div className="text-sm text-green-600 font-medium">
                              ✓ Counter Price Accepted
                            </div>
                          )}
                          {challenge.status === 'rejected' && (
                            <div className="text-sm text-red-600 font-medium">
                              ✗ Counter Price Rejected
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Bidding Interface */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Gavel className="w-5 h-5" />
              <span>{user?.role === 'VENDOR' ? 'Place Bid' : 'Challenge Price'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{user?.role === 'VENDOR' ? 'Your Bid Amount (₹)' : 'Challenge Amount (₹)'}</Label>
                <Input
                  type="number"
                  value={newBidAmount}
                  onChange={(e) => setNewBidAmount(e.target.value)}
                  placeholder={user?.role === 'VENDOR' ? "Enter bid amount" : "Enter challenge amount"}
                  max={auction.reservePrice}
                />
                <div className="text-sm text-muted-foreground">
                  Must be less than ceiling price of ₹{auction.reservePrice}
                </div>
              </div>
              {user?.role === 'VENDOR' && (
                <Button 
                  onClick={submitBid} 
                  className="w-full"
                  disabled={!newBidAmount || parseFloat(newBidAmount) >= parseFloat(auction.reservePrice)}
                >
                  Submit Bid
                </Button>
              )}
              {user?.role === 'SOURCING_EXECUTIVE' && (
                <div className="text-sm text-muted-foreground">
                  Click "Challenge" button next to L1, L2, or L3 vendors to send challenge price
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bids */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bidding Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {currentBids.slice().reverse().map((bid: any) => (
              <div key={bid.id} className="flex items-center justify-between p-2 border-b last:border-b-0">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">₹{bid.amount}</span>
                  <span className="text-sm text-muted-foreground">
                    by {bid.vendorName || `Vendor ${bid.vendorId.slice(0, 8)}`}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {new Date(bid.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Counter Price Dialog */}
      <Dialog open={isCounterDialogOpen} onOpenChange={setIsCounterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Counter Price</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Counter Amount (₹)</Label>
              <Input
                type="number"
                value={counterAmount}
                onChange={(e) => setCounterAmount(e.target.value)}
                placeholder="Enter counter amount"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={counterNotes}
                onChange={(e) => setCounterNotes(e.target.value)}
                placeholder="Optional notes"
              />
            </div>
            <div className="flex space-x-2 justify-end">
              <Button variant="outline" onClick={() => setIsCounterDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => {}}>
                Send Counter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}