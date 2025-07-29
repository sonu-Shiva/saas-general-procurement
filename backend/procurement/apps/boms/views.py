from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import BOM, BOMItem
from .serializers import BOMSerializer, BOMItemSerializer


class BOMViewSet(viewsets.ModelViewSet):
    queryset = BOM.objects.all()
    serializer_class = BOMSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['get'])
    def items(self, request, pk=None):
        """Get BOM items for a specific BOM"""
        bom = self.get_object()
        items = bom.items.all()
        serializer = BOMItemSerializer(items, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_item(self, request, pk=None):
        """Add an item to the BOM"""
        bom = self.get_object()
        data = request.data.copy()
        data['bom'] = bom.id
        
        serializer = BOMItemSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BOMItemViewSet(viewsets.ModelViewSet):
    queryset = BOMItem.objects.all()
    serializer_class = BOMItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        bom_id = self.request.query_params.get('bom_id', None)
        if bom_id:
            return BOMItem.objects.filter(bom_id=bom_id)
        return BOMItem.objects.all()