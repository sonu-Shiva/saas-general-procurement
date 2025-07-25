import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAuctionSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatCurrency } from "@/lib/utils";
import { 
  Plus, 
  Search, 
  Filter, 
  Gavel, 
  Eye,
  Play,
  Pause,
  Clock,
  Users,
  TrendingDown,

  Timer,
  Award,
  Activity,
  Target
} from "lucide-react";
import type { Auction, Bid } from "@shared/schema";

export default function AuctionCenter() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(insertAuctionSchema),
    defaultValues: {
      name: "",
      description: "",
      items: {},
      startTime: "",
      endTime: "",
      reservePrice: "",
      bidRules: {},
    },
  });

  const { data: auctions = [], isLoading } = useQuery<Auction[]>({
    queryKey: ["/api/auctions", { status: statusFilter }],
    retry: false,
  });

  const { data: selectedAuctionDetails = null } = useQuery<any>({
    queryKey: [`/api/auctions/${selectedAuction}`],
    enabled: !!selectedAuction,
    retry: false,
  });

  // WebSocket connection for real-time bidding
  const { lastMessage, sendMessage, connectionStatus } = useWebSocket('/ws');

  useEffect(() => {
    if (selectedAuction) {
      sendMessage({
        type: 'join_auction',
        auctionId: selectedAuction,
      });
    }
  }, [selectedAuction, sendMessage]);

  useEffect(() => {
    if (lastMessage) {
      const data = JSON.parse(lastMessage.data);
      if (data.type === 'bid_update') {
        // Update auction data in cache
        queryClient.invalidateQueries({ queryKey: ["/api/auctions", data.auctionId] });
      }
    }
  }, [lastMessage, queryClient]);

  const createAuctionMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/auctions", {
        ...data,
        reservePrice: parseFloat(data.reservePrice),
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
      toast({
        title: "Success",
        description: "Auction created successfully",
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create auction",
        variant: "destructive",
      });
    },
  });

  const placeBidMutation = useMutation({
    mutationFn: async ({ auctionId, amount }: { auctionId: string; amount: number }) => {
      sendMessage({
        type: 'place_bid',
        auctionId,
        vendorId: 'current_user_vendor_id', // This should be the current user's vendor ID
        amount,
      });
    },
    onSuccess: () => {
      setBidAmount("");
      toast({
        title: "Success",
        description: "Bid placed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to place bid",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createAuctionMutation.mutate(data);
  };

  const handlePlaceBid = () => {
    if (selectedAuction && bidAmount) {
      placeBidMutation.mutate({
        auctionId: selectedAuction,
        amount: parseFloat(bidAmount),
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "live":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "scheduled":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "completed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const filteredAuctions = auctions.filter((auction: Auction) => {
    const matchesSearch = auction.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         auction.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || auction.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Auction Center</h1>
                <p className="text-muted-foreground">Participate in live auctions and manage bidding events</p>
                <div className="flex items-center space-x-2 mt-2">
                  <div className={`w-2 h-2 rounded-full ${connectionStatus === 'Connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm text-muted-foreground">
                    Real-time connection: {connectionStatus}
                  </span>
                </div>
              </div>
              <div className="flex space-x-3">
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Auction
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Auction</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Auction Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="startTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Start Time</FormLabel>
                                <FormControl>
                                  <Input type="datetime-local" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="endTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>End Time</FormLabel>
                                <FormControl>
                                  <Input type="datetime-local" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="reservePrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Reserve Price</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-3">
                          <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createAuctionMutation.isPending}>
                            {createAuctionMutation.isPending ? "Creating..." : "Create Auction"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Auctions</p>
                      <p className="text-2xl font-bold">{auctions.length}</p>
                    </div>
                    <Gavel className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Live Auctions</p>
                      <p className="text-2xl font-bold text-success">
                        {auctions.filter((a: Auction) => a.status === 'live').length}
                      </p>
                    </div>
                    <Activity className="w-8 h-8 text-success" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Avg Savings</p>
                      <p className="text-2xl font-bold text-accent">15.2%</p>
                    </div>
                    <TrendingDown className="w-8 h-8 text-accent" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Savings</p>
                      <p className="text-2xl font-bold text-secondary">{formatCurrency(2400000)}</p>
                    </div>
                    <div className="w-8 h-8 text-secondary flex items-center justify-center font-bold text-xl">₹</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Search */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search auctions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Status" />
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
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Auctions List */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Active Auctions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {isLoading ? (
                      <div className="p-6">
                        <div className="animate-pulse space-y-4">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-20 bg-muted rounded"></div>
                          ))}
                        </div>
                      </div>
                    ) : filteredAuctions && filteredAuctions.length > 0 ? (
                      <div className="divide-y">
                        {filteredAuctions.map((auction: Auction) => (
                          <div
                            key={auction.id}
                            className={`p-6 cursor-pointer hover:bg-muted/50 ${
                              selectedAuction === auction.id ? 'bg-primary/5 border-l-4 border-primary' : ''
                            }`}
                            onClick={() => setSelectedAuction(auction.id)}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-semibold text-foreground">{auction.name}</h3>
                              <Badge className={getStatusColor(auction.status || 'scheduled')}>
                                {auction.status === 'live' && <Activity className="w-3 h-3 mr-1" />}
                                <span className="capitalize">{auction.status}</span>
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                              {auction.description}
                            </p>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Current Bid</p>
                                <p className="font-semibold">
                                  {auction.currentBid ? formatCurrency(auction.currentBid) : 'No bids'}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Reserve Price</p>
                                <p className="font-semibold">
                                  {auction.reservePrice ? formatCurrency(auction.reservePrice) : 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Time Left</p>
                                <p className="font-semibold text-warning">
                                  {auction.endTime ? 
                                    Math.max(0, Math.ceil((new Date(auction.endTime).getTime() - new Date().getTime()) / (1000 * 60 * 60))) + 'h' 
                                    : 'TBD'
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-12 text-center">
                        <Gavel className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">No auctions found</h3>
                        <p className="text-muted-foreground">
                          {searchQuery || statusFilter !== "all"
                            ? "Try adjusting your search criteria or filters"
                            : "Create your first auction to get started"
                          }
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Auction Details & Bidding */}
              <div className="lg:col-span-1">
                {selectedAuction ? (
                  <div className="space-y-6">
                    {/* Bidding Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Target className="w-5 h-5 mr-2" />
                          Place Bid
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedAuctionDetails?.status === 'live' ? (
                          <div className="space-y-4">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-success">
                                {selectedAuctionDetails.currentBid ? formatCurrency(selectedAuctionDetails.currentBid) : formatCurrency(0)}
                              </p>
                              <p className="text-sm text-muted-foreground">Current Winning Bid</p>
                            </div>
                            <div>
                              <Input
                                type="number"
                                placeholder="Enter your bid amount in rupees"
                                value={bidAmount}
                                onChange={(e) => setBidAmount(e.target.value)}
                                className="mb-3"
                              />
                              <Button 
                                onClick={handlePlaceBid}
                                className="w-full bg-success hover:bg-success/90"
                                disabled={!bidAmount || placeBidMutation.isPending}
                              >
                                {placeBidMutation.isPending ? "Placing Bid..." : "Place Bid"}
                              </Button>
                            </div>
                            <div className="text-xs text-muted-foreground text-center">
                              Your bid must be lower than the current bid to win
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-6">
                            <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-muted-foreground">
                              {selectedAuctionDetails?.status === 'scheduled' 
                                ? 'Auction not started yet'
                                : 'Auction has ended'
                              }
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Bid History */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Activity className="w-5 h-5 mr-2" />
                          Bid History
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {selectedAuctionDetails?.bids && selectedAuctionDetails.bids.length > 0 ? (
                            selectedAuctionDetails.bids.slice(0, 5).map((bid: Bid, index: number) => (
                              <div key={bid.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div>
                                  <p className="font-medium">{formatCurrency(bid.amount)}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(bid.timestamp || '').toLocaleTimeString()}
                                  </p>
                                </div>
                                {index === 0 && (
                                  <Badge className="bg-success text-success-foreground">
                                    <Award className="w-3 h-3 mr-1" />
                                    Leading
                                  </Badge>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="text-muted-foreground text-center py-4">No bids yet</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Participants */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Users className="w-5 h-5 mr-2" />
                          Participants
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {selectedAuctionDetails?.participants && selectedAuctionDetails.participants.length > 0 ? (
                            selectedAuctionDetails.participants.map((participant: any) => (
                              <div key={participant.id} className="flex items-center space-x-3 p-2 rounded-lg bg-muted">
                                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                  V{participant.id.slice(-2)}
                                </div>
                                <span className="text-sm">Vendor {participant.id.slice(-4)}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-muted-foreground text-center py-4">No participants yet</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">Select an Auction</h3>
                      <p className="text-muted-foreground">
                        Choose an auction from the list to view details and place bids
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
