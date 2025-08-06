from django.db import models
import uuid
from procurement.apps.users.models import User
from procurement.apps.products.models import Product


class BOM(models.Model):
    """Bill of Materials model"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=255)
    version = models.CharField(max_length=50, default='1.0')
    description = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=255, blank=True, null=True)
    valid_from = models.DateTimeField(blank=True, null=True)
    valid_to = models.DateTimeField(blank=True, null=True)
    tags = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_boms')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'boms'
        unique_together = ['name', 'version']
    
    def __str__(self):
        return f"{self.name} v{self.version}"


class BOMItem(models.Model):
    """BOM line items"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    bom = models.ForeignKey(BOM, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, blank=True, null=True, related_name='bom_items')
    item_name = models.CharField(max_length=255)
    item_code = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=255, blank=True, null=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=3)
    uom = models.CharField(max_length=50, blank=True, null=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    specifications = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'bom_items'
    
    def __str__(self):
        return f"{self.bom.name} - {self.item_name}"