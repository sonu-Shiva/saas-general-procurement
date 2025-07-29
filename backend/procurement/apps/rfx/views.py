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