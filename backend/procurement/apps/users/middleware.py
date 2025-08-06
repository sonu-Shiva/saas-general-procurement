
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model

User = get_user_model()

class SessionAuthMiddleware:
    """Simple session-based authentication middleware for frontend compatibility"""
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # For now, create a test user for development
        if not request.user.is_authenticated:
            # Create or get a test user for development
            test_user, created = User.objects.get_or_create(
                username='testuser',
                defaults={
                    'email': 'test@example.com',
                    'first_name': 'Test',
                    'last_name': 'User',
                    'is_active': True
                }
            )
            request.user = test_user

        response = self.get_response(request)
        return response
