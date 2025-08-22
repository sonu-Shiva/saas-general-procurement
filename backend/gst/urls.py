from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GSTMasterViewSet

router = DefaultRouter()
router.register(r'gst-masters', GSTMasterViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
]