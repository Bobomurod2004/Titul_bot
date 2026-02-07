"""
Telegram klaviaturalar
"""
from telegram import ReplyKeyboardMarkup, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo


def main_keyboard():
    """Asosiy menyu klaviatura"""
    keyboard = [
        ["🧪 Test yaratish", "📚 Javob yuborish"],
        ["📊 Testlarim", "📝 Ma'lumotlarim"],
        ["💰 Mening hisobim", "💳 To'lov qilish"],
        ["ℹ️ Foydalanish yo'riqnomasi"]
    ]
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True)


def web_app_keyboard(url, button_text="🌐 Ochish"):
    """Web app klaviatura. Agar URL http bo'lsa, oddiy tugma ishlatamiz (Local dev uchun)"""
    if url.startswith("https://"):
        keyboard = [[InlineKeyboardButton(button_text, web_app=WebAppInfo(url=url))]]
    else:
        # Localhost (http) uchun oddiy link tugmasi
        keyboard = [[InlineKeyboardButton(button_text, url=url)]]
    return InlineKeyboardMarkup(keyboard)


def payment_keyboard():
    """To'lov usullari klaviatura"""
    keyboard = [
        [InlineKeyboardButton("💳 Click", callback_data="payment_click")],
        [InlineKeyboardButton("💳 Payme", callback_data="payment_payme")],
        [InlineKeyboardButton("❌ Bekor qilish", callback_data="payment_cancel")]
    ]
    return InlineKeyboardMarkup(keyboard)


def test_actions_keyboard(test_id):
    """Test harakatlari klaviatura"""
    keyboard = [
        [InlineKeyboardButton("📊 Natijalarni ko'rish", callback_data=f"results_{test_id}")],
        [InlineKeyboardButton("✅ Testni yakunlash", callback_data=f"finish_{test_id}")],
        [InlineKeyboardButton("📥 PDF yuklab olish", callback_data=f"download_{test_id}")]
    ]
    return InlineKeyboardMarkup(keyboard)
