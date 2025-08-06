
from rest_framework import serializers
from .models import DirectProcurementOrder


class DirectProcurementOrderSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    bom_name = serializers.CharField(source='bom.name', read_only=True)
    
    class Meta:
        model = DirectProcurementOrder
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at', 'updated_at')
