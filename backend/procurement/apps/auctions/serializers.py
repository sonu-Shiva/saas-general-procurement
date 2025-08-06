from rest_framework import serializers
from .models import Auction, AuctionParticipant, Bid


class BidSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.company_name', read_only=True)
    
    class Meta:
        model = Bid
        fields = [
            'id', 'auction', 'vendor', 'vendor_name', 'amount',
            'timestamp', 'is_winning'
        ]
        read_only_fields = ['id', 'timestamp', 'vendor_name', 'is_winning']


class AuctionParticipantSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.company_name', read_only=True)
    
    class Meta:
        model = AuctionParticipant
        fields = ['auction', 'vendor', 'vendor_name', 'registered_at']
        read_only_fields = ['registered_at', 'vendor_name']


class AuctionSerializer(serializers.ModelSerializer):
    participants = AuctionParticipantSerializer(many=True, read_only=True)
    bids = BidSerializer(many=True, read_only=True)
    winner_name = serializers.CharField(source='winner.company_name', read_only=True)
    
    class Meta:
        model = Auction
        fields = [
            'id', 'name', 'description', 'items', 'start_time', 'end_time',
            'reserve_price', 'current_bid', 'bid_rules', 'status', 'winner',
            'winner_name', 'winning_bid', 'created_by', 'created_at',
            'updated_at', 'participants', 'bids'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'winner_name', 'participants', 'bids']