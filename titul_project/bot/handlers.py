"""
Telegram Bot Handlers
"""
import os
from telegram import Update
from telegram.ext import ContextTypes
from keyboards import main_keyboard, web_app_keyboard, payment_keyboard, test_actions_keyboard
from api_client import APIClient
from dotenv import load_dotenv
from telegram import InlineKeyboardButton, InlineKeyboardMarkup
from telegram.constants import ChatMemberStatus
from telegram.ext import CallbackQueryHandler
import logging
from functools import wraps

logger = logging.getLogger(__name__)


# Load local .env
load_dotenv()

FRONTEND_URL = os.getenv('NEXT_PUBLIC_SITE_URL', 'http://192.168.1.122:3000')
CHANNEL_ID = os.getenv('CHANNEL_ID', '@titul_test_bot')

async def get_dynamic_channels():
    """Tizim sozlamalaridan barcha majburiy kanallarni olish"""
    channels = []
    try:
        settings = await APIClient.get_system_settings()
        if settings:
            # Faqat manage qilinayotgan ro'yxatni ishlatamiz
            mandatory_list = settings.get('mandatory_channels', [])
            if mandatory_list:
                for ch in mandatory_list:
                    link = ch.get('link')
                    if link:
                        username = link.split('/')[-1]
                        if not username.startswith('@'): username = f"@{username}"
                        channels.append({
                            "name": ch.get('name', "Kanal"), 
                            "username": username, 
                            "link": link
                        })
    except Exception as e:
        logger.error(f"Error fetching dynamic channels: {e}")
    
    # Hech narsa yo'q bo'lsa default (env dan)
    if not channels:
        channels.append({
            "name": "Asosiy Kanal", 
            "username": CHANNEL_ID, 
            "link": f"https://t.me/{CHANNEL_ID.lstrip('@')}"
        })
    
    return channels

async def is_user_subscribed(context, user_id: int) -> bool:
    try:
        channels = await get_dynamic_channels()
        for ch in channels:
            try:
                member = await context.bot.get_chat_member(
                    chat_id=ch['username'],
                    user_id=user_id
                )
                if member.status not in [ChatMemberStatus.MEMBER, ChatMemberStatus.ADMINISTRATOR, ChatMemberStatus.OWNER]:
                    return False
            except Exception as e:
                logger.error(f"Error checking sub for {ch['username']}: {e}")
                # Agar bot kanal admini bo'lmasa yoki kanal topilmasa, bu kanalni o'tkazib yuboramiz (yoki False qaytaramiz)
                # Keling, xatolik bo'lsa False qaytaramiz, chunki obuna tekshiruvi muhim
                return False
        return True
    except Exception as e:
        logger.error(f"Subscription check error for {user_id}: {e}")
        return False

def subscription_required(func):
    """
    Kanalga obunani majburiy qiluvchi decorator
    """
    @wraps(func)
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE, *args, **kwargs):
        user = update.effective_user
        if not user:
            return
            
        # Obunani tekshirish
        if not await is_user_subscribed(context, user.id):
            channels = await get_dynamic_channels()
            message_text = "⚠️ <b>Botdan foydalanish uchun quyidagi kanallarga obuna bo‘lishingiz shart:</b>"
            
            if update.callback_query:
                await update.callback_query.answer("⚠️ Obuna bo'lmagansiz!", show_alert=True)
                await update.callback_query.message.reply_text(message_text, reply_markup=subscribe_keyboard(channels), parse_mode='HTML')
            else:
                await update.message.reply_text(message_text, reply_markup=subscribe_keyboard(channels), parse_mode='HTML')
            return

        return await func(update, context, *args, **kwargs)
    return wrapper

def subscribe_keyboard(channels: list):
    buttons = []
    for ch in channels:
        buttons.append([InlineKeyboardButton(text=f"📢 {ch['name']}", url=ch['link'])])
    
    buttons.append([InlineKeyboardButton(text="✅ Obuna bo‘ldim", callback_data="check_subscription")])
    return InlineKeyboardMarkup(buttons)

