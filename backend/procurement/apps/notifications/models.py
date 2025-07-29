from django.db import models
import uuid
from procurement.apps.users.models import User


class Notification(models.Model):
    """Notification model for user notifications"""
    
    TYPE_CHOICES = [
        ('info', 'Information'),
        ('warning', 'Warning'),
        ('success', 'Success'),
        ('error', 'Error'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField(blank=True, null=True)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='info')
    is_read = models.BooleanField(default=False)
    entity_type = models.CharField(max_length=100, blank=True, null=True)
    entity_id = models.UUIDField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.title}"