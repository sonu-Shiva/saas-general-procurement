import React from 'react';
import { Trophy } from 'lucide-react';

interface AuctionResultsProps {
  auction: any;
  rankings: any[];
  challengePrices: any[];
}

function AuctionResults({ auction, rankings, challengePrices }: AuctionResultsProps) {
  // Sort bids by final amount (considering accepted challenge prices)
  const sortedBids = React.useMemo(() => {
    if (!rankings?.length) return [];
    
    return rankings.map((bid: any) => {
      const vendorChallenges = Array.isArray(challengePrices) ? challengePrices.filter((cp: any) => cp.vendorId === bid.vendorId) : [];
      const acceptedChallenge = vendorChallenges.find((cp: any) => cp.status === 'accepted');
      
      // Get the final price with proper challenge price priority
      const originalAmount = parseFloat(bid.amount || bid.bidAmount || '0');
      const challengeAmount = acceptedChallenge ? parseFloat(acceptedChallenge.challengeAmount || '0') : 0;
      const finalAmount = acceptedChallenge ? challengeAmount : originalAmount;
      
      return {
        ...bid,
        finalAmount,
        vendorCompanyName: bid.vendorName || bid.companyName || bid.vendorCompanyName || `Vendor ${bid.vendorId}`,
      };
    }).sort((a, b) => a.finalAmount - b.finalAmount);
  }, [rankings, challengePrices]);

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
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Final Rankings</h3>
        <p className="text-muted-foreground mb-4">Ranked by bid amount (lowest first)</p>
      </div>

      {/* Horizontal Scroll Layout for Cards */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-max">
          {sortedBids.map((bid: any, index: number) => {
            const isWinner = index === 0;
            const rankLabel = `L${index + 1}`;
            const vendorName = bid.vendorCompanyName || bid.companyName || `Vendor ${index + 1}`;
            
            // Check if there's a challenge for this vendor
            const hasChallenge = challengePrices.some((cp: any) => cp.vendorId === bid.vendorId);
            const challengeData = challengePrices.find((cp: any) => cp.vendorId === bid.vendorId);
            const challengeStatus = challengeData?.status || null;
            const challengeAmount = challengeData?.challengeAmount || '14800';
            
            // Get final price (prioritize accepted challenge price)
            const acceptedChallengePrice = challengePrices.find((cp: any) => cp.vendorId === bid.vendorId && cp.status === 'accepted');
            
            let finalPrice: number;
            if (acceptedChallengePrice) {
              finalPrice = parseFloat(acceptedChallengePrice.challengeAmount);
            } else {
              finalPrice = parseFloat(bid.amount || bid.bidAmount || 0);
            }
            
            return (
              <div 
                key={bid.vendorId} 
                className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow min-h-[350px] w-[320px] flex-shrink-0 flex flex-col justify-between"
              >
                <div className="flex flex-col h-full">
                  {/* Header with ranking */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                      isWinner 
                        ? 'bg-green-500' 
                        : index === 1 
                          ? 'bg-blue-500'
                          : index === 2
                            ? 'bg-orange-500'
                            : index === 3
                              ? 'bg-purple-500'
                              : 'bg-gray-500'
                    }`}>
                      {index + 1}
                    </div>
                    
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      isWinner 
                        ? 'bg-green-100 text-green-800' 
                        : index === 1 
                          ? 'bg-blue-100 text-blue-800'
                          : index === 2
                            ? 'bg-orange-100 text-orange-800'
                            : index === 3
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                    }`}>
                      {rankLabel} Bidder
                    </div>
                  </div>

                  {/* Vendor Name */}
                  <div className="mb-4 text-center">
                    <h3 className="font-bold text-lg text-gray-900 mb-1">
                      {vendorName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {formatBidDateTime(bid.timestamp)}
                    </p>
                  </div>

                  {/* Final Price Display - Shows challenge price if accepted */}
                  <div className="mb-4 text-center bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 flex-grow">
                    {acceptedChallengePrice ? (
                      <>
                        <div className="text-sm text-gray-600 mb-1">Final Price (Challenge Accepted):</div>
                        <div className="text-2xl font-bold text-blue-600 mb-1">
                          ₹{finalPrice.toLocaleString()}/MT
                        </div>
                        <div className="text-xs text-gray-500 line-through">
                          Original: ₹{parseFloat(bid.amount || bid.bidAmount || 0).toLocaleString()}/MT
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm text-gray-600 mb-1">Bid Price:</div>
                        <div className="text-2xl font-bold text-purple-600 mb-1">
                          ₹{finalPrice.toLocaleString()}/MT
                        </div>
                      </>
                    )}
                    <div className="text-sm text-green-600 font-medium">
                      Savings: {((15000 - finalPrice) / 15000 * 100).toFixed(2)}%
                    </div>
                  </div>

                  {/* Challenge Price Section */}
                  <div className="mb-4 text-center bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-600 mb-2">Challenge Price</div>
                    {hasChallenge ? (
                      <div>
                        <div className="font-bold text-lg text-gray-900 mb-1">₹{parseFloat(challengeAmount).toLocaleString()}/MT</div>
                        <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          challengeStatus === 'accepted' 
                            ? 'bg-green-100 text-green-700' 
                            : challengeStatus === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {challengeStatus === 'accepted' ? 'Accepted' : 
                           challengeStatus === 'rejected' ? 'Rejected' : 'Pending'}
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm">No challenge sent</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default AuctionResults;