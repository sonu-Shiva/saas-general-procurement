from django.db import models
import uuid
from procurement.apps.users.models import User
from procurement.apps.vendors.models import Vendor
from procurement.apps.boms.models import BOM


class RFxEvent(models.Model):
    """RFI/RFP/RFQ Event model"""
    
    TYPE_CHOICES = [
        ('rfi', 'Request for Information'),
        ('rfp', 'Request for Proposal'),
        ('rfq', 'Request for Quote'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('active', 'Active'),
        ('closed', 'Closed'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    title = models.CharField(max_length=255)
    reference_no = models.CharField(max_length=100, unique=True, blank=True, null=True)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    scope = models.TextField(blank=True, null=True)
    criteria = models.TextField(blank=True, null=True)
    due_date = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    evaluation_parameters = models.JSONField(blank=True, null=True)
    attachments = models.JSONField(default=list, blank=True)
    bom = models.ForeignKey(BOM, on_delete=models.SET_NULL, blank=True, null=True, related_name='rfx_events')
    contact_person = models.CharField(max_length=255, blank=True, null=True)
    budget = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    parent_rfx = models.ForeignKey('self', on_delete=models.SET_NULL, blank=True, null=True, related_name='children')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_rfx_events')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'rfx_events'
    
    def __str__(self):
        return f"{self.type.upper()} - {self.title}"


class RFxInvitation(models.Model):
    """RFx vendor invitation model"""
    
    STATUS_CHOICES = [
        ('invited', 'Invited'),
        ('viewed', 'Viewed'),
        ('responded', 'Responded'),
        ('declined', 'Declined'),
    ]
    
    rfx = models.ForeignKey(RFxEvent, on_delete=models.CASCADE, related_name='invitations')
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='rfx_invitations')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='invited')
    invited_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        db_table = 'rfx_invitations'
        unique_together = ['rfx', 'vendor']
    
    def __str__(self):
        return f"{self.rfx.title} - {self.vendor.company_name}"


class RFxResponse(models.Model):
    """RFx vendor response model"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    rfx = models.ForeignKey(RFxEvent, on_delete=models.CASCADE, related_name='responses')
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='rfx_responses')
    response = models.JSONField(blank=True, null=True)
    quoted_price = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    delivery_terms = models.TextField(blank=True, null=True)
    payment_terms = models.TextField(blank=True, null=True)
    lead_time = models.IntegerField(blank=True, null=True)  # Days
    attachments = models.JSONField(default=list, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'rfx_responses'
    
    def __str__(self):
        return f"{self.rfx.title} - {self.vendor.company_name} Response"