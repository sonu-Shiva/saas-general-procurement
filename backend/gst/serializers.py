from rest_framework import serializers
from .models import GSTMaster
from decimal import Decimal

class GSTMasterSerializer(serializers.ModelSerializer):
    """Serializer for GST Master CRUD operations"""
    
    class Meta:
        model = GSTMaster
        fields = [
            'id', 'hsn_code', 'hsn_description', 'gst_rate',
            'cgst_rate', 'sgst_rate', 'igst_rate', 'cess_rate',
            'uom', 'effective_from', 'effective_to', 'status', 'notes',
            'created_at', 'updated_at', 'created_by', 'updated_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Custom validation for GST rates"""
        cgst_rate = data.get('cgst_rate', Decimal('0'))
        sgst_rate = data.get('sgst_rate', Decimal('0'))
        gst_rate = data.get('gst_rate', Decimal('0'))
        igst_rate = data.get('igst_rate', Decimal('0'))
        
        # Validate CGST + SGST = GST Rate
        if cgst_rate + sgst_rate != gst_rate:
            raise serializers.ValidationError(
                f"CGST ({cgst_rate}%) + SGST ({sgst_rate}%) must equal GST Rate ({gst_rate}%)"
            )
        
        # Validate IGST = GST Rate
        if igst_rate != gst_rate:
            raise serializers.ValidationError(
                f"IGST Rate ({igst_rate}%) must equal GST Rate ({gst_rate}%)"
            )
        
        # Validate effective dates
        effective_from = data.get('effective_from')
        effective_to = data.get('effective_to')
        if effective_to and effective_from and effective_to <= effective_from:
            raise serializers.ValidationError(
                "Effective To date must be after Effective From date"
            )
        
        return data

class GSTCalculationSerializer(serializers.Serializer):
    """Serializer for GST tax calculation requests"""
    
    hsn_code = serializers.CharField(max_length=20)
    amount = serializers.DecimalField(max_digits=15, decimal_places=2, min_value=0)
    is_interstate = serializers.BooleanField(default=False)
    effective_date = serializers.DateField(required=False)

class GSTCalculationResponseSerializer(serializers.Serializer):
    """Serializer for GST tax calculation responses"""
    
    hsn_code = serializers.CharField()
    hsn_description = serializers.CharField()
    base_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    cgst_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    sgst_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    igst_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    cess_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    cgst_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    sgst_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    igst_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    cess_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_tax = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    uom = serializers.CharField()
    transaction_type = serializers.CharField()  # 'domestic' or 'interstate'

class GSTLookupSerializer(serializers.Serializer):
    """Serializer for HSN code lookup"""
    
    hsn_code = serializers.CharField(max_length=20)
    effective_date = serializers.DateField(required=False)