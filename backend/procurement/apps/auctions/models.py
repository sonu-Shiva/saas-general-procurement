from django.db import models
import uuid
from procurement.apps.users.models import User
from procurement.apps.vendors.models import Vendor


class Auction(models.Model):
    """Auction model for procurement auctions"""
    
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('live', 'Live'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    items = models.JSONField(blank=True, null=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    reserve_price = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    current_bid = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    bid_rules = models.JSONField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    winner = models.ForeignKey(Vendor, on_delete=models.SET_NULL, blank=True, null=True, related_name='won_auctions')
    winning_bid = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_auctions')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'auctions'
    
    def __str__(self):
        return self.name


class AuctionParticipant(models.Model):
    """Auction participant model"""
    
    auction = models.ForeignKey(Auction, on_delete=models.CASCADE, related_name='participants')
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='auction_participations')
    registered_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'auction_participants'
        unique_together = ['auction', 'vendor']
    
    def __str__(self):
        return f"{self.auction.name} - {self.vendor.company_name}"


class Bid(models.Model):
    """Bid model for auction bids"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    auction = models.ForeignKey(Auction, on_delete=models.CASCADE, related_name='bids')
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='bids')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_winning = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'bids'
    
    def __str__(self):
        return f"{self.auction.name} - {self.vendor.company_name} - {self.amount}"