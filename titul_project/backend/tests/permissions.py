from rest_framework import permissions

class IsAdminUser(permissions.BasePermission):
    """
    Ruxsat: Faqat admin yoki superadmin rollariga ega foydalanuvchilar uchun.
    Hozircha telegram_id orqali tekshiramiz (soddalashtirilgan variant).
    """
    def has_permission(self, request, view):
        telegram_id = request.headers.get('X-Telegram-Id') or request.query_params.get('telegram_id')
        if not telegram_id:
            return False
            
        try:
            from .models import User
            user = User.objects.get(telegram_id=telegram_id)
            return user.is_admin
        except User.DoesNotExist:
            return False

class IsSuperAdmin(permissions.BasePermission):
    """
    Ruxsat: Faqat superadmin roli uchun.
    """
    def has_permission(self, request, view):
        telegram_id = request.headers.get('X-Telegram-Id') or request.query_params.get('telegram_id')
        if not telegram_id:
            return False
            
        try:
            from .models import User
            user = User.objects.get(telegram_id=telegram_id)
            return user.role == 'superadmin'
        except User.DoesNotExist:
            return False
