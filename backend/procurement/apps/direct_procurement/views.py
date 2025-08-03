
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import DirectProcurementOrder
from .serializers import DirectProcurementOrderSerializer


class DirectProcurementOrderViewSet(viewsets.ModelViewSet):
    serializer_class = DirectProcurementOrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return DirectProcurementOrder.objects.filter(created_by=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """Update order status"""
        order = self.get_object()
        status_value = request.data.get('status')
        
        order.status = status_value
        order.save()
        
        serializer = self.get_serializer(order)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def create_po(self, request, pk=None):
        """Convert to Purchase Order"""
        from procurement.apps.purchase_orders.models import PurchaseOrder, POLineItem
        from procurement.apps.purchase_orders.serializers import PurchaseOrderSerializer
        import uuid
        import time
        
        dpo = self.get_object()
        
        if dpo.created_by != request.user:
            return Response(
                {'message': 'You can only convert orders you created'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Generate PO number
        po_number = f"PO-{int(time.time())}-{uuid.uuid4().hex[:5].upper()}"
        
        # Create purchase order
        purchase_order = PurchaseOrder.objects.create(
            po_number=po_number,
            vendor=dpo.vendor,
            total_amount=dpo.total_amount,
            status='pending_approval',
            payment_terms=dpo.payment_terms,
            delivery_date=dpo.delivery_date,
            terms_and_conditions=dpo.notes or '',
            created_by=request.user
        )
        
        # Create line items for each BOM item
        if dpo.bom_items:
            for item in dpo.bom_items:
                POLineItem.objects.create(
                    po=purchase_order,
                    item_name=item.get('product_name'),
                    quantity=item.get('requested_quantity'),
                    unit_price=item.get('unit_price'),
                    total_price=item.get('total_price'),
                    specifications=item.get('specifications', '')
                )
        
        # Update DPO status
        dpo.status = 'submitted'
        dpo.save()
        
        serializer = PurchaseOrderSerializer(purchase_order)
        return Response(serializer.data)
