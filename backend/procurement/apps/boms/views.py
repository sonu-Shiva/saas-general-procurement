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
@action(detail=True, methods=['post'])
def copy(self, request, pk=None):
    """Copy BOM with new name and version"""
    bom = self.get_object()
    name = request.data.get('name')
    version = request.data.get('version')
    
    if not name or not version:
        return Response(
            {'message': 'Both name and version are required for copying BOM'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if BOM with same name/version exists
    if BOM.objects.filter(name=name, version=version).exists():
        return Response(
            {'message': 'BOM with this name and version already exists'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Create copy
    new_bom = BOM.objects.create(
        name=name,
        version=version,
        description=f"Copy of {bom.name} v{bom.version}",
        total_cost=bom.total_cost,
        currency=bom.currency,
        created_by=request.user
    )
    
    # Copy BOM items
    for item in bom.bomitem_set.all():
        BOMItem.objects.create(
            bom=new_bom,
            product=item.product,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=item.total_price,
            specifications=item.specifications
        )
    
    serializer = self.get_serializer(new_bom)
    return Response(serializer.data)

@action(detail=False, methods=['get'])
def check_duplicate(self, request):
    """Check if BOM with name/version exists"""
    name = request.query_params.get('name')
    version = request.query_params.get('version')
    
    if not name or not version:
        return Response(
            {'message': 'Both name and version are required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    exists = BOM.objects.filter(name=name, version=version).exists()
    return Response({'exists': exists})
