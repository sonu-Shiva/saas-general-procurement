from rest_framework import viewsets, permissions
from .models import PurchaseOrder, POLineItem
from .serializers import PurchaseOrderSerializer, POLineItemSerializer


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all()
    serializer_class = PurchaseOrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    def get_queryset(self):
        """Filter purchase orders based on user role"""
        if self.request.user.role == 'vendor':
            return PurchaseOrder.objects.filter(vendor__user=self.request.user)
        return PurchaseOrder.objects.all()


class POLineItemViewSet(viewsets.ModelViewSet):
    queryset = POLineItem.objects.all()
    serializer_class = POLineItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        po_id = self.request.query_params.get('po_id', None)
        if po_id:
            return POLineItem.objects.filter(purchase_order_id=po_id)
        return POLineItem.objects.all()