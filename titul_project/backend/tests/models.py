from django.db import models
from django.utils import timezone
import string
import random
import logging

logger = logging.getLogger(__name__)


def generate_access_code():
    """Generate a unique 8-character access code"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))


class User(models.Model):
    """Foydalanuvchilar (o'qituvchi va talabalar)"""
    ROLE_CHOICES = [
        ('superadmin', 'Super Admin'),
        ('admin', 'Admin'),
        ('teacher', 'O\'qituvchi'),
        ('student', 'Talaba'),
        ('user', 'Foydalanuvchi'),
    ]
    
    telegram_id = models.BigIntegerField(unique=True, db_index=True)
    full_name = models.CharField(max_length=255)
    role = models.CharField(max_length=15, choices=ROLE_CHOICES, default='user')
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    free_tests_used = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.full_name} ({self.telegram_id}) - {self.role}"
    
    @property
    def is_admin(self):
        return self.role in ['admin', 'superadmin']
    
    @property
    def is_superadmin(self):
        return self.role == 'superadmin'

    @property
    def remaining_free_tests(self):
        """Qolgan bepul testlar sonini hisoblash"""
        settings = SystemSettings.objects.first()
        limit = settings.free_test_limit if settings else 5
        remaining = limit - self.free_tests_used
        return max(0, remaining)


class Test(models.Model):
    """Testlar"""
    SUBJECT_CHOICES = [
        ('Matematika', 'Matematika'),
        ('Tarix', 'Tarix'),
        ('Ona tili va adabiyot', 'Ona tili va adabiyot'),
        ('Ingliz tili', 'Ingliz tili'),
        ('Kimyo', 'Kimyo'),
        ('Biologiya', 'Biologiya'),
        ('Fizika', 'Fizika'),
        ('Geografiya', 'Geografiya'),
        ('Rus tili', 'Rus tili'),
        ('Qoraqalpoq tili', 'Qoraqalpoq tili'),
    ]
    
    SUB_TYPE_CHOICES = [
        ('tur1', '1-tur (1-40)'),
        ('tur2', '2-tur (41-43 manual)'),
    ]
    
    MODE_CHOICES = [
        ('single', 'Faqat 1 marta'),
        ('multiple', 'Ko\'p marta (Cheksiz)'),
    ]
    
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_tests')
    creator_name = models.CharField(max_length=255, null=True, blank=True)
    title = models.CharField(max_length=255)
    subject = models.CharField(max_length=50, choices=SUBJECT_CHOICES)
    sub_type = models.CharField(max_length=10, choices=SUB_TYPE_CHOICES, null=True, blank=True)
    submission_mode = models.CharField(max_length=10, choices=MODE_CHOICES, default='single')
    access_code = models.CharField(max_length=8, unique=True, default=generate_access_code, db_index=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    is_calibrated = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'tests'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.access_code}"
    
    def is_expired(self):
        """Test muddati o'tganligini tekshirish"""
        if self.is_active and self.expires_at and timezone.now() > self.expires_at:
            # Muddati o'tgan bo'lsa, tugatish
            self.finish(send_notify=True)
            return True
        return not self.is_active

    def reactivate(self, new_expiry):
        """Testni qayta faollashtirish"""
        self.is_active = True
        self.expires_at = new_expiry
        self.finished_at = None
        self.save()

    def finish(self, send_notify=True):
        """Testni yakunlash"""
        if not self.is_active:
            return
            
        self.is_active = False
        self.finished_at = timezone.now()
        self.save()
        
        # 1. Darhol "Natijalar tayyorlanmoqda" xabarini yuborish
        if send_notify:
            try:
                from .services import send_preliminary_finish_notification
                send_preliminary_finish_notification(self)
            except Exception as e:
                logger.error(f"Error sending prelim notification: {e}")

        # 2. Rasch va Hisobotni fonda bajarish (Background task)
        if send_notify:
            try:
                from .tasks import process_test_results_task
                process_test_results_task.delay(self.id)
            except Exception as e:
                logger.error(f"Error triggering background task: {e}")

    @property
    def is_points_based(self):
        """Test ballik tizimdami (manual grading yoki maxsus ballar)"""
        # Manual yoki writing savollar bo'lsa
        if self.questions.filter(question_type__in=['manual', 'writing']).exists():
            return True
        # Har bir savol balli 1.0 dan farqli bo'lsa
        if self.questions.exclude(points=1.0).exists():
            return True
        return False

    @property
    def submissions_count(self):
        """Unikal o'quvchilar soni (ID + Ism bo'yicha)"""
        # Har bir unikal (ID, Ism) juftligi bitta o'quvchi deb hisoblanadi
        return self.submissions.values('student_telegram_id', 'student_name').distinct().count()

    @property
    def average_score(self):
        """O'rtacha ball (har bir o'quvchining faqat oxirgi urinishini hisobga oladi)"""
        from django.db.models import Avg
        from .rasch_service import get_latest_submissions_queryset
        
        latest_subs = get_latest_submissions_queryset(self)
        avg = latest_subs.aggregate(Avg('score'))['score__avg']
        return round(float(avg or 0), 1)

    @property
    def max_score(self):
        """Har bir o'quvchining faqat oxirgi urinishi bo'yicha maksimal ball"""
        from django.db.models import OuterRef, Subquery, Max
        latest_submissions = Submission.objects.filter(
            test=self,
            student_telegram_id=OuterRef('student_telegram_id')
        ).order_by('-submitted_at').values('id')[:1]
        
        max_v = Submission.objects.filter(
            id__in=Subquery(
                Submission.objects.filter(test=self)
                .values('student_telegram_id')
                .annotate(latest_id=Subquery(latest_submissions))
                .values('latest_id')
            )
        ).aggregate(Max('score'))['score__max']
        
        return max_v if max_v is not None else 0

    @property
    def total_points(self):
        points = self.questions.aggregate(models.Sum('points'))['points__sum']
        return points if points is not None else 0


