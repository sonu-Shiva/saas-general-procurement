from django.db import models
import uuid
from procurement.apps.users.models import User
from procurement.apps.vendors.models import Vendor
from procurement.apps.products.models import Product
from procurement.apps.rfx.models import RFxEvent
from procurement.apps.auctions.models import Auction


class PurchaseOrder(models.Model):
    """Purchase Order model"""
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('issued', 'Issued'),
        ('acknowledged', 'Acknowledged'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('invoiced', 'Invoiced'),
        ('paid', 'Paid'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    po_number = models.CharField(max_length=100, unique=True)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='purchase_orders')
    rfx = models.ForeignKey(RFxEvent, on_delete=models.SET_NULL, blank=True, null=True, related_name='purchase_orders')
    auction = models.ForeignKey(Auction, on_delete=models.SET_NULL, blank=True, null=True, related_name='purchase_orders')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    terms_and_conditions = models.TextField(blank=True, null=True)
    delivery_schedule = models.JSONField(blank=True, null=True)
    payment_terms = models.TextField(blank=True, null=True)
    attachments = models.JSONField(default=list, blank=True)
    acknowledged_at = models.DateTimeField(blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_purchase_orders')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'purchase_orders'
    
    def __str__(self):
        return self.po_number


class POLineItem(models.Model):
    """Purchase Order Line Item model"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='line_items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='po_line_items')
    quantity = models.DecimalField(max_digits=10, decimal_places=3)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    delivery_date = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    class Meta:
        db_table = 'po_line_items'
    
    def __str__(self):
        return f"{self.purchase_order.po_number} - {self.product.item_name}"