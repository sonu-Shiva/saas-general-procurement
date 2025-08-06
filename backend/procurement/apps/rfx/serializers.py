from rest_framework import serializers
from .models import RFxEvent, RFxInvitation, RFxResponse


class RFxInvitationSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.company_name', read_only=True)
    vendor_email = serializers.CharField(source='vendor.email', read_only=True)
    
    class Meta:
        model = RFxInvitation
        fields = [
            'rfx', 'vendor', 'vendor_name', 'vendor_email', 'status',
            'invited_at', 'responded_at'
        ]
        read_only_fields = ['invited_at', 'vendor_name', 'vendor_email']


class RFxResponseSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.company_name', read_only=True)
    
    class Meta:
        model = RFxResponse
        fields = [
            'id', 'rfx', 'vendor', 'vendor_name', 'response', 'quoted_price',
            'delivery_terms', 'payment_terms', 'lead_time', 'attachments',
            'submitted_at'
        ]
        read_only_fields = ['id', 'submitted_at', 'vendor_name']


class RFxEventSerializer(serializers.ModelSerializer):
    invitations = RFxInvitationSerializer(many=True, read_only=True)
    responses = RFxResponseSerializer(many=True, read_only=True)
    bom_name = serializers.CharField(source='bom.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = RFxEvent
        fields = [
            'id', 'title', 'reference_no', 'type', 'scope', 'criteria',
            'due_date', 'status', 'evaluation_parameters', 'attachments',
            'bom', 'bom_name', 'contact_person', 'budget', 'parent_rfx',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
            'invitations', 'responses'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'bom_name', 'created_by_name', 'invitations', 'responses']