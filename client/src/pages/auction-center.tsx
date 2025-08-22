import React, { useState, useEffect } from "react";
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
import AuctionResults from "./auction-results-checkpoint";
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
              <AuctionResultsContainer 
                auction={selectedAuction}
                onClose={() => setIsLiveBiddingOpen(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* View Auction Dialog - Enhanced with Bid Information */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Auction Details - {selectedAuctionForView?.name}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
            {selectedAuctionForView && (
              <EnhancedAuctionView auction={selectedAuctionForView} />
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

// Enhanced Auction View Component - Shows comprehensive auction details with bid information
function EnhancedAuctionView({ auction }: { auction: any }) {
  // Fetch auction bids for detailed view
  const { data: auctionBids = [] } = useQuery({
    queryKey: [`/api/auctions/${auction.id}/bids`],
    staleTime: 0,
    cacheTime: 0,
  });

  // Fetch challenge prices for bid analysis
  const { data: challengePrices = [] } = useQuery({
    queryKey: [`/api/auctions/${auction.id}/challenge-prices`],
    staleTime: 0,
    cacheTime: 0,
  });

  // Calculate bid statistics
  const bidStats = React.useMemo(() => {
    if (!auctionBids?.length) return { totalBids: 0, uniqueVendors: 0, lowestBid: null, leadingVendor: null };

    const uniqueVendors = new Set(auctionBids.map((bid: any) => bid.vendorId)).size;
    const sortedBids = [...auctionBids].sort((a: any, b: any) => parseFloat(a.amount) - parseFloat(b.amount));
    const lowestBid = sortedBids[0];

    // Consider challenge prices for actual leading bid
    let actualLowestAmount = parseFloat(lowestBid.amount);
    let leadingVendor = lowestBid.vendorCompanyName || lowestBid.vendorName;

    // Process all accepted challenge prices to find the actual lowest
    challengePrices.forEach((challenge: any) => {
      if (challenge.status === 'accepted') {
        const challengeAmount = parseFloat(challenge.challengeAmount);
        if (challengeAmount < actualLowestAmount) {
          actualLowestAmount = challengeAmount;
          leadingVendor = challenge.vendorCompanyName || challenge.vendorName;
        }
      }
    });

    return {
      totalBids: auctionBids.length,
      uniqueVendors,
      lowestBid: actualLowestAmount,
      leadingVendor
    };
  }, [auctionBids, challengePrices]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'live': return 'bg-green-100 text-green-700 border-green-200';
      case 'completed': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'closed': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Auction Information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Name</Label>
          <p className="text-sm text-muted-foreground">{auction.name}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">Status</Label>
          <Badge className={getStatusColor(auction.status)}>
            {auction.status}
          </Badge>
        </div>
        <div>
          <Label className="text-sm font-medium">Type</Label>
          <p className="text-sm text-muted-foreground capitalize">{auction.type || 'Standard'}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">Duration</Label>
          <p className="text-sm text-muted-foreground">
            {new Date(auction.startTime).toLocaleDateString()} - {new Date(auction.endTime).toLocaleDateString()}
          </p>
        </div>
      </div>

      {auction.description && (
        <div>
          <Label className="text-sm font-medium">Description</Label>
          <p className="text-sm text-muted-foreground">{auction.description}</p>
        </div>
      )}

      {/* Bid Summary Section */}
      <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-green-50">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Bid Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{bidStats.totalBids}</div>
            <div className="text-sm text-gray-600">Total Bids</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{bidStats.uniqueVendors}</div>
            <div className="text-sm text-gray-600">Participating Vendors</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {bidStats.lowestBid ? `₹${bidStats.lowestBid.toLocaleString()}` : 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Lowest Bid</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-600">{bidStats.leadingVendor || 'N/A'}</div>
            <div className="text-sm text-gray-600">Bid Winner</div>
          </div>
        </div>
      </div>

      {/* Recent Bids Section */}
      {auctionBids?.length > 0 && (
        <div>
          <Label className="text-sm font-medium">Recent Bids</Label>
          <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
            {auctionBids.slice(0, 5).map((bid: any, index: number) => (
              <div key={bid.id} className="flex items-center justify-between p-3 border rounded bg-white">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    index === 0 ? 'bg-green-500' : index === 1 ? 'bg-blue-500' : 'bg-gray-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{bid.vendorCompanyName}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(bid.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">₹{parseFloat(bid.amount).toLocaleString()}</div>
                  <div className="text-sm text-gray-500">MT</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Challenge Prices Section */}
      {challengePrices?.length > 0 && (
        <div>
          <Label className="text-sm font-medium">Challenge Prices</Label>
          <div className="mt-2 space-y-2">
            {challengePrices.map((challenge: any) => (
              <div key={challenge.id} className="flex items-center justify-between p-3 border rounded bg-white">
                <div className="flex items-center space-x-3">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    challenge.status === 'accepted' ? 'bg-green-100 text-green-700' :
                    challenge.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {challenge.status}
                  </div>
                  <div>
                    <div className="font-medium">{challenge.vendorCompanyName}</div>
                    <div className="text-sm text-gray-500">
                      Challenge: ₹{parseFloat(challenge.challengeAmount).toLocaleString()}/MT
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    Original: ₹{parseFloat(challenge.originalBidAmount).toLocaleString()}
                  </div>
                  {challenge.notes && (
                    <div className="text-xs text-gray-400 max-w-32 truncate">{challenge.notes}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invited Vendors Section - Enhanced with bid participation status */}
      <div>
        <Label className="text-sm font-medium">Participating Vendors ({bidStats.uniqueVendors})</Label>
        <div className="mt-2 space-y-2">
          {Array.from(new Set(auctionBids.map((bid: any) => ({
            id: bid.vendorId,
            name: bid.vendorCompanyName || bid.vendorName,
            email: bid.vendorEmail,
            hasBids: true,
            hasChallenge: challengePrices.some((cp: any) => cp.vendorId === bid.vendorId)
          })))).map((vendor: any, index: number) => (
            <div key={vendor.id || index} className="flex items-center justify-between p-3 border rounded bg-white">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {vendor.name?.charAt(0) || 'V'}
                </div>
                <div>
                  <div className="font-medium">{vendor.name}</div>
                  <div className="text-sm text-gray-500">{vendor.email}</div>
                </div>
              </div>
              <div className="flex space-x-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Active Bidder
                </Badge>
                {vendor.hasChallenge && (
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    Challenge Submitted
                  </Badge>
                )}
              </div>
            </div>
          ))}
          {bidStats.uniqueVendors === 0 && (
            <p className="text-sm text-muted-foreground">No vendors have participated yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Live Bidding Interface Component - Shows Results and Live Bidding
function AuctionResultsContainer({ auction, onClose }: any) {
  // Fetch current bids with fresh data
  const { data: auctionBids = [] } = useQuery({
    queryKey: [`/api/auctions/${auction.id}/bids`],
    retry: false,
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0, // Don't cache
  });

  // Fetch challenge prices with fresh data
  const { data: challengePrices = [] } = useQuery({
    queryKey: [`/api/auctions/${auction.id}/challenge-prices`],
    retry: false,
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0, // Don't cache
  });

  // Calculate rankings from bids - ensure we have proper bid data
  const rankings = React.useMemo(() => {
    if (!Array.isArray(auctionBids) || auctionBids.length === 0) {
      return [];
    }
    
    // Get best bid per vendor
    const vendorBids = auctionBids.reduce((acc: any, bid: any) => {
      if (!acc[bid.vendorId] || parseFloat(bid.amount) < parseFloat(acc[bid.vendorId].amount)) {
        acc[bid.vendorId] = bid;
      }
      return acc;
    }, {});

    return Object.values(vendorBids)
      .sort((a: any, b: any) => parseFloat(a.amount) - parseFloat(b.amount));
  }, [auctionBids]);

  return (
    <AuctionResults 
      auction={auction}
      rankings={rankings}
      challengePrices={challengePrices || []}
    />
  );
}
