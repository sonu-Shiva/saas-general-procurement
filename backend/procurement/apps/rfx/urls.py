from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RFxEventViewSet, RFxInvitationViewSet, RFxResponseViewSet

router = DefaultRouter()
router.register(r'events', RFxEventViewSet)
router.register(r'invitations', RFxInvitationViewSet)
router.register(r'responses', RFxResponseViewSet)

urlpatterns = [
    path('', include(router.urls)),
]