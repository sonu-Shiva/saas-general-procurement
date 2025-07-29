from rest_framework import serializers
from .models import BOM, BOMItem


class BOMItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.item_name', read_only=True)
    
    class Meta:
        model = BOMItem
        fields = [
            'id', 'bom', 'product', 'product_name', 'item_name', 'item_code',
            'description', 'category', 'quantity', 'uom', 'unit_price',
            'total_price', 'specifications', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'product_name']


class BOMSerializer(serializers.ModelSerializer):
    items = BOMItemSerializer(many=True, read_only=True)
    items_count = serializers.SerializerMethodField()
    
    class Meta:
        model = BOM
        fields = [
            'id', 'name', 'version', 'description', 'category', 'valid_from',
            'valid_to', 'tags', 'is_active', 'created_by', 'created_at',
            'updated_at', 'items', 'items_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'items', 'items_count']
    
    def get_items_count(self, obj):
        return obj.items.count()