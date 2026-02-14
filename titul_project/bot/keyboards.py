"""
Telegram klaviaturalar
"""
from telegram import ReplyKeyboardMarkup, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo


def main_keyboard(is_admin=False):
    """Asosiy menyu klaviatura"""
    keyboard = [
        ["🧪 Test yaratish", "📚 Javob yuborish"],
        ["📊 Testlarim", "📝 Ma'lumotlarim"],
        ["💰 Mening hisobim", "💳 To'lov qilish"],
        ["ℹ️ Foydalanish yo'riqnomasi"]
    ]
    if is_admin:
        keyboard.append(["🔐 Admin Panel"])
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True)


def admin_keyboard():
    """Admin paneli uchun klaviatura"""
    keyboard = [
        ["📊 Tizim statistikasi", "👥 Foydalanuvchilarni izlash"],
        ["📢 Xabar yuborish", "💰 Balansni boshqarish"],
        ["🔙 Orqaga"]
    ]
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True)


def admin_user_actions_keyboard(telegram_id):
    """Foydalanuvchi ustida amallar uchun klaviatura"""
    keyboard = [
        [InlineKeyboardButton("➕ Balans qo'shish", callback_data=f"adm_add_bal_{telegram_id}")],
        [InlineKeyboardButton("➖ Balans ayirish", callback_data=f"adm_sub_bal_{telegram_id}")],
        [InlineKeyboardButton("👔 Rolni o'zgartirish", callback_data=f"adm_change_role_{telegram_id}")],
        [InlineKeyboardButton("❌ Yopish", callback_data="adm_close")]
    ]
    return InlineKeyboardMarkup(keyboard)


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


def receipt_verify_keyboard(receipt_id):
    """Admin uchun chekni tasdiqlash klaviaturasi"""
    keyboard = [
        [
            InlineKeyboardButton("✅ Qabul qilish", callback_data=f"rec_accept_{receipt_id}"),
            InlineKeyboardButton("❌ Rad etish", callback_data=f"rec_reject_{receipt_id}")
        ]
    ]
    return InlineKeyboardMarkup(keyboard)