async def check_subscription_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    user = query.from_user
    subscribed = await is_user_subscribed(context, user.id)

    if not subscribed:
        channels = await get_dynamic_channels()
        await query.message.reply_text(
            "❌ Siz hali barcha kanallarga obuna bo‘lmadingiz.",
            reply_markup=subscribe_keyboard(channels)
        )
        return

    full_name = user.full_name or f"User {user.id}"
    await APIClient.get_or_create_user(user.id, full_name)

    await query.message.reply_text(
        f"✅ Rahmat, {full_name}!\n\nBotdan foydalanishingiz mumkin 👇 \n\n"
        f"Botdan foydalanishda qaytadan /start ni bosing",
        reply_markup=main_keyboard(),
        parse_mode="HTML"
    )

@subscription_required
async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    /start buyrug'i handler
    """
    user = update.effective_user
    telegram_id = user.id
    full_name = user.full_name or f"User {telegram_id}"
    
    # Obuna tekshirish (Endi dekorator orqali amalga oshiriladi)
    
    # Foydalanuvchini yaratish yoki olish
    api_user = await APIClient.get_or_create_user(telegram_id, full_name)
    is_admin = api_user and api_user.get('role') in ['admin', 'superadmin']
    
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
        reply_markup=main_keyboard(is_admin=is_admin),
        parse_mode='HTML'
    )


@subscription_required
async def create_test_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Test yaratish handler
    """
    user = update.effective_user
    telegram_id = user.id
    full_name = user.full_name or ""
    
    # Foydalanuvchi ma'lumotlarini olish
    api_user = await APIClient.get_user(telegram_id)
    remaining_free = api_user.get('remaining_free_tests', 0) if api_user else 0
    
    # Web app URL
    web_url = f"{FRONTEND_URL}/create_start/{telegram_id}?name={full_name}"
    
    message = f"""
🧪 <b>Test yaratish</b>

Quyidagi tugmani bosing va web sahifada testingizni yarating.

📝 Siz uchun yana <b>{remaining_free} ta bepul</b> test mavjud.
"""
    
    await update.message.reply_text(
        message,
        reply_markup=web_app_keyboard(web_url, "🌐 Test yaratish sahifasi"),
        parse_mode='HTML'
    )


@subscription_required
async def submit_test_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Javob yuborish handler
    """
    web_url = f"{FRONTEND_URL}/submit/{update.effective_user.id}"
    
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


@subscription_required
async def my_tests_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Testlarim handler
    """
    user = update.effective_user
    telegram_id = user.id
    
    # Foydalanuvchi testlarini olish
    tests = await APIClient.get_user_tests(telegram_id)
    
    if not tests:
        await update.message.reply_text(
            "❌ Sizda hozircha testlar yo'q.\n\n"
            "Test yaratish uchun '🧪 Test yaratish' tugmasini bosing."
        )
        return
    
    # Web app URL
    web_url = f"{FRONTEND_URL}/my_tests/{telegram_id}"
    
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


