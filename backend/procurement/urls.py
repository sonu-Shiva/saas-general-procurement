"""
URL configuration for procurement project.
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Authentication
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
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
]