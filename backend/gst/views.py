from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q
from decimal import Decimal

from .models import GSTMaster
from .serializers import (
    GSTMasterSerializer, GSTCalculationSerializer, 
    GSTCalculationResponseSerializer, GSTLookupSerializer
)
from procurement.apps.users.permissions import IsAdmin

class GSTMasterViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing GST Master configurations
    Only Admin users can perform CRUD operations
    """
    queryset = GSTMaster.objects.all()
    serializer_class = GSTMasterSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        """Filter GST masters based on query parameters"""
        queryset = GSTMaster.objects.all()
        
        # Filter by HSN code
        hsn_code = self.request.query_params.get('hsn_code')
        if hsn_code:
            queryset = queryset.filter(hsn_code__icontains=hsn_code)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by effective date range
        effective_date = self.request.query_params.get('effective_date')
        if effective_date:
            try:
                from datetime import datetime
                date_obj = datetime.strptime(effective_date, '%Y-%m-%d').date()
                queryset = queryset.filter(
                    effective_from__lte=date_obj
                ).filter(
                    Q(effective_to__isnull=True) | Q(effective_to__gte=date_obj)
                )
            except ValueError:
                pass
        
        return queryset.order_by('hsn_code', '-effective_from')
    
    def perform_create(self, serializer):
        """Set created_by field when creating GST master"""
        user_email = getattr(self.request.user, 'email', 'system')
        serializer.save(created_by=user_email)
    
    def perform_update(self, serializer):
        """Set updated_by field when updating GST master"""
        user_email = getattr(self.request.user, 'email', 'system')
        serializer.save(updated_by=user_email)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def calculate_tax(self, request):
        """
        Calculate GST tax for a given amount and HSN code
        Available to all authenticated users
        """
        serializer = GSTCalculationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        hsn_code = data['hsn_code']
        amount = data['amount']
        is_interstate = data['is_interstate']
        effective_date = data.get('effective_date', timezone.now().date())
        
        # Find active GST configuration
        gst_config = GSTMaster.get_active_gst_for_hsn(hsn_code, effective_date)
        if not gst_config:
            return Response(
                {'error': f'No active GST configuration found for HSN code: {hsn_code}'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Calculate tax breakdown
        tax_calculation = gst_config.calculate_tax(amount, is_interstate)
        
        # Prepare response
        response_data = {
            'hsn_code': gst_config.hsn_code,
            'hsn_description': gst_config.hsn_description,
            'uom': gst_config.uom,
            'transaction_type': 'interstate' if is_interstate else 'domestic',
            **tax_calculation
        }
        
        response_serializer = GSTCalculationResponseSerializer(response_data)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def lookup_hsn(self, request):
        """
        Lookup GST configuration by HSN code
        Available to all authenticated users
        """
        serializer = GSTLookupSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        hsn_code = data['hsn_code']
        effective_date = data.get('effective_date', timezone.now().date())
        
        # Find active GST configuration
        gst_config = GSTMaster.get_active_gst_for_hsn(hsn_code, effective_date)
        if not gst_config:
            return Response(
                {'error': f'No active GST configuration found for HSN code: {hsn_code}'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = GSTMasterSerializer(gst_config)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def hsn_codes(self, request):
        """
        Get list of all HSN codes for dropdown/autocomplete
        Available to all authenticated users
        """
        hsn_codes = GSTMaster.objects.filter(
            status='active'
        ).values_list('hsn_code', flat=True).distinct().order_by('hsn_code')
        
        return Response(list(hsn_codes), status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def active_configurations(self, request):
        """
        Get all active GST configurations for current date
        Available to all authenticated users
        """
        today = timezone.now().date()
        active_configs = GSTMaster.objects.filter(
            status='active',
            effective_from__lte=today
        ).filter(
            Q(effective_to__isnull=True) | Q(effective_to__gte=today)
        ).order_by('hsn_code')
        
        serializer = GSTMasterSerializer(active_configs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)