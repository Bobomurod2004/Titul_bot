from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from .models import User, Test, Question, Submission, Payment, Announcement


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'telegram_id', 'full_name', 'role', 'balance', 'created_at']
        read_only_fields = ['id', 'created_at']


class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = ['id', 'title', 'content', 'type', 'is_active', 'order', 'created_at']
        read_only_fields = ['id', 'created_at']


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ['id', 'question_number', 'question_type', 'question_text', 'correct_answer', 'points']
        read_only_fields = ['id']
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
            'access_code', 'is_active', 'created_at', 'expires_at', 
            'finished_at', 'questions', 'submissions_count', 
            'average_score', 'max_score', 'total_points'
        ]
        read_only_fields = ['id', 'access_code', 'created_at', 'finished_at']

    def update(self, instance, validated_data):
        # Questions data handling if provided (though it's read_only in regular serializer, 
        # we might want to handle it or use a separate serializer for updates)
        instance.title = validated_data.get('title', instance.title)
        instance.subject = validated_data.get('subject', instance.subject)
        instance.sub_type = validated_data.get('sub_type', instance.sub_type)
        instance.expires_at = validated_data.get('expires_at', instance.expires_at)
        instance.save()
        return instance

class UpdateTestSerializer(serializers.ModelSerializer):
    """Test tahrirlash uchun serializer"""
    questions = QuestionSerializer(many=True)

    class Meta:
        model = Test
        fields = ['title', 'subject', 'sub_type', 'expires_at', 'questions']

    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions', [])
        
        # Test ma'lumotlarini yangilash
        instance.title = validated_data.get('title', instance.title)
        instance.subject = validated_data.get('subject', instance.subject)
        instance.sub_type = validated_data.get('sub_type', instance.sub_type)
        instance.expires_at = validated_data.get('expires_at', instance.expires_at)
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
        questions_data = validated_data.pop('questions')
        creator_id = validated_data.pop('creator_id')
        creator_name = validated_data.get('creator_name', f'User {creator_id}')
        
        # User ni olish yoki yaratish
        user, created = User.objects.get_or_create(
            telegram_id=creator_id,
            defaults={'full_name': creator_name, 'role': 'teacher'}
        )
        
        # Test yaratish
        test = Test.objects.create(creator=user, **validated_data)
        
        # Savollarni yaratish
        for question_data in questions_data:
            Question.objects.create(test=test, **question_data)
        
        return test


class SubmissionSerializer(serializers.ModelSerializer):
    test_title = serializers.CharField(source='test.title', read_only=True)
    test_subject = serializers.CharField(source='test.subject', read_only=True)
    
    class Meta:
        model = Submission
        fields = [
            'id', 'test', 'test_title', 'test_subject', 
            'student_telegram_id', 'student_name', 'attempt_number',
            'answers', 'score', 'grade', 'submitted_at'
        ]
        read_only_fields = ['id', 'attempt_number', 'score', 'grade', 'submitted_at']
    
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
        try:
            test = Test.objects.get(id=value)
            if test.is_expired():
                raise serializers.ValidationError("Bu test muddati tugagan va yakunlangan!")
            if not test.is_active:
                raise serializers.ValidationError("Bu test yakunlangan!")
            return value
        except Test.DoesNotExist:
            raise serializers.ValidationError("Test topilmadi!")
    
    def create(self, validated_data):
        test_id = validated_data.pop('test_id')
        test = Test.objects.get(id=test_id)
        
        # Avval yuborgan bo'lsa, yangilash
        submission, created = Submission.objects.update_or_create(
            test=test,
            student_telegram_id=validated_data['student_telegram_id'],
            defaults={
                'student_name': validated_data['student_name'],
                'answers': validated_data['answers']
            }
        )
        
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
