from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views, admin_views

router = DefaultRouter()
router.register(r'users', views.UserViewSet, basename='user')
router.register(r'tests', views.TestViewSet, basename='test')
router.register(r'submissions', views.SubmissionViewSet, basename='submission')
router.register(r'payments', views.PaymentViewSet, basename='payment')
router.register(r'announcements', views.AnnouncementViewSet, basename='announcement')

urlpatterns = [
    path('', include(router.urls)),
    path('public-stats/', views.PublicStatsView.as_view(), name='public-stats'),
    path('health/', views.health_check, name='health_check'),
    
    # Admin routes
    path('admin/stats/', admin_views.AdminStatsView.as_view(), name='admin_stats'),
    path('admin/activity/', admin_views.AdminActivityLogView.as_view(), name='admin_activity'),
    path('admin/users/', admin_views.AdminUserListView.as_view(), name='admin_users'),
    path('admin/users/<int:telegram_id>/', admin_views.AdminUserUpdateView.as_view(), name='admin_user_update'),
    path('admin/broadcast/', admin_views.AdminBroadcastView.as_view(), name='admin_broadcast'),
    path('admin/broadcast/<int:pk>/', admin_views.AdminBroadcastView.as_view(), name='admin_broadcast_detail'),
    path('admin/broadcast/history/', admin_views.AdminBroadcastListView.as_view(), name='admin_broadcast_list'),
    path('admin/broadcast/<int:pk>/status/', admin_views.AdminBroadcastStatusView.as_view(), name='admin_broadcast_status'),
    path('admin/broadcast/<int:pk>/delete/', admin_views.AdminBroadcastDestroyView.as_view(), name='admin_broadcast_delete'),
    
    # Settings & Payment Receipts
    path('admin/settings/', admin_views.SystemSettingsView.as_view(), name='admin_settings'),
    path('admin/receipts/', admin_views.PaymentReceiptListView.as_view(), name='admin_receipts'),
    path('admin/receipts/upload/', admin_views.PaymentReceiptUploadView.as_view(), name='admin_receipt_upload'),
    path('admin/receipts/<int:pk>/verify/', admin_views.PaymentReceiptVerifyView.as_view(), name='admin_receipt_verify'),
]
