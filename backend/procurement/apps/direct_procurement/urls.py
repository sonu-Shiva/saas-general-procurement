
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DirectProcurementOrderViewSet

router = DefaultRouter()
router.register(r'', DirectProcurementOrderViewSet, basename='direct-procurement')

urlpatterns = [
    path('', include(router.urls)),
]