@subscription_required
async def profile_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Ma'lumotlarim handler
    """
    user = update.effective_user
    telegram_id = user.id
    
    # Foydalanuvchi ma'lumotlarini olish
    api_user = await APIClient.get_user(telegram_id)
    
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


@subscription_required
async def balance_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Mening hisobim handler
    """
    user = update.effective_user
    telegram_id = user.id
    
    # Foydalanuvchi va to'lovlar ma'lumotlarini olish
    api_user = await APIClient.get_user(telegram_id)
    payments = await APIClient.get_user_payments(telegram_id)
    
    if not api_user:
        await update.message.reply_text("❌ Ma'lumotlar topilmadi.")
        return
    
    balance = api_user.get('balance', 0)
    free_tests_used = api_user.get('free_tests_used', 0)
    remaining_free = api_user.get('remaining_free_tests', 0)
    
    # 'completed' (online) va 'accepted' (manual) to'lovlarni filtrlaymiz
    # Backend endi bularni yagona listda qaytarmoqda
    completed_payments = [p for p in payments if p.get('status') in ['completed', 'accepted']]
    total_paid = sum(float(p.get('amount', 0)) for p in completed_payments)
    
    message = f"""
💰 <b>Mening hisobim</b>

💵 Joriy balans: <b>{float(balance):,.0f} so'm</b>
📊 Jami to'lovlar: <b>{len(completed_payments)} ta</b>
💳 Jami to'langan: <b>{total_paid:,.0f} so'm</b>

🎁 <b>Siz uchun imkoniyatlar:</b>
✅ Bepul testlar: <b>{remaining_free} ta qoldi</b>
ℹ️ <i>Dastlabki 5 ta testni mutlaqo bepul yaratishingiz mumkin.</i>

📋 <b>Oxirgi to'lovlar:</b>
"""
    
    if completed_payments:
        for payment in completed_payments[:5]:
            amount = payment.get('amount', 0)
            status = "✅" if payment.get('status') in ['completed', 'accepted'] else "⏳"
            method = payment.get('payment_method', 'N/A')
            date = payment.get('timestamp', 'N/A')[:10]
            message += f"\n{status} {float(amount):,.0f} so'm ({method}) - {date}"
    else:
        message += "\n<i>Hozircha to'lovlar mavjud emas.</i>"

    message += """

📖 <b>Tizim qanday ishlaydi?</b>
1️⃣ <b>Bepul limit:</b> Har bir foydalanuvchiga dastlabki 5 ta test bepul beriladi.
2️⃣ <b>Pullik testlar:</b> Bepul limit tugagach, har bir <u>savol</u> uchun to'lov amalga oshiriladi.
3️⃣ <b>Xisobdan yechish:</b> Mablag' faqat test <u>muvaffaqiyatli</u> yaratilgandagina balansingizdan chegirib tashlanadi.
4️⃣ <b>Balansni to'ldirish:</b> Plastik karta orqali yoki chek yuborish orqali hisobingizni istalgan vaqtda to'ldirishingiz mumkin.
"""
    
    await update.message.reply_text(message, parse_mode='HTML')


@subscription_required
async def payment_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    To'lov qilish handler (Manual Receipt)
    """
    settings = await APIClient.get_system_settings()
    if not settings:
        return await update.message.reply_text("❌ Tizim sozlamalari topilmadi. Keyinroq urinib ko'ring.")
    
    card_number = settings.get('card_number', '0000 0000 0000 0000')
    price = settings.get('price_per_question', 100)
    instruction = settings.get('payment_instruction', "To'lovni amalga oshiring va chekni yuboring.")

    message = f"""
💳 <b>To'lov qilish</b>

Tizimda testlar yaratish uchun balansingizni to'ldirishingiz kerak.
1 ta savol narxi: <b>{price} so'm</b>

💰 <b>To'lov ma'lumotlari:</b>
Karta: <code>{card_number}</code>
Izoh: <b>{instruction}</b>

📸 To'lovni amalga oshirgach, <b>chek rasmini</b> (skrinshot) shu yerga yuboring.
"""
    
    context.user_data['waiting_for_receipt'] = True
    await update.message.reply_text(
        message,
        parse_mode='HTML'
    )

async def handle_receipt_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Foydalanuvchi yuborgan chek rasmini qabul qilish"""
    if not context.user_data.get('waiting_for_receipt'):
        return
    
    user = update.effective_user
    photo = update.message.photo[-1] # Eng katta rasm
    
    file = await context.bot.get_file(photo.file_id)
    image_bytes = await file.download_as_bytearray()
    
    # Backendga yuklash
    result = await APIClient.upload_payment_receipt(user.id, bytes(image_bytes))
    
    if result and result.get('success'):
        context.user_data['waiting_for_receipt'] = False
        receipt_id = result.get('receipt_id')
        
        await update.message.reply_text(
            "✅ Chek qabul qilindi! Adminlar uni ko'rib chiqib, 15-30 daqiqa ichida balansingizni to'ldirishadi.\n"
            "Sizga xabar yuboramiz."
        )

        # Adminlarni xabardor qilish
        from keyboards import receipt_verify_keyboard
        admins = await APIClient.get_admins()
        admin_msg = f"""
🆕 <b>Yangi to'lov cheki!</b>

👤 Foydalanuvchi: <b>{user.full_name}</b> (ID: {user.id})
🆔 Chek ID: <b>{receipt_id}</b>

Iltimos, chekni tekshiring va tasdiqlang.
"""
        for admin in admins:
            try:
                await context.bot.send_photo(
                    chat_id=admin['telegram_id'],
                    photo=photo.file_id,
                    caption=admin_msg,
                    reply_markup=receipt_verify_keyboard(receipt_id),
                    parse_mode='HTML'
                )
            except Exception as e:
                logger.error(f"Admin notification error: {e}")
    else:
        await update.message.reply_text("❌ Chekni yuklashda xatolik yuz berdi. Qaytadan urinib ko'ring.")


