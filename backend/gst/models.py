from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal

class GSTMaster(models.Model):
    """GST Master configuration for tax calculations"""
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('draft', 'Draft'),
    ]
    
    hsn_code = models.CharField(
        max_length=20, 
        help_text="HSN (Harmonized System of Nomenclature) Code"
    )
    hsn_description = models.TextField(
        help_text="Description of the HSN code"
    )
    gst_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        help_text="Total GST Rate (%)"
    )
    cgst_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('50'))],
        help_text="Central GST Rate (%)"
    )
    sgst_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('50'))],
        help_text="State GST Rate (%)"
    )
    igst_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        help_text="Integrated GST Rate (%)"
    )
    cess_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        help_text="Cess Rate (%)"
    )
    uom = models.CharField(
        max_length=20,
        help_text="Unit of Measurement (e.g., KG, PCS, MTR)"
    )
    effective_from = models.DateField(
        help_text="Date from which this GST configuration is effective"
    )
    effective_to = models.DateField(
        null=True, 
        blank=True,
        help_text="Date until which this GST configuration is effective"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active'
    )
    notes = models.TextField(
        blank=True,
        help_text="Additional notes or comments"
    )
    
    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=255, default='system')
    updated_by = models.CharField(max_length=255, default='system')
    
    class Meta:
        db_table = 'gst_master'
        ordering = ['hsn_code', '-effective_from']
        unique_together = ['hsn_code', 'effective_from']
        
    def __str__(self):
        return f"{self.hsn_code} - {self.hsn_description} ({self.gst_rate}%)"
    
    def clean(self):
        from django.core.exceptions import ValidationError
        
        # Validate that CGST + SGST = GST Rate for domestic transactions
        if self.cgst_rate + self.sgst_rate != self.gst_rate:
            raise ValidationError(
                f"CGST ({self.cgst_rate}%) + SGST ({self.sgst_rate}%) must equal GST Rate ({self.gst_rate}%)"
            )
        
        # Validate that IGST = GST Rate for inter-state transactions
        if self.igst_rate != self.gst_rate:
            raise ValidationError(
                f"IGST Rate ({self.igst_rate}%) must equal GST Rate ({self.gst_rate}%)"
            )
        
        # Validate effective dates
        if self.effective_to and self.effective_to <= self.effective_from:
            raise ValidationError("Effective To date must be after Effective From date")
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def calculate_tax(self, amount, is_interstate=False):
        """
        Calculate tax breakdown for a given amount
        
        Args:
            amount (Decimal): Base amount to calculate tax on
            is_interstate (bool): Whether it's an inter-state transaction
            
        Returns:
            dict: Tax breakdown with individual components
        """
        if is_interstate:
            igst_amount = (amount * self.igst_rate) / 100
            cess_amount = (amount * self.cess_rate) / 100
            total_tax = igst_amount + cess_amount
            
            return {
                'base_amount': amount,
                'cgst_rate': Decimal('0'),
                'sgst_rate': Decimal('0'),
                'igst_rate': self.igst_rate,
                'cess_rate': self.cess_rate,
                'cgst_amount': Decimal('0'),
                'sgst_amount': Decimal('0'),
                'igst_amount': igst_amount,
                'cess_amount': cess_amount,
                'total_tax': total_tax,
                'total_amount': amount + total_tax
            }
        else:
            cgst_amount = (amount * self.cgst_rate) / 100
            sgst_amount = (amount * self.sgst_rate) / 100
            cess_amount = (amount * self.cess_rate) / 100
            total_tax = cgst_amount + sgst_amount + cess_amount
            
            return {
                'base_amount': amount,
                'cgst_rate': self.cgst_rate,
                'sgst_rate': self.sgst_rate,
                'igst_rate': Decimal('0'),
                'cess_rate': self.cess_rate,
                'cgst_amount': cgst_amount,
                'sgst_amount': sgst_amount,
                'igst_amount': Decimal('0'),
                'cess_amount': cess_amount,
                'total_tax': total_tax,
                'total_amount': amount + total_tax
            }
    
    @classmethod
    def get_active_gst_for_hsn(cls, hsn_code, effective_date=None):
        """
        Get active GST configuration for a specific HSN code
        
        Args:
            hsn_code (str): HSN code to lookup
            effective_date (date): Date for which to find GST config (defaults to today)
            
        Returns:
            GSTMaster: Active GST configuration or None
        """
        from django.utils import timezone
        
        if effective_date is None:
            effective_date = timezone.now().date()
        
        return cls.objects.filter(
            hsn_code=hsn_code,
            status='active',
            effective_from__lte=effective_date
        ).filter(
            models.Q(effective_to__isnull=True) | 
            models.Q(effective_to__gte=effective_date)
        ).order_by('-effective_from').first()