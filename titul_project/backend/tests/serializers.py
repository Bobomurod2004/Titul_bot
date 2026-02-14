from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from .models import User, Test, Question, Submission, Payment, Announcement, SystemSettings, PaymentReceipt


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'telegram_id', 'full_name', 'role', 'balance', 'free_tests_used', 'remaining_free_tests', 'created_at']
        read_only_fields = ['id', 'remaining_free_tests', 'created_at']


class SystemSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSettings
        fields = ['id', 'card_number', 'price_per_question', 'price_per_test', 'free_test_limit', 'payment_instruction', 'bot_link', 'support_link', 'channel_link', 'mandatory_channels', 'updated_at']
        read_only_fields = ['id', 'updated_at']


class PaymentReceiptSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    
    class Meta:
        model = PaymentReceipt
        fields = [
            'id', 'user', 'user_name', 'receipt_image', 'amount', 
            'status', 'admin_comment', 'created_at', 'verified_at', 'verified_by'
        ]
        read_only_fields = ['id', 'created_at', 'verified_at', 'verified_by']


class AnnouncementSerializer(serializers.ModelSerializer):
# ... (lines 14-336 unchanged) ...
    class Meta:
        model = Announcement
        fields = ['id', 'title', 'content', 'type', 'is_active', 'order', 'created_at']
        read_only_fields = ['id', 'created_at']


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ['id', 'question_number', 'question_type', 'question_text', 'correct_answer', 'points', 'difficulty_logit']
        read_only_fields = ['id', 'difficulty_logit']
        extra_kwargs = {
            'correct_answer': {'allow_blank': True, 'allow_null': True, 'required': False}
        }


class TestSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    creator_name = serializers.CharField(source='creator.full_name', read_only=True)
    
    class Meta:
        model = Test
        fields = [
            'id', 'creator', 'creator_name', 'title', 'subject', 'sub_type',
            'access_code', 'submission_mode', 'is_active', 'is_calibrated', 'created_at', 'expires_at', 
            'finished_at', 'questions', 'submissions_count', 
            'average_score', 'max_score', 'total_points', 'is_points_based'
        ]
        read_only_fields = ['id', 'access_code', 'created_at', 'finished_at']

    def update(self, instance, validated_data):
        # Questions data handling if provided (though it's read_only in regular serializer, 
        # we might want to handle it or use a separate serializer for updates)
        instance.title = validated_data.get('title', instance.title)
        instance.subject = validated_data.get('subject', instance.subject)
        instance.sub_type = validated_data.get('sub_type', instance.sub_type)
        instance.submission_mode = validated_data.get('submission_mode', instance.submission_mode)
        instance.expires_at = validated_data.get('expires_at', instance.expires_at)
        instance.save()
        return instance

class UpdateTestSerializer(serializers.ModelSerializer):
    """Test tahrirlash uchun serializer"""
    questions = QuestionSerializer(many=True)

    class Meta:
        model = Test
        fields = ['title', 'subject', 'sub_type', 'submission_mode', 'expires_at', 'questions']

    def validate_submission_mode(self, value):
        if self.instance and self.instance.submission_mode != value:
             raise serializers.ValidationError("Test rejimini (bir martalik/ko'p martalik) tahrirlab bo'lmaydi!")
        return value

    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions', [])
        new_expiry = validated_data.get('expires_at')
        
        # Test ma'lumotlarini yangilash
        instance.title = validated_data.get('title', instance.title)
        instance.subject = validated_data.get('subject', instance.subject)
        instance.sub_type = validated_data.get('sub_type', instance.sub_type)
        instance.submission_mode = validated_data.get('submission_mode', instance.submission_mode)
        
        # Agar vaqt o'zgargan bo'lsa va u kelajakda bo'lsa, testni qayta faollashtirish
        if new_expiry and new_expiry != instance.expires_at:
            from django.utils import timezone
            if new_expiry > timezone.now():
                instance.reactivate(new_expiry)
            else:
                instance.expires_at = new_expiry
                instance.save()
        else:
            instance.save()

        if questions_data:
            # Mavjud savollarni o'chirib, yangilarini yaratish
            instance.questions.all().delete()
            for q_data in questions_data:
                Question.objects.create(test=instance, **q_data)
            
            # Natijalarni qayta hisoblash (Re-grading)
            for submission in instance.submissions.all():
                submission.calculate_score(send_notify=False)
        
        return instance