async def handle_receipt_document(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Foydalanuvchi yuborgan chek faylini qabul qilish"""
    if not context.user_data.get('waiting_for_receipt'):
        return
    
    user = update.effective_user
    doc = update.message.document
    
    # Faqat rasm yoki PDF fayllarni qabul qilish
    if not (doc.mime_type.startswith('image/') or doc.mime_type == 'application/pdf'):
        await update.message.reply_text("❌ Iltimos, faqat rasm yoki PDF formatidagi chekni yuboring.")
        return

    file = await context.bot.get_file(doc.file_id)
    image_bytes = await file.download_as_bytearray()
    
    # Backendga yuklash
    result = await APIClient.upload_payment_receipt(user.id, bytes(image_bytes))
    
    if result and result.get('success'):
        context.user_data['waiting_for_receipt'] = False
        receipt_id = result.get('receipt_id')
        
        await update.message.reply_text(
            "✅ Chek fayl ko'rinishida qabul qilindi! Adminlar ko'rib chiqishmoqda.\n"
            "Sizga xabar yuboramiz."
        )

        # Adminlarni xabardor qilish
        from keyboards import receipt_verify_keyboard
        admins = await APIClient.get_admins()
        admin_msg = f"""
        📄 <b>Yangi to'lov cheki (Fayl)!</b>

        👤 Foydalanuvchi: <b>{user.full_name}</b> (ID: {user.id})
        🆔 Chek ID: <b>{receipt_id}</b>
        📄 Fayl: <b>{doc.file_name}</b>

        Iltimos, chekni tekshiring va tasdiqlang.
        """
        for admin in admins:
            try:
                await context.bot.send_document(
                    chat_id=admin['telegram_id'],
                    document=doc.file_id,
                    caption=admin_msg,
                    reply_markup=receipt_verify_keyboard(receipt_id),
                    parse_mode='HTML'
                )
            except Exception as e:
                logger.error(f"Admin notification error (Doc): {e}")
    else:
        await update.message.reply_text("❌ Chekni yuklashda xatolik yuz berdi.")


@subscription_required
async def help_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Foydalanish yo'riqnomasi handler
    """
    settings = await APIClient.get_system_settings()
    support_link = settings.get('support_link')
    
    message = f"""
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

❓ Qo'shimcha savollar uchun: {support_link}
"""
    
    await update.message.reply_text(message, parse_mode='HTML')


@subscription_required
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
        success = await APIClient.finish_test(test_id)
        if success:
            await query.edit_message_text("✅ Test yakunlandi!")
        else:
            await query.edit_message_text("❌ Xatolik yuz berdi.")
    
    elif data.startswith('download_'):
        test_id = data.replace('download_', '')
        await query.edit_message_text("📥 PDF tayyorlanmoqda...")
        
        pdf_content = await APIClient.download_test_report(test_id)
        if pdf_content:
            await query.message.reply_document(
                document=pdf_content,
                filename=f"natijalar_{test_id}.pdf",
                caption="✅ Test natijalari PDF"
            )
        else:
            await query.edit_message_text("❌ PDF yaratishda xatolik.")


@subscription_required
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
        test = await APIClient.get_test_by_code(code)
        
        if test:
            user_data['waiting_for_code'] = False
            telegram_id = update.effective_user.id
            
            # Web app URL
            web_url = f"{FRONTEND_URL}/submit/{test['id']}/{telegram_id}"
            
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
