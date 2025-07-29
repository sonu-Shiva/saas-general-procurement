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