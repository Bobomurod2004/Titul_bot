"""
Backend API bilan aloqa
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_BASE_URL = os.getenv('BACKEND_API_URL', 'http://localhost:8000/api/v1')


class APIClient:
    """Backend API client"""
    
    @staticmethod
    def get_or_create_user(telegram_id, full_name):
        """Foydalanuvchi yaratish yoki olish"""
        try:
            response = requests.post(
                f"{API_BASE_URL}/users/",
                json={
                    'telegram_id': telegram_id,
                    'full_name': full_name,
                    'role': 'teacher'
                }
            )
            return response.json() if response.status_code in [200, 201] else None
        except Exception as e:
            print(f"API Error: {e}")
            return None
    
    @staticmethod
    def get_user(telegram_id):
        """Foydalanuvchi ma'lumotlarini olish"""
        try:
            response = requests.get(f"{API_BASE_URL}/users/{telegram_id}/")
            return response.json() if response.status_code == 200 else None
        except Exception as e:
            print(f"API Error: {e}")
            return None
    
    @staticmethod
    def get_user_tests(telegram_id):
        """Foydalanuvchi testlarini olish"""
        try:
            response = requests.get(f"{API_BASE_URL}/tests/user/{telegram_id}/")
            return response.json() if response.status_code == 200 else []
        except Exception as e:
            print(f"API Error: {e}")
            return []
    
    @staticmethod
    def get_test_by_code(access_code):
        """Access code orqali test olish"""
        try:
            response = requests.get(f"{API_BASE_URL}/tests/code/{access_code}/")
            return response.json() if response.status_code == 200 else None
        except Exception as e:
            print(f"API Error: {e}")
            return None
    
    @staticmethod
    def finish_test(test_id):
        """Testni yakunlash"""
        try:
            response = requests.post(f"{API_BASE_URL}/tests/{test_id}/finish/")
            return response.status_code == 200
        except Exception as e:
            print(f"API Error: {e}")
            return False
    
    @staticmethod
    def get_test_submissions(test_id):
        """Test javoblarini olish"""
        try:
            response = requests.get(f"{API_BASE_URL}/submissions/test/{test_id}/")
            return response.json() if response.status_code == 200 else []
        except Exception as e:
            print(f"API Error: {e}")
            return []
    
    @staticmethod
    def download_test_report(test_id):
        """PDF hisobot yuklab olish"""
        try:
            response = requests.get(
                f"{API_BASE_URL}/submissions/test/{test_id}/report/",
                stream=True
            )
            return response.content if response.status_code == 200 else None
        except Exception as e:
            print(f"API Error: {e}")
            return None
    
    @staticmethod
    def get_user_payments(telegram_id):
        """Foydalanuvchi to'lovlarini olish"""
        try:
            response = requests.get(f"{API_BASE_URL}/payments/user/{telegram_id}/")
            return response.json() if response.status_code == 200 else []
        except Exception as e:
            print(f"API Error: {e}")
            return []
    
    @staticmethod
    def create_payment(telegram_id, amount, payment_method):
        """To'lov yaratish"""
        try:
            # Avval user olish
            user = APIClient.get_user(telegram_id)
            if not user:
                return None
            
            response = requests.post(
                f"{API_BASE_URL}/payments/",
                json={
                    'user': user['id'],
                    'amount': amount,
                    'payment_method': payment_method
                }
            )
            return response.json() if response.status_code == 201 else None
        except Exception as e:
            print(f"API Error: {e}")
            return None
