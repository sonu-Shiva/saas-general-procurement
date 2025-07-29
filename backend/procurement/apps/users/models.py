from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid


class User(AbstractUser):
    """Custom user model for the procurement platform"""
    
    ROLE_CHOICES = [
        ('buyer_admin', 'Buyer Admin'),
        ('buyer_user', 'Buyer User'),
        ('sourcing_manager', 'Sourcing Manager'),
        ('vendor', 'Vendor'),
    ]
    
    id = models.CharField(max_length=255, primary_key=True)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    profile_image_url = models.URLField(blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='buyer_user')
    organization_id = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Override username to use email
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    
    class Meta:
        db_table = 'users'


class Organization(models.Model):
    """Organization model"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=255)
    gst_number = models.CharField(max_length=50, blank=True, null=True)
    pan_number = models.CharField(max_length=50, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    contact_person = models.CharField(max_length=255, blank=True, null=True)
    contact_email = models.EmailField(blank=True, null=True)
    contact_phone = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'organizations'
    
    def __str__(self):
        return self.name