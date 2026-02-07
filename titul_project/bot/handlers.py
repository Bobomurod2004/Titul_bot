"""
Telegram Bot Handlers
"""
import os
from telegram import Update
from telegram.ext import ContextTypes
from keyboards import main_keyboard, web_app_keyboard, payment_keyboard, test_actions_keyboard
from api_client import APIClient
from dotenv import load_dotenv

from pathlib import Path

# Load project root .env
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(env_path)

FRONTEND_URL = os.getenv('NEXT_PUBLIC_SITE_URL', 'http://192.168.1.122:3000')


async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    /start buyrug'i handler
    """
    user = update.effective_user
    telegram_id = user.id
    full_name = user.full_name or f"User {telegram_id}"
    
    # Foydalanuvchini yaratish yoki olish
    api_user = APIClient.get_or_create_user(telegram_id, full_name)
    
    welcome_message = f"""
🎓 <b>Assalomu alaykum, {full_name}!</b>

Titul Test Bot ga xush kelibsiz! 

Bu bot orqali siz:
✅ DTM uslubida testlar yaratishingiz
✅ Talabalar javoblarini qabul qilishingiz
✅ Natijalarni PDF formatida olishingiz mumkin

Quyidagi tugmalardan birini tanlang 👇
"""
    
    await update.message.reply_text(
        welcome_message,
        reply_markup=main_keyboard(),
        parse_mode='HTML'
    )


async def create_test_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Test yaratish handler
    """
    user = update.effective_user
    telegram_id = user.id
    full_name = user.full_name or ""
    
    # Web app URL
    web_url = f"{FRONTEND_URL}/create_start?id={telegram_id}&name={full_name}"
    
    message = f"""
🧪 <b>Test yaratish</b>

Quyidagi tugmani bosing va web sahifada testingizni yarating.

📝 Siz uchun yana <b>1 ta bepul</b> test mavjud.
"""
    
    await update.message.reply_text(
        message,
        reply_markup=web_app_keyboard(web_url, "🌐 Test yaratish sahifasi"),
        parse_mode='HTML'
    )


async def submit_test_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Javob yuborish handler
    """
    web_url = f"{FRONTEND_URL}/submit"
    
    message = """
📚 <b>Test topshirish</b>

Test topshirish uchun o'qituvchidan olgan <b>access code</b> ni yuboring.

Masalan: <code>AB12CD34</code>

Yoki quyidagi tugma orqali web sahifaga o'ting 👇
"""
    
    await update.message.reply_text(
        message, 
        reply_markup=web_app_keyboard(web_url, "✍️ Web orqali topshirish"),
        parse_mode='HTML'
    )
    
    # Keyingi xabarni kutish uchun state o'rnatish
    context.user_data['waiting_for_code'] = True


async def my_tests_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Testlarim handler
    """
    user = update.effective_user
    telegram_id = user.id
    
    # Foydalanuvchi testlarini olish
    tests = APIClient.get_user_tests(telegram_id)
    
    if not tests:
        await update.message.reply_text(
            "❌ Sizda hozircha testlar yo'q.\n\n"
            "Test yaratish uchun '🧪 Test yaratish' tugmasini bosing."
        )
        return
    
    # Web app URL
    web_url = f"{FRONTEND_URL}/my_tests?id={telegram_id}"
    
    message = f"""
📊 <b>Mening testlarim</b>

Jami testlar: <b>{len(tests)}</b>
Faol: <b>{sum(1 for t in tests if t.get('is_active'))}</b>
Yakunlangan: <b>{sum(1 for t in tests if not t.get('is_active'))}</b>

Batafsil ko'rish uchun quyidagi tugmani bosing 👇
"""
    
    await update.message.reply_text(
        message,
        reply_markup=web_app_keyboard(web_url, "🌐 Testlarimni ko'rish"),
        parse_mode='HTML'
    )


async def profile_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Ma'lumotlarim handler
    """
    user = update.effective_user
    telegram_id = user.id
    
    # Foydalanuvchi ma'lumotlarini olish
    api_user = APIClient.get_user(telegram_id)
    
    if not api_user:
        await update.message.reply_text("❌ Ma'lumotlar topilmadi.")
        return
    
    message = f"""
📝 <b>Mening ma'lumotlarim</b>

👤 Ism: <b>{api_user.get('full_name', 'N/A')}</b>
🆔 Telegram ID: <code>{telegram_id}</code>
👔 Rol: <b>{api_user.get('role', 'N/A').title()}</b>
💰 Balans: <b>{api_user.get('balance', 0)} so'm</b>
📅 Ro'yxatdan o'tgan: <b>{api_user.get('created_at', 'N/A')[:10]}</b>
"""
    
    await update.message.reply_text(message, parse_mode='HTML')


async def balance_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Mening hisobim handler
    """
    user = update.effective_user
    telegram_id = user.id
    
    # Foydalanuvchi va to'lovlar ma'lumotlarini olish
    api_user = APIClient.get_user(telegram_id)
    payments = APIClient.get_user_payments(telegram_id)
    
    if not api_user:
        await update.message.reply_text("❌ Ma'lumotlar topilmadi.")
        return
    
    balance = api_user.get('balance', 0)
    completed_payments = [p for p in payments if p.get('status') == 'completed']
    total_paid = sum(p.get('amount', 0) for p in completed_payments)
    
    message = f"""
💰 <b>Mening hisobim</b>

💵 Joriy balans: <b>{balance} so'm</b>
📊 Jami to'lovlar: <b>{len(completed_payments)}</b>
💳 Jami to'langan: <b>{total_paid} so'm</b>

📋 <b>Oxirgi to'lovlar:</b>
"""
    
    if completed_payments:
        for payment in completed_payments[:5]:
            amount = payment.get('amount', 0)
            method = payment.get('payment_method', 'N/A').title()
            date = payment.get('created_at', 'N/A')[:10]
            message += f"\n• {amount} so'm ({method}) - {date}"
    else:
        message += "\nHozircha to'lovlar yo'q."
    
    await update.message.reply_text(message, parse_mode='HTML')


