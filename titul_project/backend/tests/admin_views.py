from rest_framework import views, status, generics, parsers
from rest_framework.response import Response
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.db.models import Sum, Count
import json
from .models import User, Test, Submission, Payment, PaymentReceipt, ActivityLog, BroadcastHistory
from .tasks import send_broadcast_task, update_broadcast_task
from .serializers import UserSerializer
from .admin_serializers import AdminUserUpdateSerializer, AdminStatsSerializer, ActivityLogSerializer
from .permissions import IsAdminUser

class AdminStatsView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        now = timezone.now()
        seven_days_ago = now - timezone.timedelta(days=7)

        # Trend ma'lumotlarini hisoblash (Samaradorlik uchun bitta so'rovda)
        from django.db.models.functions import TruncDate
        
        user_trends_data = User.objects.filter(created_at__gte=seven_days_ago.date())\
            .annotate(date=TruncDate('created_at'))\
            .values('date')\
            .annotate(count=Count('id'))\
            .order_by('date')
        
        payment_trends_data = Payment.objects.filter(status='completed', completed_at__gte=seven_days_ago.date())\
            .annotate(date=TruncDate('completed_at'))\
            .values('date')\
            .annotate(sum=Sum('amount'))\
            .order_by('date')

        # Lug'at ko'rinishiga keltiramiz
        user_map = {item['date']: item['count'] for item in user_trends_data}
        payment_map = {item['date']: float(item['sum'] or 0) for item in payment_trends_data}

        user_trend = []
        payment_trend = []
        for i in range(7):
            day = (seven_days_ago + timezone.timedelta(days=i)).date()
            user_trend.append(user_map.get(day, 0))
            payment_trend.append(payment_map.get(day, 0.0))

        stats = {
            'total_users': User.objects.count(),
            'total_tests': Test.objects.count(),
            'total_submissions': Submission.objects.count(),
            'total_payments': Payment.objects.filter(status='completed').aggregate(Sum('amount'))['amount__sum'] or 0,
            'active_tests': Test.objects.filter(is_active=True).count(),
            'pending_payments': Payment.objects.filter(status='pending').count(),
            'user_trend': user_trend,
            'payment_trend': payment_trend,
        }
        serializer = AdminStatsSerializer(stats)
        return Response(serializer.data)

class AdminActivityLogView(generics.ListAPIView):
    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return ActivityLog.objects.all()[:20] # Oxirgi 20 tasi

class AdminUserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]
    
    def get_queryset(self):
        queryset = User.objects.all()
        search = self.request.query_params.get('search')
        role = self.request.query_params.get('role')
        min_balance = self.request.query_params.get('min_balance')
        max_balance = self.request.query_params.get('max_balance')

        if search:
            queryset = queryset.filter(full_name__icontains=search) | queryset.filter(telegram_id__icontains=search)
        if role:
            queryset = queryset.filter(role=role)
        if min_balance:
            queryset = queryset.filter(balance__gte=min_balance)
        if max_balance:
            queryset = queryset.filter(balance__lte=max_balance)

        return queryset.order_by('-created_at')

class AdminUserUpdateView(generics.UpdateAPIView):
    queryset = User.objects.all()
    serializer_class = AdminUserUpdateSerializer
    permission_classes = [IsAdminUser]
    lookup_field = 'telegram_id'

    def perform_update(self, serializer):
        # Rolni o'zgartirish faqat Superadmin uchun
        if 'role' in self.request.data:
            new_role = self.request.data.get('role')
            current_role = serializer.instance.role

            if new_role != current_role:
                admin_id = self.request.headers.get('X-Telegram-Id')
                try:
                    admin_user = User.objects.get(telegram_id=admin_id)
                    if admin_user.role != 'superadmin':
                        from rest_framework.exceptions import PermissionDenied
                        raise PermissionDenied("Faqat Superadmin rollarni o'zgartira oladi.")
                except User.DoesNotExist:
                    from rest_framework.exceptions import PermissionDenied
                    raise PermissionDenied("Admin topilmadi.")
        
        serializer.save()

