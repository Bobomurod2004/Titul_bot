import os
import requests
import logging

logger = logging.getLogger(__name__)

def send_telegram_notification(chat_id, text):
    """
    Telegram bot orqali xabar yuborish
    """
    token = os.getenv('TELEGRAM_BOT_TOKEN')
    if not token:
        logger.error("TELEGRAM_BOT_TOKEN topilmadi!")
        return False
    
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML"
    }
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
        return True
    except Exception as e:
        logger.error(f"Telegram xabar yuborishda xatolik: {e}")
        return False

def send_telegram_document(chat_id, document, filename, caption=None):
    """
    Telegram bot orqali hujjat yuborish
    """
    token = os.getenv('TELEGRAM_BOT_TOKEN')
    if not token:
        logger.error("TELEGRAM_BOT_TOKEN topilmadi!")
        return False
    
    url = f"https://api.telegram.org/bot{token}/sendDocument"
    data = {
        "chat_id": chat_id,
        "parse_mode": "HTML"
    }
    if caption:
        data["caption"] = caption
        
    files = {
        "document": (filename, document, "application/pdf")
    }
    
    try:
        response = requests.post(url, data=data, files=files, timeout=30)
        response.raise_for_status()
        return True
    except Exception as e:
        logger.error(f"Telegram hujjat yuborishda xatolik: {e}")
        return False
