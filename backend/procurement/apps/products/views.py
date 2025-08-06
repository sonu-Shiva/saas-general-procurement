from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Product, ProductCategory
from .serializers import ProductSerializer, ProductCategorySerializer


class ProductCategoryViewSet(viewsets.ModelViewSet):
    queryset = ProductCategory.objects.all()
    serializer_class = ProductCategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def tree(self, request):
        """Get hierarchical category tree"""
        root_categories = ProductCategory.objects.filter(parent=None, is_active=True)
        serializer = self.get_serializer(root_categories, many=True)
        return Response(serializer.data)


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search products by various criteria"""
        query = request.query_params.get('q', '')
        category_id = request.query_params.get('category', '')
        tags = request.query_params.get('tags', '')
        
        queryset = self.get_queryset()
        
        if query:
            queryset = queryset.filter(
                Q(item_name__icontains=query) |
                Q(description__icontains=query) |
                Q(internal_code__icontains=query) |
                Q(external_code__icontains=query)
            )
        
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        
        if tags:
            tag_list = tags.split(',')
            for tag in tag_list:
                queryset = queryset.filter(tags__contains=[tag.strip()])
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def get_queryset(self):
        """Filter products based on user role"""
        if self.request.user.role == 'vendor':
            return Product.objects.filter(created_by=self.request.user, is_active=True)
        return Product.objects.filter(is_active=True)