class AdminBroadcastView(views.APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [parsers.MultiPartParser, parsers.JSONParser]

    def post(self, request):
        message = request.data.get('message')
        target_roles = request.data.get('target_roles', '["all"]') # Multipartda string bo'lib kelishi mumkin
        if isinstance(target_roles, str):
            try:
                target_roles = json.loads(target_roles)
            except:
                target_roles = ['all']

        image = request.FILES.get('image')
        file = request.FILES.get('file')
        
        if not message:
            return Response({'error': 'Xabar kiritilmadi'}, status=status.HTTP_400_BAD_REQUEST)
        
        admin_id = request.headers.get('X-Telegram-Id')
        try:
            admin_user = User.objects.get(telegram_id=admin_id)
        except User.DoesNotExist:
            return Response({'error': 'Admin topilmadi'}, status=status.HTTP_404_NOT_FOUND)

        # Broadcast record yaratish
        broadcast = BroadcastHistory.objects.create(
            admin=admin_user,
            message=message,
            target_roles=target_roles,
            image=image,
            file=file,
            status='pending'
        )
        
        # Celery taskni ishga tushirish
        send_broadcast_task.delay(broadcast.id)
        
        return Response({
            'success': True,
            'broadcast_id': broadcast.id,
            'message': 'Xabar yuborish navbatga qo\'shildi'
        })

    def patch(self, request, pk=None):
        """Yuborilgan xabarni tahrirlash (matn va media)"""
        try:
            from .models import BroadcastHistory
            broadcast = BroadcastHistory.objects.get(pk=pk)
        except BroadcastHistory.DoesNotExist:
            return Response({'error': 'Topilmadi'}, status=status.HTTP_404_NOT_FOUND)

        message = request.data.get('message')
        if not message:
            return Response({'error': 'Matn kiritilmadi'}, status=status.HTTP_400_BAD_REQUEST)

        image = request.FILES.get('image')
        file = request.FILES.get('file')

        broadcast.message = message
        if image:
            broadcast.image = image
        if file:
            broadcast.file = file
        
        broadcast.save()

        update_broadcast_task.delay(broadcast.id)

        return Response({'success': True, 'message': 'Tahrirlash jarayoni boshlandi'})

class AdminBroadcastListView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from .models import BroadcastHistory
        broadcasts = BroadcastHistory.objects.all()[:50] # Oxirgi 50 tasi
        data = [{
            'id': b.id,
            'message': b.message[:50] + '...' if len(b.message) > 50 else b.message,
            'status': b.status,
            'total_users': b.total_users,
            'success_count': b.success_count,
            'fail_count': b.fail_count,
            'target_roles': b.target_roles,
            'has_image': bool(b.image),
            'has_file': bool(b.file),
            'created_at': b.created_at
        } for b in broadcasts]
        return Response(data)

class AdminBroadcastDestroyView(views.APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, pk):
        from .models import BroadcastHistory
        try:
            broadcast = BroadcastHistory.objects.get(pk=pk)
            # Media fayllarni o'chirish
            if broadcast.image:
                broadcast.image.delete(save=False)
            if broadcast.file:
                broadcast.file.delete(save=False)
            broadcast.delete()
            return Response({'success': True})
        except BroadcastHistory.DoesNotExist:
            return Response({'error': 'Topilmadi'}, status=status.HTTP_404_NOT_FOUND)

class AdminBroadcastStatusView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        from .models import BroadcastHistory
        try:
            broadcast = BroadcastHistory.objects.get(pk=pk)
            return Response({
                'id': broadcast.id,
                'status': broadcast.status,
                'total_users': broadcast.total_users,
                'success_count': broadcast.success_count,
                'fail_count': broadcast.fail_count,
                'created_at': broadcast.created_at,
                'completed_at': broadcast.completed_at
            })
        except BroadcastHistory.DoesNotExist:
            return Response({'error': 'Topilmadi'}, status=status.HTTP_404_NOT_FOUND)

class SystemSettingsView(views.APIView):
    """Tizim sozlamalarini ko'rish va o'zgartirish (Faqat Superadmin)"""
    def get_permissions(self):
        if self.request.method == 'GET':
            return [] # Hamma ko'ra oladi (Karta raqami uchun)
        return [IsAdminUser()]

    def get(self, request):
        from .models import SystemSettings
        from .serializers import SystemSettingsSerializer
        settings = SystemSettings.objects.first()
        if not settings:
            settings = SystemSettings.objects.create()
        serializer = SystemSettingsSerializer(settings)
        return Response(serializer.data)

    def patch(self, request):
        from .models import SystemSettings
        from .serializers import SystemSettingsSerializer
        from rest_framework.exceptions import PermissionDenied
        
        # Superadmin check
        admin_id = request.headers.get('X-Telegram-Id')
        try:
            admin_user = User.objects.get(telegram_id=admin_id)
            if admin_user.role != 'superadmin':
                raise PermissionDenied("Faqat Superadmin sozlamalarni o'zgartira oladi.")
        except User.DoesNotExist:
             raise PermissionDenied("Admin topilmadi.")

        settings = SystemSettings.objects.first()
        if not settings:
            settings = SystemSettings.objects.create()
        
        serializer = SystemSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PaymentReceiptUploadView(views.APIView):
    """Botdan kelgan chekni saqlash"""
    parser_classes = [parsers.MultiPartParser]

    def post(self, request):
        from .models import PaymentReceipt, User
        telegram_id = request.data.get('user_telegram_id')
        image = request.FILES.get('receipt_image')

        if not telegram_id or not image:
            return Response({'error': 'Ma\'lumotlar to\'liq emas'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(telegram_id=telegram_id)
        except User.DoesNotExist:
            return Response({'error': 'Foydalanuvchi topilmadi'}, status=status.HTTP_404_NOT_FOUND)

        receipt = PaymentReceipt.objects.create(
            user=user,
            receipt_image=image,
            status='pending'
        )

        return Response({
            'success': True,
            'receipt_id': receipt.id,
            'message': 'Chek qabul qilindi'
        }, status=status.HTTP_201_CREATED)

class PaymentReceiptListView(generics.ListAPIView):
    """Kutilayotgan va o'tgan to'lov cheklari (Barcha Adminlar)"""
    from .models import PaymentReceipt
    from .serializers import PaymentReceiptSerializer
    queryset = PaymentReceipt.objects.all()
    serializer_class = PaymentReceiptSerializer
    permission_classes = [IsAdminUser]

class PaymentReceiptVerifyView(views.APIView):
    """Chekni tasdiqlash yoki rad etish (Barcha Adminlar)"""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        from .models import PaymentReceipt
        from django.utils import timezone
        
        action = request.data.get('action') # 'accept' or 'reject'
        comment = request.data.get('comment', '')
        amount = request.data.get('amount') # Admin tomonidan kiritilgan summa

        admin_id = request.headers.get('X-Telegram-Id')
        try:
            admin_user = User.objects.get(telegram_id=admin_id)
        except User.DoesNotExist:
            return Response({'error': 'Admin topilmadi'}, status=status.HTTP_404_NOT_FOUND)

        try:
            with transaction.atomic():
                # Race condition oldini olish uchun lock qilamiz va statusni tekshiramiz
                try:
                    receipt = PaymentReceipt.objects.select_for_update().get(pk=pk)
                except PaymentReceipt.DoesNotExist:
                    return Response({'error': 'Chek topilmadi'}, status=status.HTTP_404_NOT_FOUND)
                if receipt.status != 'pending':
                    return Response({
                        'error': f"Bu chek allaqachon '{receipt.status}' holatiga o'tkazilgan. Uni qayta tasdiqlab bo'lmaydi."
                    }, status=status.HTTP_400_BAD_REQUEST)

                if action == 'accept':
                    if not amount:
                        return Response({'error': 'Summa kiritilmadi'}, status=status.HTTP_400_BAD_REQUEST)
                    
                    receipt.status = 'accepted'
                    receipt.amount = amount
                    receipt.verified_at = timezone.now()
                    receipt.verified_by = admin_user
                    receipt.admin_comment = comment
                    receipt.save()

                    # User balansini oshirish
                    user = receipt.user
                    user.balance += Decimal(str(amount))
                    user.save()

                    # Jami statistikani hisoblash
                    total_stats = PaymentReceipt.objects.filter(user=user, status='accepted').aggregate(
                         total_amount=Sum('amount'),
                         total_count=Count('id')
                    )
                    total_amount = total_stats['total_amount'] or 0
                    total_count = total_stats['total_count'] or 0

                    # Bildirishnoma yuborish (Celery yo'qligi sababli sinxron)
                    msg = f"✅ <b>To'lov tasdiqlandi!</b>\n\n"
                    msg += f"Sizning hisobingizga {amount} so'm qo'shildi.\n"
                    msg += f"Joriy balans: <b>{user.balance} so'm</b>\n\n"
                    msg += f"📊 <b>Umumiy statistika:</b>\n"
                    msg += f"• Jami to'lovlar soni: {total_count} ta\n"
                    msg += f"• Jami to'langan summa: {total_amount} so'm"
                    
                    try:
                         from .tasks import send_payment_notification_task
                         send_payment_notification_task.delay(user.telegram_id, msg)
                    except:
                         pass

                    ActivityLog.objects.create(
                        event_type='payment_verified',
                        user=user,
                        description=f"To'lov tasdiqlandi: {user.full_name} ({amount} so'm)",
                        metadata={'receipt_id': receipt.id, 'amount': float(amount), 'telegram_id': user.telegram_id}
                    )

                    return Response({
                        'success': True, 
                        'message': 'To\'lov tasdiqlandi',
                        'user_telegram_id': user.telegram_id,
                        'amount': amount,
                        'new_balance': user.balance
                    })

                elif action == 'reject':
                    receipt.status = 'rejected'
                    receipt.verified_at = timezone.now()
                    receipt.verified_by = admin_user
                    receipt.admin_comment = comment
                    receipt.save()

                    # Bildirishnoma yuborish (Sinxron)
                    msg = f"❌ <b>To'lov rad etildi.</b>\n\nSababi: {comment}"
                    try:
                         from .tasks import send_payment_notification_task
                         send_payment_notification_task.delay(receipt.user.telegram_id, msg)
                    except:
                         pass

                    return Response({
                        'success': True, 
                        'message': 'Rad etildi',
                        'user_telegram_id': receipt.user.telegram_id
                    })
        except Exception as e:
            return Response({'error': f"Xatolik yuz berdi: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'error': 'Noto\'g\'ri amal'}, status=status.HTTP_400_BAD_REQUEST)
