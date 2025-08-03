from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import json

@api_view(['GET'])
def get_current_user(request):
    """Get current authenticated user info - compatible with frontend expectations"""
    if request.user.is_authenticated:
        return Response({
            'id': str(request.user.id),
            'email': request.user.email,
            'firstName': request.user.first_name,
            'lastName': request.user.last_name,
            'username': request.user.username,
            'role': getattr(request.user, 'role', 'buyer_user'),  # Default role
            'isAuthenticated': True
        })
    else:
        return Response({'message': 'Unauthorized'}, status=401)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_user_role(request):
    """Update user role"""
    try:
        data = json.loads(request.body)
        role = data.get('role')

        if role in ['buyer_admin', 'buyer_user', 'sourcing_manager', 'vendor']:
            # In a real implementation, you'd update the user's role in the database
            # For now, we'll just return success
            return Response({'message': 'Role updated successfully'})
        else:
            return Response({'message': 'Invalid role'}, status=400)
    except Exception as e:
        return Response({'message': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def login_user(request):
    """Login endpoint - for compatibility, redirects to actual login"""
    return JsonResponse({'message': 'Use /api/auth/token/ for JWT authentication'})

@api_view(['POST'])
def logout_user(request):
    """Logout user"""
    logout(request)
    return Response({'message': 'Logged out successfully'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Get dashboard statistics"""
    # Return mock data for now - replace with actual data later
    return Response({
        'totalVendors': 0,
        'activeRfx': 0,
        'pendingApprovals': 0,
        'completedPOs': 0,
        'recentActivity': []
    })