from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.http import HttpResponse, FileResponse
from .models import User, Test, Question, Submission, Payment, Announcement
from .serializers import (
    UserSerializer, TestSerializer, QuestionSerializer,
    SubmissionSerializer, PaymentSerializer,
    CreateTestSerializer, UpdateTestSerializer, CreateSubmissionSerializer,
    AnnouncementSerializer
)
from .utils import generate_pdf_report
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
                return Response(
                    TestSerializer(test).data,
                    status=status.HTTP_201_CREATED
                )
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
    
    @action(detail=True, methods=['post'])
    def finish(self, request, pk=None):
        """Testni yakunlash"""
        test = self.get_object()
        if not test.is_active:
            return Response({'error': 'Test allaqachon yakunlangan'}, status=status.HTTP_400_BAD_REQUEST)
            
        test.finish()
        return Response({'message': 'Test yakunlandi va hisobot yuborildi'}, status=status.HTTP_200_OK)

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
        """Foydalanuvchi to'lovlari"""
        user = get_object_or_404(User, telegram_id=telegram_id)
        payments = Payment.objects.filter(user=user).order_by('-created_at')
        serializer = self.get_serializer(payments, many=True)
        return Response(serializer.data)
    
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
