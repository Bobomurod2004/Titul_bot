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
        
        # Validation xatolarini chiroyli ko'rsatish
        errors = serializer.errors
        if errors:
            # Birinchi xatoni olish
            field, field_errors = next(iter(errors.items()))
            error_msg = f"{field}: {field_errors[0]}"
            return Response({'detail': f"Ma'lumotlarda xatolik - {error_msg}"}, status=status.HTTP_400_BAD_REQUEST)
            
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
        serializer = self.get_serializer(tests, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], url_path='id')
    def get_by_id(self, request, pk=None):
        """ID orqali test olish"""
        test = self.get_object()
        serializer = self.get_serializer(test)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def finish(self, request, pk=None):
        """Testni yakunlash va hisobot yuborish"""
        test = self.get_object()
        if not test.is_active:
            return Response({'error': 'Test allaqachon yakunlangan'}, status=status.HTTP_400_BAD_REQUEST)
            
        test.finish()
        
        # Hisobot tayyorlash va Telegramga yuborish
        try:
            from .utils import generate_pdf_report
            from .notifications import send_telegram_document
            
            submissions = test.submissions.all().order_by('-score')
            pdf_buffer = generate_pdf_report(test, submissions)
            filename = f"natijalar_{test.access_code}.pdf"
            
            summary_msg = f"""
🏁 <b>Test yakunlandi!</b>

📝 Test: <b>{test.title}</b>
📚 Fan: <b>{test.subject}</b>
🔢 Kod: <b>{test.access_code}</b>

📊 <b>Umumiy statistika:</b>
👥 Ishtirokchilar: <b>{submissions.count()} ta</b>
📈 O'rtacha ball: <b>{test.average_score} ta to'g'ri</b>
🏆 Eng yuqori ball: <b>{test.max_score} ta to'g'ri</b>

Batafsil natijalar va to'g'ri javoblar (kalit) ilova qilingan PDF faylda keltirilgan.
"""
            # PDF faylni yuborish
            send_telegram_document(
                chat_id=test.creator.telegram_id,
                document=pdf_buffer.getvalue(),
                filename=filename,
                caption=summary_msg
            )
            
        except Exception as e:
            logger.error(f"Error sending final report: {e}")
            
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
