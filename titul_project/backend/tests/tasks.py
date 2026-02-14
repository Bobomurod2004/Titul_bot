from celery import shared_task
import os
from django.conf import settings
from django.utils import timezone
import requests
import time
import logging
from .models import User, Test, BroadcastHistory, BroadcastRecipient

logger = logging.getLogger(__name__)

@shared_task(bind=True)
def send_broadcast_task(self, broadcast_id):
    try:
        broadcast = BroadcastHistory.objects.get(id=broadcast_id)
    except BroadcastHistory.DoesNotExist:
        return "Broadcast not found"

    broadcast.status = 'processing'
    broadcast.save()

    bot_token = settings.TELEGRAM_BOT_TOKEN
    
    # Target foydalanuvchilarni aniqlash va telegram_id borligiga ishonch hosil qilish
    query = User.objects.filter(telegram_id__isnull=False).exclude(telegram_id=0)
    if 'all' not in broadcast.target_roles:
        query = query.filter(role__in=broadcast.target_roles)
    
    users = query
    broadcast.total_users = users.count()
    broadcast.save()

    success_count = 0
    fail_count = 0
    recipients_to_create = []
    
    # Session orqali ulanishlarni qayta ishlatish (tezlik uchun)
    session = requests.Session()
    
    # Media fayllarni oldindan o'qib olamiz (faqat 1 marta)
    image_content = None
    file_content = None
    image_name = None
    file_name = None

    if broadcast.image:
        with open(broadcast.image.path, 'rb') as f:
            image_content = f.read()
            image_name = os.path.basename(broadcast.image.name)
    if broadcast.file:
        with open(broadcast.file.path, 'rb') as f:
            file_content = f.read()
            file_name = os.path.basename(broadcast.file.name)

    for i, user in enumerate(users):
        try:
            resp = None
            if image_content:
                url = f"https://api.telegram.org/bot{bot_token}/sendPhoto"
                files = {'photo': (image_name, image_content)}
                payload = {'chat_id': user.telegram_id, 'caption': broadcast.message, 'parse_mode': 'HTML'}
                resp = session.post(url, data=payload, files=files, timeout=15)
            elif file_content:
                url = f"https://api.telegram.org/bot{bot_token}/sendDocument"
                files = {'document': (file_name, file_content)}
                payload = {'chat_id': user.telegram_id, 'caption': broadcast.message, 'parse_mode': 'HTML'}
                resp = session.post(url, data=payload, files=files, timeout=15)
            else:
                url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
                payload = {'chat_id': user.telegram_id, 'text': broadcast.message, 'parse_mode': 'HTML'}
                resp = session.post(url, json=payload, timeout=10)

            if resp and resp.status_code == 200:
                success_count += 1
                result = resp.json().get('result', {})
                # Recipient ni bulk_create uchun yig'amiz
                recipients_to_create.append(BroadcastRecipient(
                    broadcast=broadcast,
                    telegram_id=user.telegram_id,
                    message_id=result.get('message_id'),
                    status='sent'
                ))
            else:
                fail_count += 1
        except Exception as e:
            logger.error(f"Broadcast error for user {user.telegram_id}: {e}")
            fail_count += 1
        
        # Har 30 ta xabardan keyin yoki oxirida yozamiz
        if len(recipients_to_create) >= 50:
            BroadcastRecipient.objects.bulk_create(recipients_to_create)
            recipients_to_create = []
            
            # Progressni yangilash
            broadcast.success_count = success_count
            broadcast.fail_count = fail_count
            broadcast.save(update_fields=['success_count', 'fail_count'])

        # Telegram flood control uchun qisqa kutish
        if (i + 1) % 30 == 0:
            time.sleep(0.3)

    # Qolgan recipientlarni yozish
    if recipients_to_create:
        BroadcastRecipient.objects.bulk_create(recipients_to_create)

    broadcast.status = 'completed'
    broadcast.completed_at = timezone.now()
    broadcast.success_count = success_count
    broadcast.fail_count = fail_count
    broadcast.save()
    
    return f"Completed: {success_count} success, {fail_count} fail"

