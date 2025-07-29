from rest_framework import serializers
from .models import Approval


class ApprovalSerializer(serializers.ModelSerializer):
    approver_name = serializers.CharField(source='approver.get_full_name', read_only=True)
    
    class Meta:
        model = Approval
        fields = [
            'id', 'entity_type', 'entity_id', 'approver', 'approver_name',
            'status', 'comments', 'approved_at', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'approver_name']