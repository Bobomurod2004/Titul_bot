from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'users', views.UserViewSet, basename='user')
router.register(r'tests', views.TestViewSet, basename='test')
router.register(r'submissions', views.SubmissionViewSet, basename='submission')
router.register(r'payments', views.PaymentViewSet, basename='payment')
router.register(r'announcements', views.AnnouncementViewSet, basename='announcement')

urlpatterns = [
    path('', include(router.urls)),
    path('health/', views.health_check, name='health_check'),
]
