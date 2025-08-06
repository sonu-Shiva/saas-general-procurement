from django.db import models
import uuid
from procurement.apps.users.models import User


class ProductCategory(models.Model):
    """Hierarchical product category system"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, blank=True, null=True, related_name='children')
    level = models.IntegerField(default=1)
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_categories')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'product_categories'
        verbose_name_plural = 'Product Categories'
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class Product(models.Model):
    """Product catalog model"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    item_name = models.CharField(max_length=255)
    internal_code = models.CharField(max_length=100, blank=True, null=True)
    external_code = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    category = models.ForeignKey(ProductCategory, on_delete=models.SET_NULL, blank=True, null=True, related_name='products')
    category_legacy = models.CharField(max_length=255, blank=True, null=True)  # Legacy field
    sub_category = models.CharField(max_length=255, blank=True, null=True)  # Legacy field
    uom = models.CharField(max_length=50, blank=True, null=True)  # Unit of Measure
    base_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    specifications = models.JSONField(blank=True, null=True)
    tags = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name='approved_products')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_products')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'products'
    
    def __str__(self):
        return self.item_name