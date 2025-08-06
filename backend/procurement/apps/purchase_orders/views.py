from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
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

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a purchase order."""
        purchase_order = self.get_object()
        if purchase_order.status != 'pending':
            return Response({'message': 'Purchase order is not pending.'}, status=status.HTTP_400_BAD_REQUEST)
        purchase_order.status = 'approved'
        purchase_order.approved_date = timezone.now()
        purchase_order.save()
        return Response({'message': 'Purchase order approved.'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a purchase order."""
        purchase_order = self.get_object()
        if purchase_order.status != 'pending':
            return Response({'message': 'Purchase order is not pending.'}, status=status.HTTP_400_BAD_REQUEST)
        purchase_order.status = 'rejected'
        purchase_order.rejected_date = timezone.now()
        purchase_order.save()
        return Response({'message': 'Purchase order rejected.'})

    @action(detail=True, methods=['post'])
    def issue(self, request, pk=None):
        """Issue a purchase order."""
        purchase_order = self.get_object()
        if purchase_order.status != 'approved':
            return Response({'message': 'Purchase order is not approved.'}, status=status.HTTP_400_BAD_REQUEST)
        purchase_order.status = 'issued'
        purchase_order.issue_date = timezone.now()
        purchase_order.save()
        return Response({'message': 'Purchase order issued.'})


class POLineItemViewSet(viewsets.ModelViewSet):
    queryset = POLineItem.objects.all()
    serializer_class = POLineItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        po_id = self.request.query_params.get('po_id', None)
        if po_id:
            return POLineItem.objects.filter(purchase_order_id=po_id)
        return POLineItem.objects.all()