@shared_task(bind=True)
def update_broadcast_task(self, broadcast_id):
    """Yuborilgan xabarlarni tahrirlash (matn va media)"""
    try:
        broadcast = BroadcastHistory.objects.get(id=broadcast_id)
    except BroadcastHistory.DoesNotExist:
        return "Broadcast not found"

    bot_token = settings.TELEGRAM_BOT_TOKEN
    recipients = broadcast.recipients.filter(status='sent', message_id__isnull=False)
    
    session = requests.Session()
    success_count = 0
    total_recipients = recipients.count()
    
    for recipient in recipients:
        try:
            resp = None
            if broadcast.image:
                # Edit Media (Image)
                url = f"https://api.telegram.org/bot{bot_token}/editMessageMedia"
                import json
                media = {
                    'type': 'photo',
                    'media': 'attach://photo',
                    'caption': broadcast.message,
                    'parse_mode': 'HTML'
                }
                with open(broadcast.image.path, 'rb') as photo:
                    files = {'photo': photo}
                    payload = {
                        'chat_id': recipient.telegram_id,
                        'message_id': recipient.message_id,
                        'media': json.dumps(media)
                    }
                    resp = session.post(url, data=payload, files=files, timeout=15)
            elif broadcast.file:
                # Edit Media (Document)
                url = f"https://api.telegram.org/bot{bot_token}/editMessageMedia"
                import json
                media = {
                    'type': 'document',
                    'media': 'attach://doc',
                    'caption': broadcast.message,
                    'parse_mode': 'HTML'
                }
                with open(broadcast.file.path, 'rb') as doc:
                    files = {'doc': doc}
                    payload = {
                        'chat_id': recipient.telegram_id,
                        'message_id': recipient.message_id,
                        'media': json.dumps(media)
                    }
                    resp = session.post(url, data=payload, files=files, timeout=15)
            else:
                # Edit Text Only
                url = f"https://api.telegram.org/bot{bot_token}/editMessageText"
                payload = {
                    'chat_id': recipient.telegram_id,
                    'message_id': recipient.message_id,
                    'text': broadcast.message,
                    'parse_mode': 'HTML'
                }
                resp = session.post(url, json=payload, timeout=10)
            
            if resp and resp.status_code == 200:
                success_count += 1
            
            # Flood control: Faqat ko'p foydalanuvchi bo'lsa kutamiz
            if total_recipients > 30 and success_count % 30 == 0:
                time.sleep(0.5)

        except Exception as e:
            continue

    return f"Updated {success_count} messages"


@shared_task
def send_payment_notification_task(telegram_id, message):
    """To'lov holati haqida foydalanuvchini xabardor qilish"""
    bot_token = settings.TELEGRAM_BOT_TOKEN
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        'chat_id': telegram_id,
        'text': message,
        'parse_mode': 'HTML'
    }
    try:
        resp = requests.post(url, json=payload, timeout=10)
        return resp.status_code == 200
    except Exception as e:
        return str(e)
@shared_task
def check_expired_tests_task():
    """Muddati o'tgan testlarni aniqlash va yakunlash (Avtomatik)"""
    from .models import Test
    expired_tests = Test.objects.filter(
        is_active=True,
        expires_at__isnull=False,
        expires_at__lte=timezone.now()
    )
    
    count = expired_tests.count()
    for test in expired_tests:
        test.finish(send_notify=True)
        
    return f"Processed {count} expired tests"
@shared_task
def process_test_results_task(test_id):
    """Test yakunlanganda Rasch hisob-kitoblarini bajarish va hisobot yuborish (Background)"""
    logger.info(f"Starting process_test_results_task for test {test_id}")
    try:
        test = Test.objects.get(id=test_id)
        
        # 1. Rasch kalibratsiyasini bajarish
        from .rasch_service import calibrate_test_items, calculate_rasch_scores
        logger.info(f"Calibrating test {test_id}...")
        calibrate_test_items(test)
        logger.info(f"Calculating Rasch scores for test {test_id}...")
        calculate_rasch_scores(test)
        
        # 2. Yakuniy PDF hisobotini yuborish
        from .services import send_test_completion_report
        logger.info(f"Sending completion report for test {test_id}...")
        success = send_test_completion_report(test)
        
        if success:
            logger.info(f"Test {test_id} processed and report sent successfully")
        else:
            logger.error(f"Test {test_id} processed but report sending failed")
            
        return f"Processed test {test_id} successfully"
    except Test.DoesNotExist:
        logger.error(f"Test {test_id} not found")
        return f"Test {test_id} not found"
    except Exception as e:
        logger.error(f"Error processing test {test_id}: {str(e)}", exc_info=True)
        return f"Error processing test {test_id}: {str(e)}"
