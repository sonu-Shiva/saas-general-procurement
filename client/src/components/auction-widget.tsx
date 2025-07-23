import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Gavel, Clock, Users, TrendingDown, Activity, Eye } from "lucide-react";
import type { Auction } from "@shared/schema";

interface AuctionWidgetProps {
  auctions?: Auction[];
}

export default function AuctionWidget({ auctions }: AuctionWidgetProps) {
  const liveAuctions = auctions?.filter(auction => auction.status === 'live') || [];
  const scheduledAuctions = auctions?.filter(auction => auction.status === 'scheduled') || [];

  const getTimeRemaining = (endTime: string) => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const diff = end - now;
    
    if (diff <= 0) return "Ended";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getTimeUntilStart = (startTime: string) => {
    const now = new Date().getTime();
    const start = new Date(startTime).getTime();
    const diff = start - now;
    
    if (diff <= 0) return "Starting now";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `Starts in ${hours}h ${minutes}m`;
    }
    return `Starts in ${minutes}m`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Gavel className="w-5 h-5 mr-2" />
          Active Auctions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {liveAuctions.length > 0 ? (
            liveAuctions.slice(0, 2).map((auction) => (
              <div key={auction.id} className="border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-foreground truncate">{auction.name}</h4>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <Activity className="w-3 h-3 mr-1" />
                    Live
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {auction.description}
                </p>
                <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                  <div>
                    <p className="text-muted-foreground">Current Bid</p>
                    <p className="font-semibold text-success">
                      ₹{auction.currentBid ? parseFloat(auction.currentBid).toLocaleString() : 'No bids'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Participants</p>
                    <p className="font-semibold">
                      <Users className="w-3 h-3 inline mr-1" />
                      {Math.floor(Math.random() * 8) + 3}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Time Left</p>
                    <p className="font-semibold text-destructive">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {auction.endTime ? getTimeRemaining(auction.endTime) : 'TBD'}
                    </p>
                  </div>
                </div>
                {auction.reservePrice && auction.currentBid && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress from reserve</span>
                      <span>
                        {(((parseFloat(auction.reservePrice) - parseFloat(auction.currentBid)) / parseFloat(auction.reservePrice)) * 100).toFixed(1)}% saved
                      </span>
                    </div>
                    <Progress 
                      value={((parseFloat(auction.reservePrice) - parseFloat(auction.currentBid)) / parseFloat(auction.reservePrice)) * 100} 
                      className="h-2" 
                    />
                  </div>
                )}
                <Button size="sm" className="w-full bg-primary hover:bg-primary/90">
                  <Eye className="w-3 h-3 mr-1" />
                  View Auction
                </Button>
              </div>
            ))
          ) : (
            <>
              {scheduledAuctions.length > 0 ? (
                scheduledAuctions.slice(0, 2).map((auction) => (
                  <div key={auction.id} className="border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-foreground truncate">{auction.name}</h4>
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        <Clock className="w-3 h-3 mr-1" />
                        Scheduled
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {auction.description}
                    </p>
                    <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                      <div>
                        <p className="text-muted-foreground">Reserve Price</p>
                        <p className="font-semibold">
                          ₹{auction.reservePrice ? parseFloat(auction.reservePrice).toLocaleString() : 'TBD'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Registered</p>
                        <p className="font-semibold">
                          <Users className="w-3 h-3 inline mr-1" />
                          {Math.floor(Math.random() * 15) + 5}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Starts</p>
                        <p className="font-semibold text-warning">
                          {auction.startTime ? getTimeUntilStart(auction.startTime) : 'TBD'}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="w-full">
                      <Eye className="w-3 h-3 mr-1" />
                      View Details
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Gavel className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-medium text-foreground mb-2">No Active Auctions</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create an auction to get competitive pricing from suppliers
                  </p>
                  <Button size="sm" className="bg-accent hover:bg-accent/90">
                    <Gavel className="w-3 h-3 mr-1" />
                    Create Auction
                  </Button>
                </div>
              )}
            </>
          )}

          {(liveAuctions.length > 0 || scheduledAuctions.length > 0) && (
            <div className="pt-3 border-t">
              <Button variant="outline" size="sm" className="w-full">
                View All Auctions
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
