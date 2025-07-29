from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Vendor
from .serializers import VendorSerializer


class VendorViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search vendors by query parameters"""
        query = request.query_params.get('q', '')
        location = request.query_params.get('location', '')
        category = request.query_params.get('category', '')
        certifications = request.query_params.get('certifications', '')
        
        queryset = self.get_queryset()
        
        if query:
            queryset = queryset.filter(
                Q(company_name__icontains=query) |
                Q(contact_person__icontains=query) |
                Q(email__icontains=query)
            )
        
        if location:
            queryset = queryset.filter(
                Q(address__icontains=location) |
                Q(office_locations__contains=[location])
            )
        
        if category:
            queryset = queryset.filter(categories__contains=[category])
        
        if certifications:
            cert_list = certifications.split(',')
            for cert in cert_list:
                queryset = queryset.filter(certifications__contains=[cert.strip()])
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def get_queryset(self):
        """Filter vendors based on user role"""
        if self.request.user.role == 'vendor':
            return Vendor.objects.filter(user=self.request.user)
        return Vendor.objects.all()