class CreateTestSerializer(serializers.Serializer):
    """Test yaratish uchun serializer (nested questions bilan)"""
    creator_id = serializers.IntegerField(min_value=0)
    creator_name = serializers.CharField(max_length=255, required=False, allow_null=True)
    title = serializers.CharField(max_length=255)
    subject = serializers.CharField(max_length=50)
    sub_type = serializers.CharField(max_length=10, required=False, allow_null=True)
    submission_mode = serializers.CharField(max_length=10, required=False, default='single')
    expires_at = serializers.DateTimeField(required=False, allow_null=True)
    questions = QuestionSerializer(many=True)
    
    def validate_expires_at(self, value):
        if value:
            now = timezone.now()
            if value <= now:
                raise serializers.ValidationError("Tugash vaqti hozirgi vaqtdan keyin bo'lishi kerak!")
            
            max_expiry = now + timedelta(days=7)
            if value > max_expiry:
                raise serializers.ValidationError("Test muddati 1 haftadan (7 kun) oshib ketmasligi kerak!")
        return value
    
    def validate_questions(self, questions_data):
        """Har bir savolni tekshirish va batafsil xatolik xabarlarini berish"""
        if not questions_data:
            raise serializers.ValidationError("Kamida bitta savol kiritilishi kerak!")
        
        for idx, question in enumerate(questions_data, start=1):
            q_num = question.get('question_number', idx)
            q_type = question.get('question_type', '')
            correct_answer = question.get('correct_answer', '')
            points = question.get('points')
            
            # Savol turi tekshiruvi
            if q_type not in ['choice', 'writing', 'manual']:
                raise serializers.ValidationError(
                    f"{q_num}-savol: Noto'g'ri savol turi. 'choice', 'writing' yoki 'manual' bo'lishi kerak."
                )
            
            # To'g'ri javob tekshiruvi (choice va writing uchun)
            if q_type in ['choice', 'writing']:
                if not correct_answer or (isinstance(correct_answer, str) and not correct_answer.strip()):
                    raise serializers.ValidationError(
                        f"{q_num}-savol: To'g'ri javob kiritilmagan! Iltimos, to'g'ri javobni kiriting."
                    )
            
            # Ball tekshiruvi
            if points is None:
                raise serializers.ValidationError(
                    f"{q_num}-savol: Ball kiritilmagan! Har bir savol uchun ball belgilang."
                )
            
            try:
                points_float = float(points)
                if points_float <= 0:
                    raise serializers.ValidationError(
                        f"{q_num}-savol: Ball 0 dan katta bo'lishi kerak!"
                    )
                if points_float > 100:
                    raise serializers.ValidationError(
                        f"{q_num}-savol: Ball 100 dan oshmasligi kerak!"
                    )
            except (ValueError, TypeError):
                raise serializers.ValidationError(
                    f"{q_num}-savol: Ball noto'g'ri formatda! Raqam kiriting."
                )
        
        return questions_data
    
    def create(self, validated_data):
        from .models import SystemSettings, Question
        from decimal import Decimal
        from django.db import transaction
        
        questions_data = validated_data.pop('questions')
        creator_id = validated_data.pop('creator_id')
        creator_name = validated_data.get('creator_name', f'User {creator_id}')
        
        with transaction.atomic():
            # User ni olish yoki yaratish
            user, created = User.objects.get_or_create(
                telegram_id=creator_id,
                defaults={'full_name': creator_name, 'role': 'teacher'}
            )
            
            # Cost calculation
            cost = Decimal('0.00')
            settings = SystemSettings.objects.first()
            if not settings:
                settings = SystemSettings.objects.create()
            
            free_limit = settings.free_test_limit
                
            if user.free_tests_used < free_limit:
                # Tekin testlar limiti
                user.free_tests_used += 1
            else:
                # Pullik test (Qat'iy narx)
                cost = settings.price_per_test
                
                def format_currency(amount):
                    return f"{float(amount):,.0f}".replace(",", " ") + " so'm"
                
                if user.balance < cost:
                    raise serializers.ValidationError({
                        'detail': f"Mablag' yetarli emas! Sizda kamida {format_currency(cost)} bo'lishi kerak. Balansingiz: {format_currency(user.balance)}."
                    })
                
                user.balance -= cost
            
            user.save()
            
            test = Test.objects.create(creator=user, **validated_data)
            
            # Savollarni yaratish
            for question_data in questions_data:
                Question.objects.create(test=test, **question_data)
            
            # Bildirishnoma yuborish
            try:
                from .tasks import send_payment_notification_task
                msg = f"🚀 <b>Test muvaffaqiyatli yaratildi!</b>\n\n"
                msg += f"Kodi: <code>{test.access_code}</code>\n"
                if cost > 0:
                    msg += f"Yechildi: {cost} so'm\n"
                
                msg += f"💵 Joriy balans: <b>{user.balance} so'm</b>\n"
                msg += f"🎁 Qolgan bepul testlar: <b>{user.remaining_free_tests} ta</b>"
                
                send_payment_notification_task(user.telegram_id, msg)
            except:
                pass
        
        return test


