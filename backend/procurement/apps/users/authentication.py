"""
Custom authentication views to maintain compatibility with existing frontend.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User as DjangoUser
from django.contrib.auth import authenticate
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .models import User
from .serializers import UserSerializer

@api_view(['GET'])
@permission_classes([AllowAny])  # Temporarily allow any to test
def get_current_user(request):
    """Get current authenticated user information."""
    try:
        # For now, return a test user to verify frontend integration
        # In a real implementation, you'd extract user info from JWT token
        user_id = request.META.get('HTTP_AUTHORIZATION', '').replace('Bearer ', '') if 'HTTP_AUTHORIZATION' in request.META else None
        
        if not user_id:
            # Return a test user for now
            test_user = {
                'id': 'test-user-id',
                'email': 'admin@example.com',
                'first_name': 'Admin',
                'last_name': 'User',
                'role': 'buyer_admin',
                'profile_image_url': None,
                'organization_id': None,
                'is_active': True
            }
            return Response(test_user, status=status.HTTP_200_OK)
        
        # Try to get user from database
        user = User.objects.filter(email='admin@example.com').first()
        if user:
            serializer = UserSerializer(user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            return Response(
                {'message': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    except Exception as e:
        return Response(
            {'message': 'Failed to fetch user', 'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['PATCH'])
@permission_classes([AllowAny])  # Temporarily allow any to test
def update_user_role(request):
    """Update user role - for role switching functionality."""
    try:
        role = request.data.get('role')
        
        if not role or role not in ['buyer_admin', 'buyer_user', 'sourcing_manager', 'vendor']:
            return Response(
                {'message': 'Invalid role'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # For now, get or create test user
        user, created = User.objects.get_or_create(
            email='admin@example.com',
            defaults={
                'id': 'admin',
                'first_name': 'Admin',
                'last_name': 'User',
                'role': role,
                'is_active': True
            }
        )
        
        if not created:
            user.role = role
            user.save()
        
        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'message': 'Failed to update user role', 'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def login_user(request):
    """Login user and return tokens."""
    try:
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response(
                {'message': 'Username and password required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Simple authentication for testing - in production you'd use proper authentication
        if username == 'admin' and password == 'admin123':
            # Get or create test user
            user, created = User.objects.get_or_create(
                email='admin@example.com',
                defaults={
                    'id': 'admin',
                    'first_name': 'Admin',
                    'last_name': 'User',
                    'role': 'buyer_admin',
                    'is_active': True
                }
            )
            
            # Create a Django user for JWT token generation
            django_user, _ = DjangoUser.objects.get_or_create(
                username='admin',
                defaults={
                    'email': 'admin@example.com',
                    'first_name': 'Admin',
                    'last_name': 'User',
                    'is_staff': True,
                    'is_superuser': True
                }
            )
            django_user.set_password('admin123')
            django_user.save()
            
            refresh = RefreshToken.for_user(django_user)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {'message': 'Invalid credentials'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
            
    except Exception as e:
        return Response(
            {'message': 'Login failed', 'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def logout_user(request):
    """Logout user by blacklisting refresh token."""
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        
        return Response(
            {'message': 'Successfully logged out'}, 
            status=status.HTTP_200_OK
        )
    except Exception as e:
        return Response(
            {'message': 'Logout failed', 'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def dashboard_stats(request):
    """Get dashboard statistics for the authenticated user."""
    try:
        user = request.user
        
        # Basic stats - can be expanded based on user role
        stats = {
            'total_vendors': 0,
            'total_products': 0,
            'active_rfx': 0,
            'pending_orders': 0,
            'recent_activity': []
        }
        
        # Add role-specific stats
        if user.role == 'vendor':
            from procurement.apps.products.models import Product
            stats['total_products'] = Product.objects.filter(vendor__user=user).count()
        else:
            from procurement.apps.vendors.models import Vendor
            from procurement.apps.products.models import Product
            from procurement.apps.rfx.models import RfxEvent
            from procurement.apps.purchase_orders.models import PurchaseOrder
            
            stats['total_vendors'] = Vendor.objects.count()
            stats['total_products'] = Product.objects.count()
            stats['active_rfx'] = RfxEvent.objects.filter(status__in=['draft', 'published']).count()
            stats['pending_orders'] = PurchaseOrder.objects.filter(status='pending').count()
        
        return Response(stats, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'message': 'Failed to fetch dashboard stats', 'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )