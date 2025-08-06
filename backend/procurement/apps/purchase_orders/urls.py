from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PurchaseOrderViewSet, POLineItemViewSet

router = DefaultRouter()
router.register(r'line-items', POLineItemViewSet)
router.register(r'', PurchaseOrderViewSet)

urlpatterns = [
    path('', include(router.urls)),
]