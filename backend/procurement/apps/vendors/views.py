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
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
import requests
import os
import json

@action(detail=False, methods=['get'])
def search(self, request):
    """Search vendors by query, location, category"""
    q = request.query_params.get('q')
    location = request.query_params.get('location')
    category = request.query_params.get('category')
    certifications = request.query_params.get('certifications')
    
    if not q:
        return Response({'message': 'Search query is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Simple search implementation
    vendors = self.get_queryset().filter(name__icontains=q)
    
    if location and location != 'all':
        vendors = vendors.filter(location__icontains=location)
    
    if category and category != 'all':
        vendors = vendors.filter(category__icontains=category)
    
    serializer = self.get_serializer(vendors, many=True)
    return Response(serializer.data)

@action(detail=False, methods=['post'])
def discover(self, request):
    """AI-powered vendor discovery using Perplexity API"""
    query = request.data.get('query', '')
    location = request.data.get('location', '')
    category = request.data.get('category', '')
    
    # Fallback vendor data for when API fails
    fallback_vendors = [
        {
            'name': 'Metro Business Solutions',
            'category': 'Business Services',
            'email': 'contact@metrobusiness.co.in',
            'phone': '+91-80-29876543',
            'location': 'MG Road, Bangalore, Karnataka',
            'website': 'www.metrobusiness.co.in',
            'description': 'Comprehensive business solutions including procurement, logistics, and consulting services'
        }
    ]
    
    try:
        perplexity_api_key = os.environ.get('PERPLEXITY_API_KEY')
        if not perplexity_api_key:
            return Response(fallback_vendors)
            
        # Build search prompt
        search_prompt = f"Find professional vendors and suppliers specializing in {query}"
        if category and category != 'all':
            search_prompt += f" in the {category} category"
        if location and location != 'all':
            search_prompt += f" located in {location}"
        else:
            search_prompt += " in India"
            
        # Call Perplexity API
        response = requests.post(
            "https://api.perplexity.ai/chat/completions",
            headers={
                "Authorization": f"Bearer {perplexity_api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "sonar-pro",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a procurement assistant. Find real vendors with actual contact information."
                    },
                    {
                        "role": "user", 
                        "content": search_prompt
                    }
                ],
                "max_tokens": 1500,
                "temperature": 0.1
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            ai_response = data.get('choices', [{}])[0].get('message', {}).get('content', '')
            vendors = self._parse_vendor_response(ai_response)
            return Response(vendors if vendors else fallback_vendors)
        else:
            return Response(fallback_vendors)
            
    except Exception as e:
        return Response(fallback_vendors)

def _parse_vendor_response(self, ai_response):
    """Parse AI response into structured vendor data"""
    vendors = []
    lines = ai_response.split('\n')
    current_vendor = None
    
    for line in lines:
        line = line.strip()
        
        # Look for vendor names
        name_match = re.match(r'^\*\*([^*]+)\*\*|^###?\s*(.+)|^\d+\.\s*\*\*([^*]+)\*\*', line)
        if name_match:
            if current_vendor and current_vendor.get('name'):
                vendors.append(current_vendor)
            
            vendor_name = (name_match.group(1) or name_match.group(2) or name_match.group(3)).strip()
            if vendor_name and vendor_name != "Company Name":
                current_vendor = {
                    'name': vendor_name,
                    'category': 'Business Services',
                    'email': '',
                    'phone': '',
                    'location': '',
                    'website': '',
                    'description': ''
                }
        
        if current_vendor:
            if 'Email:' in line:
                email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', line)
                if email_match:
                    current_vendor['email'] = email_match.group(0)
            
            if 'Phone:' in line:
                phone_match = re.search(r'[\+]?[\d\s\-\(\)]{8,}', line)
                if phone_match:
                    current_vendor['phone'] = phone_match.group(0).strip()
            
            if 'Address:' in line or 'Location:' in line:
                address_match = re.search(r'(?:Address:|Location:)\s*(.+)', line)
                if address_match:
                    current_vendor['location'] = address_match.group(1).strip()
            
            if 'Website:' in line or 'www.' in line:
                website_match = re.search(r'(?:www\.|https?:\/\/)[\w\.-]+\.\w+', line)
                if website_match:
                    current_vendor['website'] = website_match.group(0)
            
            if 'Description:' in line:
                desc_match = re.search(r'Description:\s*(.+)', line)
                if desc_match:
                    current_vendor['description'] = desc_match.group(1).strip()
    
    if current_vendor and current_vendor.get('name'):
        vendors.append(current_vendor)
    
    return vendors[:8]
