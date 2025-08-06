from rest_framework import viewsets, permissions
from .models import Approval
from .serializers import ApprovalSerializer


class ApprovalViewSet(viewsets.ModelViewSet):
    queryset = Approval.objects.all()
    serializer_class = ApprovalSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter approvals based on user role"""
        # Only show approvals for the current user as approver
        return Approval.objects.filter(approver=self.request.user)