class Question(models.Model):
    """Savollar"""
    QUESTION_TYPE_CHOICES = [
        ('choice', 'Variantli'),
        ('writing', 'Yozma'),
        ('manual', 'Qo\'lda baholanadi'),
    ]
    
    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name='questions')
    question_number = models.IntegerField()
    question_type = models.CharField(max_length=10, choices=QUESTION_TYPE_CHOICES, default='choice')
    question_text = models.TextField(null=True, blank=True)  # Yozma savollar uchun
    correct_answer = models.TextField(blank=True, null=True)  # Manual savollar uchun shart emas
    points = models.DecimalField(max_digits=5, decimal_places=2, default=1.0)
    difficulty_logit = models.DecimalField(max_digits=10, decimal_places=4, default=0.0000)
    
    class Meta:
        db_table = 'questions'
        ordering = ['question_number']
        unique_together = ['test', 'question_number']
    
    def __str__(self):
        return f"Test {self.test.access_code} - Savol {self.question_number}"


class Submission(models.Model):
    """Talaba javoblari"""
    GRADE_CHOICES = [
        ('A+', 'A+ (>70%)'),
        ('A', 'A (65-69.9%)'),
        ('B+', 'B+ (60-64.9%)'),
        ('B', 'B (55-59.9%)'),
        ('C+', 'C+ (50-54.9%)'),
        ('C', 'C (46-49.9%)'),
        ('F', 'F (0-45.9%)'),
    ]
    
    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name='submissions')
    student_telegram_id = models.BigIntegerField()
    student_name = models.CharField(max_length=255)
    attempt_number = models.IntegerField(default=1)
    answers = models.JSONField()  # {1: "A", 2: "B", 36: "javob matni", ...}
    score = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)  # To'plangan ball
    ability_logit = models.DecimalField(max_digits=10, decimal_places=4, default=0.0000)
    scaled_score = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    grade = models.CharField(max_length=2, choices=GRADE_CHOICES, null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'submissions'
        ordering = ['-submitted_at']
        # uniqueness olib tashlandi, chunki ko'p martalik rejim qo'shildi
    
    def __str__(self):
        return f"{self.student_name} - {self.test.access_code} ({self.score} ball)"
    
    def calculate_score(self, send_notify=False):
        """Ball va darajani hisoblash (Milliy Sertifikat standarti)"""
        from decimal import Decimal
        import json
        
        questions = self.test.questions.all().order_by('question_number')
        total_possible_score = sum(q.points for q in questions)
        earned_score = Decimal('0.0')
        
        from .scoring import get_question_result
        
        for question in questions:
            q_num = str(question.question_number)
            student_answer = self.answers.get(q_num, '')
            
            is_correct, earned_points = get_question_result(question, student_answer)
            earned_score += earned_points
            
            logger.debug(f"Q{q_num} ({question.question_type}): Student='{student_answer}', Correct='{(question.correct_answer or '')[:20]}...' -> {'OK' if is_correct else 'WRONG'}")
        
        self.score = earned_score
        
        # Darajani aniqlash (Milliy sertifikat standarti bo'yicha)
        # Agar test kalibratsiyalangan bo'lsa Rasch ballidan foydalanamiz, 
        # aks holda xom ball foizidan.
        calc_percentage = 0
        if self.test.is_calibrated and self.scaled_score > 0:
            calc_percentage = float(self.scaled_score)
        elif total_possible_score > Decimal('0'):
            calc_percentage = float((earned_score / total_possible_score) * 100)
        
        if calc_percentage >= 70: self.grade = 'A+'
        elif calc_percentage >= 65: self.grade = 'A'
        elif calc_percentage >= 60: self.grade = 'B+'
        elif calc_percentage >= 55: self.grade = 'B'
        elif calc_percentage >= 50: self.grade = 'C+'
        elif calc_percentage >= 46: self.grade = 'C'
        else: self.grade = 'F'
        
        self.save()
        
        if send_notify:
            try:
                from .notifications import send_telegram_notification
                creator_chat_id = self.test.creator.telegram_id
                msg = f"Natija yuborildi!\n\nTest: {self.test.title}\nTalaba: {self.student_name}\nBall: {self.score}\nDaraja: {self.grade}"
                send_telegram_notification(creator_chat_id, msg)
            except Exception as e:
                logger.error(f"Notification error: {e}")
        
        if self.test.is_calibrated:
            return self.scaled_score, self.grade
        return self.score, self.grade


class Payment(models.Model):
    """To'lovlar"""
    PAYMENT_METHOD_CHOICES = [
        ('click', 'Click'),
        ('payme', 'Payme'),
        ('cash', 'Naqd'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Kutilmoqda'),
        ('completed', 'Bajarildi'),
        ('failed', 'Bekor qilindi'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHOD_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    transaction_id = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'payments'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.full_name} - {self.amount} so'm ({self.status})"
    
    def complete(self):
        """To'lovni tasdiqlash"""
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.user.balance += self.amount
        self.user.save()
        self.save()

class Announcement(models.Model):
    """Tizim e'lonlari (Admin panel orqali boshqariladi)"""
    TYPE_CHOICES = [
        ('info', 'Ma\'lumot'),
        ('warning', 'Ogohlantirish'),
        ('danger', 'Xavf'),
    ]
    
    title = models.CharField(max_length=100)
    content = models.TextField()
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='info')
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'announcements'
        ordering = ['order', '-created_at']
    
    def __str__(self):
        return self.title
class BroadcastHistory(models.Model):
    """Xabar yuborish tarixi va statusi"""
    STATUS_CHOICES = [
        ('pending', 'Kutilmoqda'),
        ('processing', 'Yuborilmoqda'),
        ('completed', 'Tugallandi'),
        ('failed', 'Xatolik'),
    ]
    
    admin = models.ForeignKey(User, on_delete=models.CASCADE, related_name='broadcasts')
    message = models.TextField()
    image = models.ImageField(upload_to='broadcasts/images/', null=True, blank=True)
    file = models.FileField(upload_to='broadcasts/files/', null=True, blank=True)
    target_roles = models.JSONField(default=list)  # ['all'], ['admin', 'teacher'], etc.
    total_users = models.IntegerField(default=0)
    success_count = models.IntegerField(default=0)
    fail_count = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'broadcast_history'
        ordering = ['-created_at']

    def __str__(self):
        return f"Broadcast {self.id} by {self.admin.full_name}"

class BroadcastRecipient(models.Model):
    broadcast = models.ForeignKey(BroadcastHistory, on_delete=models.CASCADE, related_name='recipients')
    telegram_id = models.BigIntegerField()
    message_id = models.BigIntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, default='sent')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'broadcast_recipients'
        indexes = [
            models.Index(fields=['broadcast', 'telegram_id']),
        ]

class SystemSettings(models.Model):
    """Tizim umumiy sozlamalari (Faqat Superadmin uchun)"""
    card_number = models.CharField(max_length=20, default="0000 0000 0000 0000")
    price_per_question = models.DecimalField(max_digits=10, decimal_places=2, default=100.00)
    price_per_test = models.DecimalField(max_digits=10, decimal_places=2, default=1000.00)
    free_test_limit = models.IntegerField(default=5)
    payment_instruction = models.TextField(default="To'lovni amalga oshiring va chekni yuboring.")
    bot_link = models.URLField(max_length=255, default="https://t.me/Kamunal_manitoring_bot")
    support_link = models.URLField(max_length=255, default="https://t.me/Bobomurod2004")
    channel_link = models.URLField(max_length=255, default="https://t.me/Titul_testlar")
    mandatory_channels = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'system_settings'
        verbose_name = 'Tizim sozlamasi'

    def __str__(self):
        return "Tizim sozlamalari"

class PaymentReceipt(models.Model):
    """Foydalanuvchi yuborgan to'lov cheklari"""
    STATUS_CHOICES = [
        ('pending', 'Kutilmoqda'),
        ('accepted', 'Qabul qilindi'),
        ('rejected', 'Rad etildi'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='receipts')
    receipt_image = models.ImageField(upload_to='receipts/')
    amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    admin_comment = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_receipts')

    class Meta:
        db_table = 'payment_receipts'
        ordering = ['-created_at']

    def __str__(self):
        return f"Check: {self.user.full_name} ({self.status})"

class ActivityLog(models.Model):
    """Tizimdagi muhim harakatlar logi (Admin panel uchun)"""
    EVENT_TYPES = [
        ('user_registered', 'Yangi foydalanuvchi'),
        ('test_created', 'Yangi test yaratildi'),
        ('test_finished', 'Test yakunlandi'),
        ('payment_received', 'To\'lov yuborildi'),
        ('payment_verified', 'To\'lov tasdiqlandi'),
        ('broadcast_sent', 'Broadcast yuborildi'),
    ]

    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='activities')
    description = models.TextField()
    metadata = models.JSONField(default=dict, blank=True) # Qo'shimcha ma'lumotlar (masalan, test_id)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'activity_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.event_type} - {self.created_at}"
