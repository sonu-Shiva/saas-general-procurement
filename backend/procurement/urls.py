"""
URL configuration for procurement project.
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from procurement.apps.users.authentication import (
    get_current_user, update_user_role, login_user, logout_user, dashboard_stats
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Authentication - JWT tokens
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Authentication - compatibility with frontend
    path('api/auth/user', get_current_user, name='current_user'),
    path('api/auth/user/role', update_user_role, name='update_user_role'),
    path('api/auth/login', login_user, name='login'),
    path('api/auth/logout', logout_user, name='logout'),
    path('api/dashboard/stats', dashboard_stats, name='dashboard_stats'),
    
    # App URLs
    path('api/users/', include('procurement.apps.users.urls')),
    path('api/vendors/', include('procurement.apps.vendors.urls')),
    path('api/products/', include('procurement.apps.products.urls')),
    path('api/boms/', include('procurement.apps.boms.urls')),
    path('api/rfx/', include('procurement.apps.rfx.urls')),
    path('api/auctions/', include('procurement.apps.auctions.urls')),
    path('api/purchase-orders/', include('procurement.apps.purchase_orders.urls')),
    path('api/approvals/', include('procurement.apps.approvals.urls')),
    path('api/notifications/', include('procurement.apps.notifications.urls')),
    path('api/direct-procurement/', include('procurement.apps.direct_procurement.urls')),
    path('api/', include('gst.urls')),
]