class SubmissionSerializer(serializers.ModelSerializer):
    test_title = serializers.CharField(source='test.title', read_only=True)
    test_subject = serializers.CharField(source='test.subject', read_only=True)
    correct_count = serializers.SerializerMethodField()
    wrong_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Submission
        fields = [
            'id', 'test', 'test_title', 'test_subject', 
            'student_telegram_id', 'student_name', 'attempt_number',
            'answers', 'correct_count', 'wrong_count', 'score', 
            'ability_logit', 'scaled_score', 'grade', 'submitted_at'
        ]
        read_only_fields = ['id', 'attempt_number', 'score', 'ability_logit', 'scaled_score', 'grade', 'submitted_at']

    def get_correct_count(self, obj):
        count = 0
        questions = obj.test.questions.all()
        for q in questions:
            q_num = str(q.question_number)
            ans = obj.answers.get(q_num, '')
            if q.question_type == 'choice':
                if str(ans).strip().upper() == str(q.correct_answer).strip().upper():
                    count += 1
            elif q.question_type == 'writing':
                import json
                try:
                    correct_parts = json.loads(q.correct_answer)
                    if isinstance(correct_parts, list):
                        student_parts = ans if isinstance(ans, list) else [ans]
                        is_correct = True
                        for i, alternatives in enumerate(correct_parts):
                            student_part = str(student_parts[i]).strip().lower() if i < len(student_parts) else ""
                            if not any(str(alt).strip().lower() == student_part for alt in alternatives):
                                is_correct = False
                                break
                        if is_correct: count += 1
                    else:
                        if str(ans).strip().lower() == str(q.correct_answer).strip().lower():
                            count += 1
                except:
                    if str(ans).strip().lower() == str(q.correct_answer).strip().lower():
                        count += 1
        return count

    def get_wrong_count(self, obj):
        questions_count = obj.test.questions.filter(question_type__in=['choice', 'writing']).count()
        return questions_count - self.get_correct_count(obj)
    
    def create(self, validated_data):
        submission = Submission.objects.create(**validated_data)
        submission.calculate_score()  # Ballni hisoblash
        return submission


