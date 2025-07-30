import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Search, 
  Filter, 
  Play, 
  Pause, 
  Trophy, 
  Eye, 
  Clock,
  Users,
  Target,
  TrendingUp,
  DollarSign,
  Edit
} from "lucide-react";

// Helper function to convert UTC date to local datetime-local format
function toLocalDateTimeString(utcDateString: string): string {
  const date = new Date(utcDateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Helper function to convert local datetime-local format to proper ISO string
function toISOString(localDateTimeString: string): string {
  // The datetime-local input gives us local time, we need to convert it to ISO
  const date = new Date(localDateTimeString);
  return date.toISOString();
}

export default function AuctionCenter() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAuction, setEditingAuction] = useState<any>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [selectedAuction, setSelectedAuction] = useState<any>(null);
  const [isLiveBiddingOpen, setIsLiveBiddingOpen] = useState(false);
  const [isResultsOpen, setIsResultsOpen] = useState(false);

  // Fetch data
  const { data: auctions = [], isLoading: isLoadingAuctions } = useQuery({
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

  // Filter auctions
  const auctionsArray = Array.isArray(auctions) ? auctions : [];
  const filteredAuctions = auctionsArray.filter((auction: any) => {
    const matchesSearch = auction.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         auction.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || auction.status === statusFilter;
    return matchesSearch && matchesStatus;
  });



  const handleViewLiveAuction = (auction: any) => {
    setSelectedAuction(auction);
    setIsLiveBiddingOpen(true);
  };

  const handleEditAuction = (auction: any) => {
    setEditingAuction(auction);
    setIsEditDialogOpen(true);
  };

  const handleViewResults = (auction: any) => {
    setSelectedAuction(auction);
    setIsResultsOpen(true);
  };

  const handleUpdateAuction = async (formData: FormData) => {
    if (!editingAuction) return;

    try {
      const data = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        bomId: formData.get('bomId') as string || null,
        reservePrice: formData.get('ceilingPrice') as string,
        startTime: new Date(formData.get('startTime') as string).toISOString(),
        endTime: new Date(formData.get('endTime') as string).toISOString(),
      };

      const response = await fetch(`/api/auctions/${editingAuction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Auction updated successfully' });
        setIsEditDialogOpen(false);
        setEditingAuction(null);
        queryClient.invalidateQueries({ queryKey: ['/api/auctions'] });
      } else {
        toast({ title: 'Error', description: 'Failed to update auction', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update auction', variant: 'destructive' });
    }
  };

  // Stats calculations
  const totalAuctions = auctionsArray.length;
  const liveAuctions = auctionsArray.filter((a: any) => a.status === 'live').length;
  const scheduledAuctions = auctionsArray.filter((a: any) => a.status === 'scheduled').length;
  const totalVendors = Array.isArray(vendors) ? vendors.length : 0;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-6 py-8">
            {/* Header Section */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Auction Center</h1>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Manage reverse auctions and competitive bidding processes
                  </p>
                </div>
                {/* Only buyers can create auctions - vendors cannot create */}
                {(user as any)?.role !== 'vendor' && (
                  <div className="mt-4 sm:mt-0">
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                          <Plus className="w-5 h-5 mr-2" />
                          Create Auction
                        </Button>
                      </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle className="text-2xl">Create New Reverse Auction</DialogTitle>
                      </DialogHeader>
                      <div className="overflow-y-auto max-h-[calc(90vh-100px)] p-6">
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.target as HTMLFormElement);
                          const data = {
                            name: formData.get('name') as string,
                            description: formData.get('description') as string,
                            bomId: formData.get('bomId') as string || null,
                            reservePrice: formData.get('ceilingPrice') as string,
                            startTime: new Date(formData.get('startTime') as string).toISOString(),
                            endTime: new Date(formData.get('endTime') as string).toISOString(),
                            status: 'scheduled'
                          };
                          
                          fetch('/api/auctions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(data),
                            credentials: 'include'
                          }).then(response => {
                            if (response.ok) {
                              toast({ title: 'Success', description: 'Auction created successfully' });
                              setIsCreateDialogOpen(false);
                              queryClient.invalidateQueries({ queryKey: ['/api/auctions'] });
                            } else {
                              toast({ title: 'Error', description: 'Failed to create auction', variant: 'destructive' });
                            }
                          });
                        }} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label htmlFor="name" className="text-sm font-medium">Auction Name *</Label>
                              <Input id="name" name="name" placeholder="Enter auction name" required className="h-11 border-2" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="ceilingPrice" className="text-sm font-medium">Ceiling Price (₹) *</Label>
                              <Input id="ceilingPrice" name="ceilingPrice" type="number" placeholder="Maximum price" required className="h-11 border-2" />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                            <Textarea id="description" name="description" placeholder="Auction description and requirements" rows={4} className="border-2" />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="bomId" className="text-sm font-medium">BOM Selection (Optional)</Label>
                            <select 
                              id="bomId" 
                              name="bomId"
                              className="flex h-11 w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="">No BOM (General Auction)</option>
                              {Array.isArray(boms) && boms.map((bom: any) => (
                                <option key={bom.id} value={bom.id}>
                                  {bom.name} (v{bom.version})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label htmlFor="startTime" className="text-sm font-medium">Start Time *</Label>
                              <Input id="startTime" name="startTime" type="datetime-local" required className="h-11 border-2" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="endTime" className="text-sm font-medium">End Time *</Label>
                              <Input id="endTime" name="endTime" type="datetime-local" required className="h-11 border-2" />
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-6 border-t">
                            <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} size="lg">
                              Cancel
                            </Button>
                            <Button type="submit" size="lg" className="bg-blue-600 hover:bg-blue-700">
                              Create Auction
                            </Button>
                          </div>
                        </form>
                      </div>
                    </DialogContent>
                  </Dialog>
                  </div>
                )}
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium text-blue-100">Total Auctions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <p className="text-3xl font-bold">{totalAuctions}</p>
                      <Trophy className="h-8 w-8 text-blue-200" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium text-green-100">Live Auctions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <p className="text-3xl font-bold">{liveAuctions}</p>
                      <Play className="h-8 w-8 text-green-200" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium text-orange-100">Scheduled</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <p className="text-3xl font-bold">{scheduledAuctions}</p>
                      <Clock className="h-8 w-8 text-orange-200" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium text-purple-100">Vendors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <p className="text-3xl font-bold">{totalVendors}</p>
                      <Users className="h-8 w-8 text-purple-200" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Search and Filter Section */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      placeholder="Search auctions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-11 border-2"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48 h-11 border-2">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Auction Grid */}
            {isLoadingAuctions ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading auctions...</p>
              </div>
            ) : filteredAuctions.length === 0 ? (
              <Card className="p-12 text-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-2">
                <div className="text-gray-500 dark:text-gray-400">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300">
                    {searchQuery || statusFilter !== "all" 
                      ? "No matching auctions" 
                      : (user as any)?.role === 'vendor' 
                        ? "No auctions available" 
                        : "No auctions yet"
                    }
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {searchQuery || statusFilter !== "all" 
                      ? "Try adjusting your search or filter criteria" 
                      : (user as any)?.role === 'vendor' 
                        ? "No auctions available for participation yet"
                        : "Create your first reverse auction to start competitive bidding"
                    }
                  </p>
                  {(!searchQuery && statusFilter === "all" && (user as any)?.role !== 'vendor') && (
                    <Button 
                      onClick={() => setIsCreateDialogOpen(true)}
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Create Your First Auction
                    </Button>
                  )}
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredAuctions.map((auction: any) => (
                  <AuctionCard 
                    key={auction.id} 
                    auction={auction}
                    onViewLive={() => handleViewLiveAuction(auction)}
                    onEdit={() => handleEditAuction(auction)}
                    onViewResults={() => handleViewResults(auction)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

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

      {/* Edit Auction Dialog */}
      {editingAuction && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">Edit Auction: {editingAuction.name}</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[calc(90vh-100px)] p-6">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                handleUpdateAuction(formData);
              }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name" className="text-sm font-medium">Auction Name *</Label>
                    <Input 
                      id="edit-name" 
                      name="name" 
                      placeholder="Enter auction name" 
                      defaultValue={editingAuction.name}
                      required 
                      className="h-11 border-2" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-ceilingPrice" className="text-sm font-medium">Ceiling Price (₹) *</Label>
                    <Input 
                      id="edit-ceilingPrice" 
                      name="ceilingPrice" 
                      type="number" 
                      placeholder="Maximum price" 
                      defaultValue={editingAuction.reservePrice}
                      required 
                      className="h-11 border-2" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description" className="text-sm font-medium">Description</Label>
                  <Textarea 
                    id="edit-description" 
                    name="description" 
                    placeholder="Auction description and requirements" 
                    defaultValue={editingAuction.description}
                    rows={4} 
                    className="border-2" 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-bomId" className="text-sm font-medium">BOM Selection (Optional)</Label>
                  <select 
                    id="edit-bomId" 
                    name="bomId"
                    defaultValue={editingAuction.bomId || ""}
                    className="flex h-11 w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">No BOM (General Auction)</option>
                    {Array.isArray(boms) && boms.map((bom: any) => (
                      <option key={bom.id} value={bom.id}>
                        {bom.name} (v{bom.version})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="edit-startTime" className="text-sm font-medium">Start Time *</Label>
                    <Input 
                      id="edit-startTime" 
                      name="startTime" 
                      type="datetime-local" 
                      defaultValue={editingAuction.startTime ? toLocalDateTimeString(editingAuction.startTime) : ''}
                      required 
                      className="h-11 border-2" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-endTime" className="text-sm font-medium">End Time *</Label>
                    <Input 
                      id="edit-endTime" 
                      name="endTime" 
                      type="datetime-local" 
                      defaultValue={editingAuction.endTime ? toLocalDateTimeString(editingAuction.endTime) : ''}
                      required 
                      className="h-11 border-2" 
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-6 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} size="lg">
                    Cancel
                  </Button>
                  <Button type="submit" size="lg" className="bg-blue-600 hover:bg-blue-700">
                    Update Auction
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Auction Results Dialog */}
      {selectedAuction && (
        <Dialog open={isResultsOpen} onOpenChange={setIsResultsOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">Auction Results: {selectedAuction.name}</DialogTitle>
            </DialogHeader>
            <AuctionResults 
              auction={selectedAuction}
              onClose={() => setIsResultsOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function AuctionResults({ auction, onClose }: any) {
  const { data: bids = [] } = useQuery({
    queryKey: ["/api/auctions", auction.id, "bids"],
    retry: false,
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors"],
    retry: false,
  });

  // Calculate final rankings from all bids
  const finalRankings = useMemo(() => {
    if (!Array.isArray(bids)) return [];
    
    // Get the best (lowest) bid for each vendor
    const vendorBids = bids.reduce((acc: any, bid: any) => {
      if (!acc[bid.vendorId] || bid.amount < acc[bid.vendorId].amount) {
        acc[bid.vendorId] = bid;
      }
      return acc;
    }, {});

    // Sort by amount and create rankings
    const ranked = Object.values(vendorBids)
      .sort((a: any, b: any) => parseFloat(a.amount) - parseFloat(b.amount))
      .map((bid: any, index: number) => {
        const vendor = Array.isArray(vendors) ? vendors.find((v: any) => v.id === bid.vendorId) : null;
        return {
          ...bid,
          rank: index + 1,
          rankLabel: index === 0 ? 'L1 (Winner)' : index === 1 ? 'L2' : index === 2 ? 'L3' : `L${index + 1}`,
          vendorName: vendor?.companyName || 'Unknown Vendor',
          savings: parseFloat(auction.reservePrice) - parseFloat(bid.amount)
        };
      });

    return ranked;
  }, [bids, vendors, auction.reservePrice]);

  const formatDateTime = (dateTime: string) => {
    try {
      const date = new Date(dateTime);
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const totalBids = Array.isArray(bids) ? bids.length : 0;
  const uniqueVendors = Array.isArray(bids) ? new Set(bids.map((bid: any) => bid.vendorId)).size : 0;
  const winner = finalRankings[0];
  const totalSavings = winner ? winner.savings : 0;

  return (
    <div className="space-y-6 p-6">
      {/* Auction Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">₹{auction.reservePrice}</div>
            <div className="text-sm text-gray-600">Ceiling Price</div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{totalBids}</div>
            <div className="text-sm text-gray-600">Total Bids</div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{uniqueVendors}</div>
            <div className="text-sm text-gray-600">Participating Vendors</div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">₹{totalSavings.toFixed(2)}</div>
            <div className="text-sm text-gray-600">Total Savings</div>
          </CardContent>
        </Card>
      </div>

      {/* Winner Announcement */}
      {winner && (
        <Card className="border-2 border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-green-800 dark:text-green-300">🎉 Auction Winner</h3>
                <p className="text-lg font-semibold text-green-700 dark:text-green-400">{winner.vendorName}</p>
                <p className="text-green-600 dark:text-green-500">Winning Bid: ₹{winner.amount}</p>
              </div>
              <Badge className="bg-green-600 text-white text-lg px-4 py-2">L1 Winner</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rankings Table */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Final Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          {finalRankings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2">
                    <th className="text-left p-3 font-semibold">Rank</th>
                    <th className="text-left p-3 font-semibold">Vendor</th>
                    <th className="text-right p-3 font-semibold">Best Bid (₹)</th>
                    <th className="text-right p-3 font-semibold">Savings (₹)</th>
                    <th className="text-right p-3 font-semibold">Bid Time</th>
                  </tr>
                </thead>
                <tbody>
                  {finalRankings.map((ranking: any, index: number) => (
                    <tr key={ranking.vendorId} className={`border-b ${index === 0 ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                      <td className="p-3">
                        <Badge className={
                          index === 0 ? 'bg-green-600 text-white' :
                          index === 1 ? 'bg-blue-600 text-white' :
                          index === 2 ? 'bg-orange-600 text-white' :
                          'bg-gray-600 text-white'
                        }>
                          {ranking.rankLabel}
                        </Badge>
                      </td>
                      <td className="p-3 font-medium">{ranking.vendorName}</td>
                      <td className="p-3 text-right font-bold">₹{ranking.amount}</td>
                      <td className="p-3 text-right text-green-600">₹{ranking.savings.toFixed(2)}</td>
                      <td className="p-3 text-right text-sm text-gray-600">{formatDateTime(ranking.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No bids were placed in this auction</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auction Details */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Auction Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Start Time:</span>
              <span className="ml-2">{formatDateTime(auction.startTime)}</span>
            </div>
            <div>
              <span className="font-medium">End Time:</span>
              <span className="ml-2">{formatDateTime(auction.endTime)}</span>
            </div>
            <div>
              <span className="font-medium">Description:</span>
              <span className="ml-2">{auction.description || 'No description'}</span>
            </div>
            <div>
              <span className="font-medium">Status:</span>
              <Badge className="ml-2 bg-gray-600 text-white">CLOSED</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onClose} size="lg">
          Close Results
        </Button>
      </div>
    </div>
  );
}

function AuctionCard({ auction, onViewLive, onEdit, onViewResults }: any) {
  const { user } = useAuth();
  const formatDateTime = (dateTime: string) => {
    try {
      const date = new Date(dateTime);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getRemainingTime = (endTime: string) => {
    try {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      
      if (isNaN(end)) return "Invalid Date";
      
      const diff = end - now;
      
      if (diff <= 0) return "Ended";
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) {
        return `${days}d ${hours}h`;
      } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m`;
      }
    } catch (error) {
      return "Invalid Date";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'live': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <Card className="hover:shadow-xl transition-all duration-300 border-2 bg-white dark:bg-gray-800">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">{auction.name}</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 mt-1">{auction.description}</CardDescription>
          </div>
          <Badge className={getStatusColor(auction.status)}>
            {auction.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Ceiling Price:</span>
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">₹{auction.reservePrice}</span>
          </div>
          
          <div className="text-sm space-y-2 text-gray-600 dark:text-gray-400">
            <div className="flex justify-between">
              <span>Start:</span>
              <span className="font-medium">{formatDateTime(auction.startTime)}</span>
            </div>
            <div className="flex justify-between">
              <span>End:</span>
              <span className="font-medium">{formatDateTime(auction.endTime)}</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span>{getRemainingTime(auction.endTime)}</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
              {auction.status === 'scheduled' && '⏱️ Auto-starts'}
              {auction.status === 'live' && '🔴 Live'}
              {auction.status === 'closed' && '✅ Ended'}
            </div>
          </div>

          <div className="flex space-x-2 pt-2">
            {/* Only buyers can edit auctions - vendors cannot edit */}
            {auction.status === 'scheduled' && (user as any)?.role !== 'vendor' && (
              <Button variant="outline" size="sm" onClick={onEdit} className="flex-1 border-2">
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
            {auction.status === 'live' && (
              <Button variant="default" size="sm" onClick={onViewLive} className="flex-1 bg-green-600 hover:bg-green-700">
                <Eye className="w-4 h-4 mr-1" />
                View Live
              </Button>
            )}
            {auction.status === 'closed' && (
              <Button variant="ghost" size="sm" onClick={onViewResults} className="flex-1 border-2">
                <Trophy className="w-4 h-4 mr-1" />
                Results
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LiveBiddingInterface({ auction, ws, onClose }: any) {
  const [newBidAmount, setNewBidAmount] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  console.log("LiveBiddingInterface: Component rendered");
  console.log("LiveBiddingInterface: Auction data:", auction);
  console.log("LiveBiddingInterface: User data:", user);

  // Simplified version - start with static content to ensure dialog works
  if (!auction) {
    console.log("LiveBiddingInterface: No auction data");
    return <div>Loading auction data...</div>;
  }

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
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-green-600">🔴 LIVE AUCTION</h2>
        <h3 className="text-xl font-semibold mt-2">{auction.name}</h3>
        <p className="text-gray-600 mt-1">{auction.description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Auction Info */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="w-5 h-5" />
              <span>Auction Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Ceiling Price</p>
                <p className="text-2xl font-bold text-green-600">₹{auction.reservePrice}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <Badge className="bg-green-100 text-green-800">LIVE</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bidding Form for Vendors */}
        {(user as any)?.role === 'vendor' && (
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Place Your Bid</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitBid} className="space-y-4">
                <div>
                  <Label htmlFor="bidAmount">Bid Amount (₹)</Label>
                  <Input
                    id="bidAmount"
                    type="number"
                    value={newBidAmount}
                    onChange={(e) => setNewBidAmount(e.target.value)}
                    placeholder="Enter your bid"
                    className="text-lg h-11 border-2"
                  />
                </div>
                <Button type="submit" className="w-full" size="lg">
                  Submit Bid
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Simple Rankings Placeholder */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Live Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No bids yet - Be the first to bid!</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}