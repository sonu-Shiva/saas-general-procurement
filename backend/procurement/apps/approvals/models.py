from django.db import models
import uuid
from procurement.apps.users.models import User


class Approval(models.Model):
    """Approval workflow model"""
    
    ENTITY_TYPE_CHOICES = [
        ('vendor', 'Vendor'),
        ('rfx', 'RFx'),
        ('po', 'Purchase Order'),
        ('budget', 'Budget'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    entity_type = models.CharField(max_length=20, choices=ENTITY_TYPE_CHOICES)
    entity_id = models.UUIDField()
    approver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='approvals')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    comments = models.TextField(blank=True, null=True)
    approved_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'approvals'
    
    def __str__(self):
        return f"{self.entity_type} {self.entity_id} - {self.status}"