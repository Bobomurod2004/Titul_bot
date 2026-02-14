"""
Backend API bilan aloqa (Asinxron)
"""
import os
import httpx
import logging
from dotenv import load_dotenv

load_dotenv()

API_BASE_URL = os.getenv('BACKEND_API_URL', 'http://localhost:8000/api/v1')
FRONTEND_URL = os.getenv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000')

logger = logging.getLogger(__name__)

class APIClient:
    """Backend API client (Async)"""
    
    @staticmethod
    async def get_or_create_user(telegram_id, full_name):
        """Foydalanuvchi yaratish yoki olish"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{API_BASE_URL}/users/",
                    json={
                        'telegram_id': telegram_id,
                        'full_name': full_name,
                        'role': 'teacher'
                    }
                )
                return response.json() if response.status_code in [200, 201] else None
        except Exception as e:
            logger.error(f"API Error (get_or_create_user): {e}")
            return None
    
    @staticmethod
    async def get_user(telegram_id):
        """Foydalanuvchi ma'lumotlarini olish"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{API_BASE_URL}/users/{telegram_id}/")
                return response.json() if response.status_code == 200 else None
        except Exception as e:
            logger.error(f"API Error (get_user): {e}")
            return None
    
    @staticmethod
    async def get_user_tests(telegram_id):
        """Foydalanuvchi testlarini olish"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{API_BASE_URL}/tests/user/{telegram_id}/")
                return response.json() if response.status_code == 200 else []
        except Exception as e:
            logger.error(f"API Error (get_user_tests): {e}")
            return []
    
    @staticmethod
    async def get_test_by_code(access_code):
        """Access code orqali test olish"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{API_BASE_URL}/tests/code/{access_code}/")
                return response.json() if response.status_code == 200 else None
        except Exception as e:
            logger.error(f"API Error (get_test_by_code): {e}")
            return None
    
    @staticmethod
    async def finish_test(test_id):
        """Testni yakunlash"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(f"{API_BASE_URL}/tests/{test_id}/finish/")
                return response.status_code == 200
        except Exception as e:
            logger.error(f"API Error (finish_test): {e}")
            return False
    
    @staticmethod
    async def get_test_submissions(test_id):
        """Test javoblarini olish"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{API_BASE_URL}/submissions/test/{test_id}/")
                return response.json() if response.status_code == 200 else []
        except Exception as e:
            logger.error(f"API Error (get_test_submissions): {e}")
            return []
    
    @staticmethod
    async def download_test_report(test_id):
        """PDF hisobot yuklab olish"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{API_BASE_URL}/submissions/test/{test_id}/report/"
                )
                return response.content if response.status_code == 200 else None
        except Exception as e:
            logger.error(f"API Error (download_test_report): {e}")
            return None
    
    @staticmethod
    async def get_user_payments(telegram_id):
        """Foydalanuvchi to'lovlarini olish"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{API_BASE_URL}/payments/user/{telegram_id}/")
                return response.json() if response.status_code == 200 else []
        except Exception as e:
            logger.error(f"API Error (get_user_payments): {e}")
            return []
    
    @staticmethod
    async def create_payment(telegram_id, amount, payment_method):
        """To'lov yaratish"""
        try:
            async with httpx.AsyncClient() as client:
                # Avval user olish
                user = await APIClient.get_user(telegram_id)
                if not user:
                    return None
                
                response = await client.post(
                    f"{API_BASE_URL}/payments/",
                    json={
                        'user': user['id'],
                        'amount': amount,
                        'payment_method': payment_method
                    }
                )
                return response.json() if response.status_code == 201 else None
        except Exception as e:
            logger.error(f"API Error (create_payment): {e}")
            return None

    @staticmethod
    async def get_admin_stats(telegram_id):
        """Admin statistikasini olish"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{API_BASE_URL}/admin/stats/",
                    headers={'X-Telegram-Id': str(telegram_id)}
                )
                return response.json() if response.status_code == 200 else None
        except Exception as e:
            logger.error(f"API Error (get_admin_stats): {e}")
            return None

    @staticmethod
    async def get_all_users(admin_telegram_id, search=None):
        """Barcha foydalanuvchilarni olish (Admin uchun)"""
        try:
            params = {'search': search} if search else {}
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{API_BASE_URL}/admin/users/",
                    params=params,
                    headers={'X-Telegram-Id': str(admin_telegram_id)}
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get('results', data) if isinstance(data, dict) else data
                return []
        except Exception as e:
            logger.error(f"API Error (get_all_users): {e}")
            return []

    @staticmethod
    async def update_user_role(admin_telegram_id, target_telegram_id, role):
        """Foydalanuvchi rolini o'zgartirish"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{API_BASE_URL}/admin/users/{target_telegram_id}/",
                    json={'role': role},
                    headers={'X-Telegram-Id': str(admin_telegram_id)}
                )
                return response.json() if response.status_code == 200 else None
        except Exception as e:
            logger.error(f"API Error (update_user_role): {e}")
            return None

    @staticmethod
    async def get_all_user_ids(admin_telegram_id):
        """Barcha foydalanuvchilar ID larini olish (Broadcast uchun)"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{API_BASE_URL}/admin/users/",
                    headers={'X-Telegram-Id': str(admin_telegram_id)}
                )
                if response.status_code == 200:
                    data = response.json()
                    results = data.get('results', data)
                    return [u['telegram_id'] for u in results]
                return []
        except Exception as e:
            logger.error(f"API Error (get_all_user_ids): {e}")
            return []

    @staticmethod
    async def update_user_balance(admin_telegram_id, target_telegram_id, amount):
        """Foydalanuvchi balansini o'zgartirish"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{API_BASE_URL}/admin/users/{target_telegram_id}/",
                    json={'balance': amount},
                    headers={'X-Telegram-Id': str(admin_telegram_id)}
                )
                return response.json() if response.status_code == 200 else None
        except Exception as e:
            logger.error(f"API Error (update_user_balance): {e}")
            return None

    @staticmethod
    async def get_system_settings():
        """Tizim sozlamalarini olish (Karta raqami va narx)"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{API_BASE_URL}/admin/settings/")
                return response.json() if response.status_code == 200 else None
        except Exception as e:
            logger.error(f"API Error (get_system_settings): {e}")
            return None

    @staticmethod
    async def upload_payment_receipt(telegram_id, image_bytes):
        """To'lov chekini yuklash"""
        try:
            files = {'receipt_image': ('receipt.jpg', image_bytes, 'image/jpeg')}
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{API_BASE_URL}/admin/receipts/upload/",
                    data={'user_telegram_id': telegram_id},
                    files=files
                )
                return response.json() if response.status_code == 201 else None
        except Exception as e:
            logger.error(f"API Error (upload_payment_receipt): {e}")
            return None

    @staticmethod
    async def get_admins():
        """Barcha adminlarni olish (Bildirishnoma yuborish uchun)"""
        try:
            superadmin_id = os.getenv('SUPERADMIN_ID')
            headers = {'X-Telegram-Id': str(superadmin_id)} if superadmin_id else {}
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{API_BASE_URL}/admin/users/", headers=headers)
                if response.status_code == 200:
                    users = response.json()
                    if isinstance(users, dict): users = users.get('results', [])
                    return [u for u in users if u['role'] in ['admin', 'superadmin']]
                return []
        except Exception as e:
            logger.error(f"API Error (get_admins): {e}")
            return []
