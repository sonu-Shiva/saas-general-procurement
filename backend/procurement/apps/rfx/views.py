from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import RFxEvent, RFxInvitation, RFxResponse
from .serializers import RFxEventSerializer, RFxInvitationSerializer, RFxResponseSerializer


class RFxEventViewSet(viewsets.ModelViewSet):
    queryset = RFxEvent.objects.all()
    serializer_class = RFxEventSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def invite_vendors(self, request, pk=None):
        """Invite vendors to participate in RFx"""
        rfx = self.get_object()
        vendor_ids = request.data.get('vendor_ids', [])
        
        invitations = []
        for vendor_id in vendor_ids:
            invitation, created = RFxInvitation.objects.get_or_create(
                rfx=rfx,
                vendor_id=vendor_id,
                defaults={'status': 'invited'}
            )
            invitations.append(invitation)
        
        serializer = RFxInvitationSerializer(invitations, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def responses(self, request, pk=None):
        """Get all responses for this RFx"""
        rfx = self.get_object()
        responses = rfx.responses.all()
        serializer = RFxResponseSerializer(responses, many=True)
        return Response(serializer.data)
    
    def get_queryset(self):
        """Filter RFx events based on user role"""
        if self.request.user.role == 'vendor':
            # Vendors see only RFx events they're invited to
            return RFxEvent.objects.filter(
                invitations__vendor__user=self.request.user
            ).distinct()
        return RFxEvent.objects.all()


class RFxInvitationViewSet(viewsets.ModelViewSet):
    queryset = RFxInvitation.objects.all()
    serializer_class = RFxInvitationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.role == 'vendor':
            return RFxInvitation.objects.filter(vendor__user=self.request.user)
        return RFxInvitation.objects.all()


class RFxResponseViewSet(viewsets.ModelViewSet):
    queryset = RFxResponse.objects.all()
    serializer_class = RFxResponseSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        # For vendors, automatically set the vendor based on their profile
        if self.request.user.role == 'vendor':
            vendor = self.request.user.vendor_profile.first()
            if vendor:
                serializer.save(vendor=vendor)
        else:
            serializer.save()
    
    def get_queryset(self):
        if self.request.user.role == 'vendor':
            return RFxResponse.objects.filter(vendor__user=self.request.user)
        return RFxResponse.objects.all()
@action(detail=True, methods=['post'])
def create_next_stage(self, request, pk=None):
    """Create next stage RFx (RFI -> RFP -> RFQ)"""
    parent_rfx = self.get_object()
    
    if parent_rfx.created_by != request.user:
        return Response(
            {'message': 'You can only create next stage for your own RFx'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Determine next type
    if parent_rfx.type == 'rfi':
        next_type = 'rfp'
    elif parent_rfx.type == 'rfp':
        next_type = 'rfq'
    else:
        return Response(
            {'message': 'RFQ is the final stage in the workflow'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Create next stage RFx
    next_rfx = RFxEvent.objects.create(
        title=f"{next_type.upper()} - {parent_rfx.title}",
        reference_no=f"{next_type.upper()}-{int(time.time())}",
        type=next_type,
        scope=parent_rfx.scope,
        criteria=parent_rfx.criteria,
        bom=parent_rfx.bom,
        contact_person=parent_rfx.contact_person,
        budget=parent_rfx.budget,
        parent_rfx=parent_rfx,
        created_by=request.user,
        status='draft'
    )
    
    # Copy vendor invitations
    for invitation in parent_rfx.rfxinvitation_set.all():
        RFxInvitation.objects.create(
            rfx=next_rfx,
            vendor=invitation.vendor,
            status='invited'
        )
    
    serializer = self.get_serializer(next_rfx)
    return Response(serializer.data)

@action(detail=True, methods=['patch'])
def update_status(self, request, pk=None):
    """Update RFx status"""
    rfx = self.get_object()
    status_value = request.data.get('status')
    
    if rfx.created_by != request.user:
        return Response(
            {'message': 'You can only update status of your own RFx'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    if status_value not in ['draft', 'active', 'closed', 'cancelled']:
        return Response(
            {'message': 'Invalid status'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    rfx.status = status_value
    rfx.save()
    
    serializer = self.get_serializer(rfx)
    return Response(serializer.data)

@action(detail=True, methods=['post'])
def create_po(self, request, pk=None):
    """Create Purchase Order from RFx"""
    from procurement.apps.purchase_orders.models import PurchaseOrder, POLineItem
    from procurement.apps.purchase_orders.serializers import PurchaseOrderSerializer
    
    rfx = self.get_object()
    vendor_id = request.data.get('vendor_id')
    po_items = request.data.get('po_items', [])
    delivery_date = request.data.get('delivery_date')
    payment_terms = request.data.get('payment_terms', 'Net 30')
    notes = request.data.get('notes', '')
    priority = request.data.get('priority', 'medium')
    total_amount = request.data.get('total_amount', '0')
    
    if rfx.created_by != request.user:
        return Response(
            {'message': 'You can only create POs for your own RFx'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    if not po_items:
        return Response(
            {'message': 'At least one PO item is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Generate PO number
    po_number = f"PO-{int(time.time())}-{uuid.uuid4().hex[:5].upper()}"
    
    # Create Purchase Order
    purchase_order = PurchaseOrder.objects.create(
        po_number=po_number,
        vendor_id=vendor_id,
        rfx=rfx,
        total_amount=total_amount,
        status='pending_approval',
        priority=priority,
        delivery_date=delivery_date,
        payment_terms=payment_terms,
        terms_and_conditions=notes or f"Purchase Order created from RFx: {rfx.title}",
        created_by=request.user
    )
    
    # Create line items
    for item in po_items:
        POLineItem.objects.create(
            po=purchase_order,
            item_name=item.get('item_name'),
            quantity=item.get('quantity'),
            unit_price=item.get('unit_price'),
            total_price=item.get('total_price'),
            specifications=item.get('specifications', '')
        )
    
    serializer = PurchaseOrderSerializer(purchase_order)
    return Response(serializer.data)
