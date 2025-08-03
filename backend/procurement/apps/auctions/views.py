from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Auction, AuctionParticipant, Bid
from .serializers import AuctionSerializer, AuctionParticipantSerializer, BidSerializer


class AuctionViewSet(viewsets.ModelViewSet):
    queryset = Auction.objects.all()
    serializer_class = AuctionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def register(self, request, pk=None):
        """Register vendor for auction"""
        auction = self.get_object()
        vendor = request.user.vendor_profile.first()
        
        if not vendor:
            return Response({'error': 'Vendor profile not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        participant, created = AuctionParticipant.objects.get_or_create(
            auction=auction,
            vendor=vendor
        )
        
        serializer = AuctionParticipantSerializer(participant)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def place_bid(self, request, pk=None):
        """Place a bid in the auction"""
        auction = self.get_object()
        vendor = request.user.vendor_profile.first()
        amount = request.data.get('amount')
        
        if not vendor:
            return Response({'error': 'Vendor profile not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        if auction.status != 'live':
            return Response({'error': 'Auction is not live'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create bid
        bid = Bid.objects.create(
            auction=auction,
            vendor=vendor,
            amount=amount
        )
        
        # Update auction current bid if this is the highest
        if not auction.current_bid or amount > auction.current_bid:
            auction.current_bid = amount
            auction.save()
        
        serializer = BidSerializer(bid)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class BidViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Bid.objects.all()
    serializer_class = BidSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        auction_id = self.request.query_params.get('auction_id')
        if auction_id:
            return Bid.objects.filter(auction_id=auction_id).order_by('-timestamp')
        return Bid.objects.all().order_by('-timestamp')
@action(detail=True, methods=['patch'])
def update_status(self, request, pk=None):
    """Update auction status"""
    auction = self.get_object()
    status_value = request.data.get('status')
    
    if auction.created_by != request.user:
        return Response(
            {'message': 'You can only modify your own auctions'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    auction.status = status_value
    auction.save()
    
    serializer = self.get_serializer(auction)
    return Response(serializer.data)

@action(detail=True, methods=['post'])
def create_po(self, request, pk=None):
    """Create Purchase Order from Auction"""
    from procurement.apps.purchase_orders.models import PurchaseOrder
    from procurement.apps.purchase_orders.serializers import PurchaseOrderSerializer
    
    auction = self.get_object()
    vendor_id = request.data.get('vendor_id')
    bid_amount = request.data.get('bid_amount')
    payment_terms = request.data.get('payment_terms', 'Net 30')
    notes = request.data.get('notes', '')
    
    if auction.created_by != request.user:
        return Response(
            {'message': 'You can only create POs for your own auctions'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Generate PO number
    po_number = f"PO-{int(time.time())}-{uuid.uuid4().hex[:5].upper()}"
    
    # Create Purchase Order
    purchase_order = PurchaseOrder.objects.create(
        po_number=po_number,
        vendor_id=vendor_id,
        auction=auction,
        total_amount=bid_amount or '0',
        status='pending_approval',
        terms_and_conditions=notes or f"Purchase Order created from Auction: {auction.name}",
        payment_terms=payment_terms,
        created_by=request.user
    )
    
    # Update auction winner
    auction.winner_id = vendor_id
    auction.winning_bid = bid_amount
    auction.status = 'completed'
    auction.save()
    
    serializer = PurchaseOrderSerializer(purchase_order)
    return Response(serializer.data)

@action(detail=True, methods=['get'])
def bids(self, request, pk=None):
    """Get auction bids"""
    from procurement.apps.auctions.models import Bid
    from procurement.apps.auctions.serializers import BidSerializer
    
    auction = self.get_object()
    bids = Bid.objects.filter(auction=auction).order_by('-created_at')
    serializer = BidSerializer(bids, many=True)
    return Response(serializer.data)
