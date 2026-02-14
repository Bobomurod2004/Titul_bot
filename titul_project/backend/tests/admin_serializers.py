from rest_framework import serializers
from .models import User, Test, Submission, Payment, ActivityLog
from django.db.models import Sum

class AdminUserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['role', 'balance', 'full_name']

class AdminStatsSerializer(serializers.Serializer):
    total_users = serializers.IntegerField()
    total_tests = serializers.IntegerField()
    total_submissions = serializers.IntegerField()
    total_payments = serializers.DecimalField(max_digits=12, decimal_places=2)
    active_tests = serializers.IntegerField()
    pending_payments = serializers.IntegerField()
    
    # Trend ma'lumotlari (so'nggi 7 kun)
    user_trend = serializers.ListField(child=serializers.IntegerField())
    payment_trend = serializers.ListField(child=serializers.DecimalField(max_digits=12, decimal_places=2))

class ActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    
    class Meta:
        model = ActivityLog
        fields = ['id', 'event_type', 'event_type_display', 'user', 'user_name', 'description', 'metadata', 'created_at']