class CreateSubmissionSerializer(serializers.Serializer):
    """Javob yuborish uchun serializer"""
    test_id = serializers.IntegerField()
    student_telegram_id = serializers.IntegerField()
    student_name = serializers.CharField(max_length=255)
    answers = serializers.JSONField()
    
    def validate_test_id(self, value):
        from datetime import timedelta
        try:
            test = Test.objects.get(id=value)
            now = timezone.now()
            
            # 30 soniyalik fan-vaqt (grace period) qo'shish
            if test.expires_at and now > (test.expires_at + timedelta(seconds=30)):
                if test.is_active:
                    test.finish(send_notify=True)
                raise serializers.ValidationError("Bu test muddati tugagan va yakunlangan!")
                
            if not test.is_active:
                raise serializers.ValidationError("Bu test yakunlangan!")
            return value
        except Test.DoesNotExist:
            raise serializers.ValidationError("Test topilmadi!")

    def validate(self, attrs):
        test_id = attrs.get('test_id')
        student_telegram_id = attrs.get('student_telegram_id')
        student_name = attrs.get('student_name', '').strip()
        
        try:
            test = Test.objects.get(id=test_id)
            if test.submission_mode == 'single':
                # Soddaroq mantiq: Agar student_telegram_id 0 bo'lsa (veb), ismi bilan tekshiramiz
                # Aks holda (telegram) ID si bilan tekshiramiz
                if int(student_telegram_id) != 0:
                    if Submission.objects.filter(test=test, student_telegram_id=student_telegram_id).exists():
                        raise serializers.ValidationError({"detail": "Siz ushbu testni yechib bo'lgansiz!"})
                else:
                    # Veb foydalanuvchisi uchun ism bo'yicha (Case-insensitive)
                    if Submission.objects.filter(test=test, student_name__iexact=student_name).exists():
                        raise serializers.ValidationError({"detail": f"Hurmatli {student_name}, siz ushbu testni oldin yechgansiz!"})
        except Test.DoesNotExist:
            pass # validate_test_id will handle this
            
        return attrs
    
    def create(self, validated_data):
        test_id = validated_data.pop('test_id')
        test = Test.objects.get(id=test_id)
        student_telegram_id = validated_data['student_telegram_id']
        
        # Urinish raqamini aniqlash (Har doim ID + ism bo'yicha guruhlaymiz)
        query = Submission.objects.filter(
            test=test, 
            student_telegram_id=student_telegram_id,
            student_name__iexact=validated_data['student_name'].strip()
        )
            
        existing_submissions = query.order_by('attempt_number')
        
        attempt_number = 1
        if existing_submissions.exists():
            attempt_number = existing_submissions.last().attempt_number + 1
            
        # Yangi submission yaratish (update_or_create emas, har doim yangi)
        submission = Submission.objects.create(
            test=test,
            student_telegram_id=student_telegram_id,
            student_name=validated_data['student_name'],
            answers=validated_data['answers'],
            attempt_number=attempt_number
        )
        
        # Savollarni tekshirish (manual ballar uchun)
        answers = validated_data.get('answers', {})
        for q_num_str, student_answer in answers.items():
            try:
                question = test.questions.get(question_number=int(q_num_str))
                if question.question_type == 'manual':
                    try:
                        from decimal import Decimal
                        score_val = Decimal(str(student_answer))
                        if score_val < 0 or score_val > question.points:
                            # Frontendda ham cheklangan, lekin backendda ham xavfsizlik uchun tekshiramiz
                            # Agar xato bo'lsa, uni oralig'iga keltiramiz yoki error beramiz
                            # Hozircha oralig'iga keltirish calculate_score da bor, 
                            # lekin bu yerda validatesi bo'lishi yaxshi.
                            pass 
                    except:
                        pass
            except Question.DoesNotExist:
                continue

        submission.calculate_score()
        return submission


class PaymentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'user', 'user_name', 'amount', 'payment_method', 
            'status', 'transaction_id', 'created_at', 'completed_at'
        ]
        read_only_fields = ['id', 'status', 'created_at', 'completed_at']
