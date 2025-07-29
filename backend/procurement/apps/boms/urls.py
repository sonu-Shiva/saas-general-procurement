from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BOMViewSet, BOMItemViewSet

router = DefaultRouter()
router.register(r'items', BOMItemViewSet)
router.register(r'', BOMViewSet)

urlpatterns = [
    path('', include(router.urls)),
]