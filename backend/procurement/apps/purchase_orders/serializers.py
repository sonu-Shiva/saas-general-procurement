from rest_framework import serializers
from .models import PurchaseOrder, POLineItem


class POLineItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.item_name', read_only=True)
    
    class Meta:
        model = POLineItem
        fields = [
            'id', 'purchase_order', 'product', 'product_name', 'quantity',
            'unit_price', 'total_price', 'delivery_date', 'status'
        ]
        read_only_fields = ['id', 'product_name']


class PurchaseOrderSerializer(serializers.ModelSerializer):
    line_items = POLineItemSerializer(many=True, read_only=True)
    vendor_name = serializers.CharField(source='vendor.company_name', read_only=True)
    rfx_title = serializers.CharField(source='rfx.title', read_only=True)
    auction_name = serializers.CharField(source='auction.name', read_only=True)
    
    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'po_number', 'vendor', 'vendor_name', 'rfx', 'rfx_title',
            'auction', 'auction_name', 'total_amount', 'status',
            'terms_and_conditions', 'delivery_schedule', 'payment_terms',
            'attachments', 'acknowledged_at', 'created_by', 'created_at',
            'updated_at', 'line_items'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'vendor_name', 'rfx_title',
            'auction_name', 'line_items'
        ]