async def payment_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    To'lov qilish handler
    """
    message = """
💳 <b>To'lov qilish</b>

To'lov usulini tanlang:
"""
    
    await update.message.reply_text(
        message,
        reply_markup=payment_keyboard(),
        parse_mode='HTML'
    )


async def help_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Foydalanish yo'riqnomasi handler
    """
    message = """
ℹ️ <b>Foydalanish yo'riqnomasi</b>

<b>1. Test yaratish:</b>
   • "🧪 Test yaratish" tugmasini bosing
   • Web sahifada test ma'lumotlarini kiriting
   • Savollar va javoblarni belgilang
   • Testni tasdiqlang

<b>2. Test topshirish:</b>
   • "📚 Javob yuborish" tugmasini bosing
   • O'qituvchidan olgan access code ni yuboring
   • Web sahifada javoblarni belgilang
   • Yuborish tugmasini bosing

<b>3. Natijalarni ko'rish:</b>
   • "📊 Testlarim" tugmasini bosing
   • Kerakli testni tanlang
   • Natijalarni ko'ring yoki PDF yuklab oling

<b>4. To'lov qilish:</b>
   • "💳 To'lov qilish" tugmasini bosing
   • To'lov usulini tanlang
   • Ko'rsatmalarga amal qiling

❓ Qo'shimcha savollar uchun: @support
"""
    
    await update.message.reply_text(message, parse_mode='HTML')


async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Callback query (inline tugmalar) handler
    """
    query = update.callback_query
    await query.answer()
    
    data = query.data
    
    # To'lov tugmalari
    if data.startswith('payment_'):
        if data == 'payment_cancel':
            await query.edit_message_text("❌ To'lov bekor qilindi.")
        else:
            payment_method = data.replace('payment_', '')
            await query.edit_message_text(
                f"💳 {payment_method.title()} orqali to'lov qilish tez orada qo'shiladi!"
            )
    
    # Test harakatlari
    elif data.startswith('finish_'):
        test_id = data.replace('finish_', '')
        success = APIClient.finish_test(test_id)
        if success:
            await query.edit_message_text("✅ Test yakunlandi!")
        else:
            await query.edit_message_text("❌ Xatolik yuz berdi.")
    
    elif data.startswith('download_'):
        test_id = data.replace('download_', '')
        await query.edit_message_text("📥 PDF tayyorlanmoqda...")
        
        pdf_content = APIClient.download_test_report(test_id)
        if pdf_content:
            await query.message.reply_document(
                document=pdf_content,
                filename=f"natijalar_{test_id}.pdf",
                caption="✅ Test natijalari PDF"
            )
        else:
            await query.edit_message_text("❌ PDF yaratishda xatolik.")


async def text_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Matnli xabarlar handler (access code va boshqalar)
    """
    text = update.message.text
    user_data = context.user_data
    
    # Agar access code kutilayotgan bo'lsa
    if user_data.get('waiting_for_code'):
        code = text.strip().upper()
        
        # API dan testni tekshirish
        test = APIClient.get_test_by_code(code)
        
        if test:
            user_data['waiting_for_code'] = False
            telegram_id = update.effective_user.id
            
            # Web app URL
            web_url = f"{FRONTEND_URL}/submit/{test['id']}?id={telegram_id}"
            
            message = f"""
✅ <b>Test topildi!</b>

📝 Test nomi: <b>{test.get('title')}</b>
📚 Fan: <b>{test.get('subject')}</b>
👨‍🏫 O'qituvchi: <b>{test.get('creator_name')}</b>

Testni topshirish uchun quyidagi tugmani bosing 👇
"""
            await update.message.reply_text(
                message,
                reply_markup=web_app_keyboard(web_url, "✍️ Testni boshlash"),
                parse_mode='HTML'
            )
        else:
            await update.message.reply_text(
                "❌ Bunday access code dagi test topilmadi.\n"
                "Iltimos, kodni tekshirib qaytadan yuboring yoki '❌ Bekor qilish' deb yozing."
            )
        return

    # Bekor qilish
    if text.lower() == 'bekor qilish' or text.lower() == '❌ bekor qilish':
        user_data['waiting_for_code'] = False
        await update.message.reply_text("Bekor qilindi.", reply_markup=main_keyboard())
        return

    # Default javob
    await update.message.reply_text(
        "Tushunmadim. Iltimos, menyudan foydalaning.",
        reply_markup=main_keyboard()
    )
