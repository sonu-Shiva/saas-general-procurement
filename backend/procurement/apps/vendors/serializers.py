from rest_framework import serializers
from .models import Vendor


class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = [
            'id', 'company_name', 'contact_person', 'email', 'phone',
            'pan_number', 'gst_number', 'tan_number', 'bank_details',
            'address', 'categories', 'certifications', 'years_of_experience',
            'office_locations', 'status', 'tags', 'performance_score',
            'user', 'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']