import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy } from 'lucide-react';

interface AuctionResultsProps {
  auction: any;
  rankings: any[];
  challengePrices: any[];
}

function AuctionResults({ auction, rankings, challengePrices }: AuctionResultsProps) {
  // Calculate final rankings with proper challenge price logic
  const finalRankings = React.useMemo(() => {
    if (!rankings?.length) return [];
    
    return rankings.map((bid: any) => {
      const vendorChallenges = Array.isArray(challengePrices) ? challengePrices.filter((cp: any) => cp.vendorId === bid.vendorId) : [];
      const acceptedChallenge = vendorChallenges.find((cp: any) => cp.status === 'accepted');
      
      // Ensure we have valid amounts
      const originalAmount = parseFloat(bid.amount || bid.bidAmount || '0');
      const challengeAmount = acceptedChallenge ? parseFloat(acceptedChallenge.challengeAmount || '0') : 0;
      const finalAmount = acceptedChallenge ? challengeAmount : originalAmount;
      
      return {
        ...bid,
        finalAmount: finalAmount.toString(),
        hasAcceptedChallenge: !!acceptedChallenge,
        challengePrices: vendorChallenges,
        originalBidAmount: originalAmount.toString(),
        vendorName: bid.vendorName || bid.companyName || bid.vendorCompanyName || `Vendor ${bid.vendorId}`,
        vendorEmail: bid.vendorEmail || bid.email || 'No email provided'
      };
    }).sort((a: any, b: any) => parseFloat(a.finalAmount) - parseFloat(b.finalAmount))
      .map((bid: any, index: number) => ({
        ...bid,
        rank: index + 1,
        rankLabel: index === 0 ? 'L1' : index === 1 ? 'L2' : index === 2 ? 'L3' : `L${index + 1}`,
        rankColor: index === 0 ? 'border-green-200 bg-green-50' : index === 1 ? 'border-yellow-200 bg-yellow-50' : index === 2 ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-gray-50'
      }));
  }, [rankings, challengePrices]);

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-green-100 text-green-700 border-green-200';
      case 2: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 3: return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (!rankings?.length) {
    return (
      <div className="text-center py-8">
        <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Bids Received</h3>
        <p className="text-muted-foreground">This auction received no bids.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Winner Summary */}
      <div className="text-center mb-6">
        <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Auction Results</h2>
        <p className="text-muted-foreground">{auction.name}</p>
        {finalRankings[0] && (
          <div className="mt-4">
            <p className="text-lg">🏆 <strong>Winner: {finalRankings[0].vendorName}</strong></p>
            <p className="text-2xl font-bold text-green-600">Final Amount: ₹{parseFloat(finalRankings[0].finalAmount).toLocaleString()}</p>
            {finalRankings[0].hasAcceptedChallenge && (
              <p className="text-sm text-green-600 mt-1">✓ Won with accepted challenge price</p>
            )}
          </div>
        )}
      </div>

      {/* Rankings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {finalRankings.slice(0, 3).map((bid: any) => (
          <Card key={bid.id} className={`border-2 ${bid.rankColor}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge className={getRankColor(bid.rank)} variant="secondary">
                  {bid.rankLabel}
                </Badge>
                <div className="text-right">
                  <div className="text-2xl font-bold">₹{parseFloat(bid.finalAmount || 0).toLocaleString()}</div>
                  {bid.hasAcceptedChallenge && (
                    <div className="text-xs text-green-600 font-medium">
                      ✓ Challenge Accepted
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <div className="font-semibold text-lg">{bid.vendorName}</div>
                  <div className="text-sm text-muted-foreground">{bid.vendorEmail}</div>
                </div>
                
                <div className="text-sm">
                  <div>Original Bid: ₹{parseFloat(bid.originalBidAmount).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(bid.timestamp).toLocaleDateString()} at {new Date(bid.timestamp).toLocaleTimeString()}
                  </div>
                </div>

                {/* Challenge Prices */}
                {bid.challengePrices.map((challenge: any) => (
                  <div key={challenge.id} className="p-2 bg-blue-50 rounded border">
                    <div className="text-sm">
                      <strong>Challenge: ₹{parseFloat(challenge.challengeAmount).toLocaleString()}</strong>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <Badge variant={
                        challenge.status === 'accepted' ? 'default' :
                        challenge.status === 'rejected' ? 'destructive' : 'secondary'
                      } className="text-xs">
                        {challenge.status}
                      </Badge>
                      {challenge.status === 'accepted' && (
                        <span className="text-xs text-green-600 font-medium">✓ Accepted</span>
                      )}
                      {challenge.status === 'rejected' && (
                        <span className="text-xs text-red-600 font-medium">✗ Rejected</span>
                      )}
                    </div>
                    {challenge.notes && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {challenge.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* All Participants Table */}
      {finalRankings.length > 3 && (
        <Card>
          <CardHeader>
            <CardTitle>All Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {finalRankings.slice(3).map((bid: any) => (
                <div key={bid.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">{bid.rankLabel}</Badge>
                    <div>
                      <div className="font-medium">{bid.vendorName}</div>
                      <div className="text-sm text-muted-foreground">
                        Final: ₹{parseFloat(bid.finalAmount).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(bid.timestamp).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auction Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Auction Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{finalRankings.length}</div>
              <div className="text-sm text-muted-foreground">Total Bidders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">₹{auction.reservePrice ? parseFloat(auction.reservePrice).toLocaleString() : 'N/A'}</div>
              <div className="text-sm text-muted-foreground">Ceiling Price</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{challengePrices.filter((cp: any) => cp.status === 'accepted').length}</div>
              <div className="text-sm text-muted-foreground">Accepted Challenges</div>
            </div>
            <div className="text-center">
              <Badge className={
                auction.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' :
                auction.status === 'live' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                'bg-gray-100 text-gray-700 border-gray-200'
              }>
                {auction.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AuctionResults;