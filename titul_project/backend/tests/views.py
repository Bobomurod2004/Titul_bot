from rest_framework import viewsets, status, serializers, views
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.http import HttpResponse, FileResponse
from .models import User, Test, Question, Submission, Payment, Announcement, ActivityLog
from .serializers import (
    UserSerializer, TestSerializer, QuestionSerializer,
    SubmissionSerializer, PaymentSerializer,
    CreateTestSerializer, UpdateTestSerializer, CreateSubmissionSerializer,
    AnnouncementSerializer
)
from .utils import generate_pdf_report
from .rasch_service import calibrate_test_items, calculate_rasch_scores
import logging

logger = logging.getLogger(__name__)


class UserViewSet(viewsets.ModelViewSet):
    """Foydalanuvchilar CRUD"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    lookup_field = 'telegram_id'
    
    def create(self, request):
        """Yangi foydalanuvchi yaratish yoki mavjudini qaytarish"""
        telegram_id = request.data.get('telegram_id')
        if not telegram_id:
            return Response({'error': 'telegram_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        user, created = User.objects.get_or_create(
            telegram_id=telegram_id,
            defaults={
                'full_name': request.data.get('full_name', f'User {telegram_id}'),
                'role': request.data.get('role', 'teacher')
            }
        )
        
        if created:
            ActivityLog.objects.create(
                event_type='user_registered',
                user=user,
                description=f"Yangi foydalanuvchi ro'yxatdan o'tdi: {user.full_name}",
                metadata={'telegram_id': user.telegram_id, 'role': user.role}
            )
        
        serializer = self.get_serializer(user)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class TestViewSet(viewsets.ModelViewSet):
    """Testlar CRUD"""
    queryset = Test.objects.all().select_related('creator').prefetch_related('questions')
    serializer_class = TestSerializer
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateTestSerializer
        if self.action in ['update', 'partial_update']:
            return UpdateTestSerializer
        return TestSerializer
    
    def create(self, request):
        """Test yaratish"""
        serializer = CreateTestSerializer(data=request.data)
        if serializer.is_valid():
            try:
                test = serializer.save()
                ActivityLog.objects.create(
                    event_type='test_created',
                    user=test.creator,
                    description=f"Yangi test yaratildi: {test.title} ({test.access_code})",
                    metadata={'test_id': test.id, 'access_code': test.access_code}
                )
                return Response(
                    TestSerializer(test).data,
                    status=status.HTTP_201_CREATED
                )
            except serializers.ValidationError as e:
                # Serializer ichidagi ValidationError holatini ushlash (masalan, balans yetarli emasligi)
                return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                logger.error(f"Test yaratishda xatolik: {str(e)}")
                return Response({'detail': f"Server xatoligi: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Batafsil xatolik xabarlarini ko'rsatish
        errors = serializer.errors
        if errors:
            # Xatolik xabarlarini rekursiv ravishda olish
            def extract_error_message(error_data, parent_key=""):
                """Nested xatoliklarni chiroyli formatda olish"""
                if isinstance(error_data, str):
                    return error_data
                elif isinstance(error_data, list):
                    # List ichidagi har bir elementni tekshirish
                    for idx, item in enumerate(error_data):
                        if isinstance(item, dict) and item:  # Bo'sh dict emas
                            # Questions list uchun savol raqamini qo'shish
                            prefix = f"{idx + 1}-savol: " if parent_key == "questions" else ""
                            nested_msg = extract_error_message(item, "")
                            if nested_msg and nested_msg != "Ma'lumotlarda xatolik":
                                return prefix + nested_msg
                        elif isinstance(item, str):
                            return item
                    return None
                elif isinstance(error_data, dict):
                    for key, value in error_data.items():
                        nested_msg = extract_error_message(value, key)
                        if nested_msg:
                            # Field nomlarini o'zbekchaga tarjima qilish
                            field_translations = {
                                'correct_answer': "To'g'ri javob",
                                'points': 'Ball',
                                'question_type': 'Savol turi',
                                'question_number': 'Savol raqami'
                            }
                            field_name = field_translations.get(key, key)
                            
                            # Agar xabar allaqachon tarjima qilingan bo'lsa
                            if "This field may not be blank" in nested_msg:
                                return f"{field_name} bo'sh bo'lmasligi kerak"
                            elif "This field is required" in nested_msg:
                                return f"{field_name} majburiy"
                            else:
                                return nested_msg
                return "Ma'lumotlarda xatolik"

            
            error_msg = extract_error_message(errors)
            return Response({'detail': error_msg}, status=status.HTTP_400_BAD_REQUEST)
            
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], url_path='code/(?P<access_code>[^/.]+)')
    def by_code(self, request, access_code=None):
        """Access code orqali test olish"""
        test = get_object_or_404(Test, access_code=access_code)
        test.is_expired()  # Avtomatik yakunlanishni tekshirish
        serializer = self.get_serializer(test)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='user/(?P<telegram_id>[^/.]+)')
    def user_tests(self, request, telegram_id=None):
        """Foydalanuvchi testlari"""
        if not str(telegram_id).isdigit():
            return Response({'error': 'Telegram ID raqam bo\'lishi kerak'}, status=status.HTTP_400_BAD_REQUEST)
            
        user = get_object_or_404(User, telegram_id=telegram_id)
        tests = Test.objects.filter(creator=user).order_by('-created_at')
        
        # Har bir faol testni muddatini tekshirish
        for test in tests:
            if test.is_active:
                test.is_expired()
                
        serializer = self.get_serializer(tests, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], url_path='id')
    def get_by_id(self, request, pk=None):
        """ID orqali test olish"""
        test = self.get_object()
        test.is_expired() # Muddatni tekshirish
        serializer = self.get_serializer(test)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='check_status/(?P<telegram_id>[^/.]+)')
    def check_attempt_status(self, request, pk=None, telegram_id=None):
        """Talaba ushbu testni topshirganmi yoki yo'q tekshirish"""
        test = self.get_object()
        
        # Telegram ID raqam ekanligini tekshirish (500 xatolikni oldini olish uchun)
        if not str(telegram_id).isdigit():
            # Agar ID raqam bo'lmasa (masalan, kutilmaganda test kodi kelib qolsa)
            # Biz buni "yangi urinish" sifatida ko'rsatamiz (yoki 400 qaytaramiz)
            # Frontend kodi noto'g'ri bo'lganda bu xatolikni oldini oladi
            return Response({
                'can_submit': True,
                'existing_attempts_count': 0,
                'submission_mode': test.submission_mode,
                'is_active': test.is_active,
                'is_expired': test.is_expired(),
                'warning': 'Invalid Telegram ID format'
            })

        student_name = request.query_params.get('student_name', '').strip()
        query = test.submissions.filter(student_telegram_id=telegram_id)
        if str(telegram_id) == '0' and student_name:
            query = query.filter(student_name__iexact=student_name)
            
        submissions = query.order_by('attempt_number')
        
        can_submit = True
        if test.submission_mode == 'single':
            if str(telegram_id) != '0':
                if submissions.exists():
                    can_submit = False
            elif student_name:
                # Veb foydalanuvchisi uchun (ID=0) ism bo'yicha tekshirish
                if test.submissions.filter(student_name__iexact=student_name).exists():
                    can_submit = False
            
        return Response({
            'can_submit': can_submit,
            'existing_attempts_count': submissions.count(),
            'submission_mode': test.submission_mode,
            'is_active': test.is_active,
            'is_expired': test.is_expired()
        })
    
    @action(detail=True, methods=['post'])
    def finish(self, request, pk=None):
        """Testni yakunlash"""
        test = self.get_object()
        if not test.is_active:
            return Response({'error': 'Test allaqachon yakunlangan'}, status=status.HTTP_400_BAD_REQUEST)
            
        test.finish()
        ActivityLog.objects.create(
            event_type='test_finished',
            user=test.creator,
            description=f"Test yakunlandi: {test.title} ({test.access_code})",
            metadata={'test_id': test.id, 'access_code': test.access_code}
        )
        # Test yakunlanganda avtomatik Rasch kalibratsiyasini boshlash
        try:
            calibrate_test_items(test)
            calculate_rasch_scores(test)
        except Exception as e:
            logger.error(f"Rasch calibration error after finish: {e}")
            
        return Response({'message': 'Test yakunlandi, hisobot yuborildi va Rasch modeli bo\'yicha hisoblandi'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def calibrate(self, request, pk=None):
        """Testni qo'lda kalibratsiya qilish va ballarni qayta hisoblash"""
        test = self.get_object()
        try:
            if calibrate_test_items(test):
                calculate_rasch_scores(test)
                return Response({'message': 'Test muvaffaqiyatli kalibratsiya qilindi va natijalar yangilandi'})
            return Response({'error': 'Kalibratsiya uchun yetarli ma\'lumot mavjud emas'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Manual calibration error: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        """Test natijalari (submissions)"""
        test = self.get_object()
        submissions = Submission.objects.filter(test=test).order_by('-score')
        serializer = SubmissionSerializer(submissions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def send_report(self, request, pk=None):
        """Hisobotni bot orqali qayta yuborish"""
        test = self.get_object()
        try:
            from .tasks import process_test_results_task
            process_test_results_task.delay(test.id)
            return Response({'message': 'Hisobot yuborish jarayoni boshlandi'})
        except Exception as e:
            logger.error(f"Manual send_report error: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def report(self, request, pk=None):
        """Testning PDF hisoboti"""
        test = self.get_object()
        submissions = test.submissions.all().order_by('-score')
        try:
            from .utils import generate_pdf_report
            pdf_buffer = generate_pdf_report(test, submissions)
            response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="natijalar_{test.access_code}.pdf"'
            return response
        except Exception as e:
            logger.error(f"PDF generation error: {e}")
            return Response({'error': 'PDF yaratishda xatolik'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SubmissionViewSet(viewsets.ModelViewSet):
    """Javoblar CRUD"""
    queryset = Submission.objects.all().select_related('test')
    serializer_class = SubmissionSerializer
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateSubmissionSerializer
        return SubmissionSerializer
    
    def create(self, request):
        """Javob yuborish"""
        serializer = CreateSubmissionSerializer(data=request.data)
        if serializer.is_valid():
            submission = serializer.save()
            return Response(
                SubmissionSerializer(submission).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], url_path='test/(?P<test_id>[^/.]+)')
    def by_test(self, request, test_id=None):
        """Test bo'yicha barcha javoblar"""
        submissions = Submission.objects.filter(test_id=test_id).order_by('-score')
        serializer = self.get_serializer(submissions, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='test/(?P<test_id>[^/.]+)/report')
    def report_by_test(self, request, test_id=None): # Renamed to avoid confusion
        """PDF hisobot yuklab olish (Test ID orqali)"""
        test = get_object_or_404(Test, id=test_id)
        submissions = Submission.objects.filter(test=test).order_by('-score')
        
        try:
            from .utils import generate_pdf_report
            pdf_buffer = generate_pdf_report(test, submissions)
            response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="natijalar_{test.access_code}.pdf"'
            return response
        except Exception as e:
            logger.error(f"PDF generation error: {e}")
            return Response({'error': 'PDF yaratishda xatolik'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def report(self, request, pk=None):
        """Ushbu javobga tegishli testning umumiy PDF hisoboti"""
        submission = self.get_object()
        test = submission.test
        submissions = Submission.objects.filter(test=test).order_by('-score')
        
        try:
            from .utils import generate_pdf_report
            pdf_buffer = generate_pdf_report(test, submissions)
            response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="natijalar_{test.access_code}.pdf"'
            return response
        except Exception as e:
            logger.error(f"PDF generation error: {e}")
            return Response({'error': 'PDF yaratishda xatolik'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PaymentViewSet(viewsets.ModelViewSet):
    """To'lovlar CRUD"""
    queryset = Payment.objects.all().select_related('user')
    serializer_class = PaymentSerializer
    
    @action(detail=False, methods=['get'], url_path='user/(?P<telegram_id>[^/.]+)')
    def user_payments(self, request, telegram_id=None):
        """Foydalanuvchi to'lovlari (Online + Manual)"""
        user = get_object_or_404(User, telegram_id=telegram_id)
        
        # 1. Online to'lovlar (Payment modeli)
        online_payments = Payment.objects.filter(user=user).order_by('-created_at')
        online_data = PaymentSerializer(online_payments, many=True).data
        for item in online_data:
            item['type'] = 'online'
            item['timestamp'] = item['created_at']

        # 2. Manual to'lovlar (PaymentReceipt modeli - faqat tasdiqlanganlar)
        from .models import PaymentReceipt
        from .serializers import PaymentReceiptSerializer
        manual_receipts = PaymentReceipt.objects.filter(user=user).order_by('-created_at')
        manual_data = PaymentReceiptSerializer(manual_receipts, many=True).data
        for item in manual_data:
            item['type'] = 'manual'
            item['timestamp'] = item['created_at']
            # Payment modeliga moslashtirish (Bot UI uchun)
            if 'receipt_image' in item:
                item['payment_method'] = 'Chek orqali'

        # Hammasini birlashtirish va vaqt bo'yicha tartiblash
        combined_history = sorted(
            online_data + manual_data, 
            key=lambda x: x['timestamp'], 
            reverse=True
        )
        
        return Response(combined_history)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """To'lovni tasdiqlash"""
        payment = self.get_object()
        payment.complete()
        return Response({'message': 'To\'lov tasdiqlandi'}, status=status.HTTP_200_OK)


class AnnouncementViewSet(viewsets.ReadOnlyModelViewSet):
    """Tizim e'lonlari (faqat o'qish uchun API)"""
    queryset = Announcement.objects.filter(is_active=True).order_by('order', '-created_at')
    serializer_class = AnnouncementSerializer


@api_view(['GET'])
def health_check(request):
    """Health check endpoint"""
    return Response({'status': 'ok', 'message': 'Titul Test Bot API is running'})

class PublicStatsView(views.APIView):
    """Barcha uchun ochiq statistika (Landing page uchun)"""
    def get(self, request):
        return Response({
            'total_users': User.objects.count(), 
            'total_tests': Test.objects.count(),
            'total_submissions': Submission.objects.count(),
        })
