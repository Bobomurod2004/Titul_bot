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
        ('teacher', 'O\'qituvchi'),
        ('student', 'Talaba'),
    ]
    
    telegram_id = models.BigIntegerField(unique=True, db_index=True)
    full_name = models.CharField(max_length=255)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='teacher')
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.full_name} ({self.telegram_id})"


class Test(models.Model):
    """Testlar"""
    SUBJECT_CHOICES = [
        ('Matematika', 'Matematika'),
        ('Tarix', 'Tarix'),
        ('Ona tili', 'Ona tili'),
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
    
    class Meta:
        db_table = 'tests'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.access_code}"
    
    def is_expired(self):
        """Test muddati o'tganligini tekshirish"""
        if self.is_active and self.expires_at and timezone.now() > self.expires_at:
            self.finish()
            return True
        return not self.is_active

    def finish(self):
        """Testni yakunlash"""
        if not self.is_active:
            return
            
        self.is_active = False
        self.finished_at = timezone.now()
        self.save()
        
        # Hisobotni Telegramga yuborish
        try:
            from .services import send_test_completion_report
            send_test_completion_report(self)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Error triggering auto-report: {e}")

    @property
    def submissions_count(self):
        return self.submissions.count()

    @property
    def average_score(self):
        avg = self.submissions.aggregate(models.Avg('score'))['score__avg']
        return round(avg, 1) if avg is not None else 0

    @property
    def max_score(self):
        max_v = self.submissions.aggregate(models.Max('score'))['score__max']
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
    
    class Meta:
        db_table = 'questions'
        ordering = ['question_number']
        unique_together = ['test', 'question_number']
    
    def __str__(self):
        return f"Test {self.test.access_code} - Savol {self.question_number}"


class Submission(models.Model):
    """Talaba javoblari"""
    GRADE_CHOICES = [
        ('A+', 'A+ (90-100%)'),
        ('A', 'A (80-89%)'),
        ('B', 'B (70-79%)'),
        ('C', 'C (60-69%)'),
        ('D', 'D (50-59%)'),
        ('F', 'F (0-49%)'),
    ]
    
    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name='submissions')
    student_telegram_id = models.BigIntegerField()
    student_name = models.CharField(max_length=255)
    attempt_number = models.IntegerField(default=1)
    answers = models.JSONField()  # {1: "A", 2: "B", 36: "javob matni", ...}
    score = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)  # To'plangan ball
    grade = models.CharField(max_length=2, choices=GRADE_CHOICES, null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'submissions'
        ordering = ['-submitted_at']
        # uniqueness olib tashlandi, chunki ko'p martalik rejim qo'shildi
    
    def __str__(self):
        return f"{self.student_name} - {self.test.access_code} ({self.score} ball)"
    
    def calculate_score(self, send_notify=False):
        """Ball va darajani hisoblash"""
        from decimal import Decimal
        questions = self.test.questions.all()
        total_possible_score = sum(q.points for q in questions)
        earned_score = Decimal('0.0')
        
        for question in questions:
            q_num = str(question.question_number)
            student_answer = self.answers.get(q_num, '')
            correct_answer = question.correct_answer
            
            if question.question_type == 'choice':
                # Variantli savollar uchun to'g'ri javobni solishtirish (A, B, C, D yoki A, B, C, D, E, F)
                is_correct = student_answer.strip().upper() == correct_answer.strip().upper()
                if is_correct:
                    earned_score += question.points
            elif question.question_type == 'writing':
                # Yozma savol - Qismlar (parts) va Muqobillar (alternatives) bilan
                try:
                    import json
                    # correct_answer: [ [alt1, alt2], [alt1] ]
                    # student_answer: [ ans1, ans2 ] yoki "ans1"
                    
                    correct_parts = json.loads(correct_answer)
                    if isinstance(correct_parts, list):
                        # student_answer list bo'lishi kutiladi (agar qismlar bo'lsa)
                        if isinstance(student_answer, list):
                            student_parts = student_answer
                        elif isinstance(student_answer, str) and student_answer.startswith('['):
                            try:
                                student_parts = json.loads(student_answer)
                            except:
                                student_parts = [student_answer]
                        else:
                            student_parts = [student_answer]
                            
                        all_parts_correct = True
                        for i, alternatives in enumerate(correct_parts):
                            part_answer = str(student_parts[i]).strip().lower() if i < len(student_parts) else ""
                            # Part to'g'ri deb hisoblanadi agar biron bir muqobilga mos kelsa
                            if not any(str(alt).strip().lower() == part_answer for alt in alternatives):
                                all_parts_correct = False
                                break
                        
                        is_correct = all_parts_correct
                    else:
                        is_correct = str(student_answer).strip().lower() == str(correct_answer).strip().lower()
                except (json.JSONDecodeError, TypeError, IndexError):
                    is_correct = str(student_answer).strip().lower() == str(correct_answer).strip().lower()
                
                if is_correct:
                    earned_score += question.points
            elif question.question_type == 'manual':
                # Qo'lda kiritilgan ball (Kimyo/Biologiya 41-43, Ona tili 45)
                # student_answer bu holda son bo'lishi kutiladi (ball)
                try:
                    score_val = Decimal(str(student_answer))
                    earned_score += score_val
                    is_correct = score_val > 0
                except:
                    is_correct = False
            
            correct_display = str(correct_answer)[:50] if correct_answer else "N/A"
            logger.debug(f"Q{q_num} ({question.question_type}): Student='{student_answer}', Correct='{correct_display}...' -> {'OK' if is_correct else 'WRONG'}")
        
        logger.info(f"Submission {self.id} score: {earned_score}/{total_possible_score}")
        
        self.score = earned_score
        
        # Darajani aniqlash
        if total_possible_score > Decimal('0'):
            percentage = (earned_score / total_possible_score) * 100
            if percentage >= 90:
                self.grade = 'A+'
            elif percentage >= 80:
                self.grade = 'A'
            elif percentage >= 70:
                self.grade = 'B'
            elif percentage >= 60:
                self.grade = 'C'
            elif percentage >= 50:
                self.grade = 'D'
            else:
                self.grade = 'F'
        
        self.save()
        
        # O'qituvchiga xabar yuborish (Faqat send_notify=True bo'lganda)
        if send_notify:
            try:
                from .notifications import send_telegram_notification
                creator_chat_id = self.test.creator.telegram_id
                msg = f"""
🔔 <b>Yangi javob yuborildi!</b>

📝 Test: <b>{self.test.title}</b>
👤 Talaba: <b>{self.student_name}</b>
📊 Natija: <b>{self.score} ball</b>
🏅 Daraja: <b>{self.grade}</b>

Batafsil ma'lumotni bot orqali ko'rishingiz mumkin.
"""
                send_telegram_notification(creator_chat_id, msg)
            except Exception:
                pass
            
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
