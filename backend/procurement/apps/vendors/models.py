from django.db import models
import uuid
from procurement.apps.users.models import User


class Vendor(models.Model):
    """Vendor model for managing supplier information"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('suspended', 'Suspended'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    company_name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    pan_number = models.CharField(max_length=50, blank=True, null=True)
    gst_number = models.CharField(max_length=50, blank=True, null=True)
    tan_number = models.CharField(max_length=50, blank=True, null=True)
    bank_details = models.JSONField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    categories = models.JSONField(default=list, blank=True)
    certifications = models.JSONField(default=list, blank=True)
    years_of_experience = models.IntegerField(blank=True, null=True)
    office_locations = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    tags = models.JSONField(default=list, blank=True)
    performance_score = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='vendor_profile', blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_vendors')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vendors'
    
    def __str__(self):
        return self.company_name