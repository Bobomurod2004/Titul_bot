from django.contrib import admin
from .models import User, Test, Question, Submission, Payment, Announcement


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['telegram_id', 'full_name', 'role', 'balance', 'created_at']
    list_filter = ['role', 'created_at']
    search_fields = ['telegram_id', 'full_name']
    readonly_fields = ['created_at']


@admin.register(Test)
class TestAdmin(admin.ModelAdmin):
    list_display = ['title', 'subject', 'access_code', 'creator', 'creator_name', 'is_active', 'expires_at', 'created_at']
    list_filter = ['subject', 'is_active', 'created_at', 'expires_at']
    search_fields = ['title', 'access_code', 'creator__full_name', 'creator_name']
    readonly_fields = ['access_code', 'created_at', 'finished_at']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('creator')


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['test', 'question_number', 'question_type', 'correct_answer']
    list_filter = ['question_type', 'test__subject']
    search_fields = ['test__title', 'test__access_code']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('test')


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ['student_name', 'test', 'score', 'grade', 'submitted_at']
    list_filter = ['grade', 'submitted_at', 'test__subject']
    search_fields = ['student_name', 'student_telegram_id', 'test__title']
    readonly_fields = ['submitted_at']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('test')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['user', 'amount', 'payment_method', 'status', 'created_at']
    list_filter = ['payment_method', 'status', 'created_at']
    search_fields = ['user__full_name', 'transaction_id']
    readonly_fields = ['created_at', 'completed_at']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ['title', 'type', 'is_active', 'order', 'created_at']
    list_filter = ['type', 'is_active', 'created_at']
    search_fields = ['title', 'content']
    list_editable = ['is_active', 'order']
