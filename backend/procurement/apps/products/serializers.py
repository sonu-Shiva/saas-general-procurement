from rest_framework import serializers
from .models import Product, ProductCategory


class ProductCategorySerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductCategory
        fields = [
            'id', 'name', 'code', 'description', 'parent', 'level',
            'sort_order', 'is_active', 'created_by', 'created_at',
            'updated_at', 'children'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'children']
    
    def get_children(self, obj):
        if obj.children.exists():
            return ProductCategorySerializer(obj.children.all(), many=True).data
        return []


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'item_name', 'internal_code', 'external_code', 'description',
            'category', 'category_name', 'category_legacy', 'sub_category',
            'uom', 'base_price', 'specifications', 'tags', 'is_active',
            'approved_by', 'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'category_name']