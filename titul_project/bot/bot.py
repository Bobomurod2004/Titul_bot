"""
Telegram Bot - Asosiy fayl
"""
import os
import logging
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    filters,
    ContextTypes
)

# Load local .env
load_dotenv()

# Logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Import handlers
from handlers import (
    start_handler,
    create_test_handler,
    submit_test_handler,
    my_tests_handler,
    profile_handler,
    balance_handler,
    payment_handler,
    help_handler,
    button_handler,
    text_handler
)
from admin_handlers import (
    admin_panel_handler,
    admin_stats_handler,
    admin_back_handler,
    admin_broadcast_handler,
    admin_user_search_handler,
    handle_admin_text,
    admin_callback_handler
)


def main():
    """Bot ishga tushirish"""
    # Bot token
    token = os.getenv('TELEGRAM_BOT_TOKEN')
    if not token:
        logger.error("TELEGRAM_BOT_TOKEN topilmadi!")
        return
    
    # Application yaratish
    application = Application.builder().token(token).build()
    
    # Handlers ro'yxatdan o'tkazish
    application.add_handler(CommandHandler("start", start_handler))
    application.add_handler(MessageHandler(filters.Regex("^🧪 Test yaratish$"), create_test_handler))
    application.add_handler(MessageHandler(filters.Regex("^📚 Javob yuborish$"), submit_test_handler))
    application.add_handler(MessageHandler(filters.Regex("^📊 Testlarim$"), my_tests_handler))
    application.add_handler(MessageHandler(filters.Regex("^📝 Ma'lumotlarim$"), profile_handler))
    application.add_handler(MessageHandler(filters.Regex("^💰 Mening hisobim$"), balance_handler))
    application.add_handler(MessageHandler(filters.Regex("^💳 To'lov qilish$"), payment_handler))
    application.add_handler(MessageHandler(filters.Regex("^ℹ️ Foydalanish yo'riqnomasi$"), help_handler))
    
    # Admin handlers
    application.add_handler(MessageHandler(filters.Regex("^🔐 Admin Panel$"), admin_panel_handler))
    application.add_handler(MessageHandler(filters.Regex("^📊 Tizim statistikasi$"), admin_stats_handler))
    application.add_handler(MessageHandler(filters.Regex("^👥 Foydalanuvchilarni izlash$"), admin_user_search_handler))
    application.add_handler(MessageHandler(filters.Regex("^📢 Xabar yuborish$"), admin_broadcast_handler))
    application.add_handler(MessageHandler(filters.Regex("^🔙 Orqaga$"), admin_back_handler))
    
    # Admin text handler should be before general text_handler
    application.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), handle_admin_text))
    
    # Callback query handler
    from handlers import check_subscription_callback
    application.add_handler(CallbackQueryHandler(admin_callback_handler, pattern='^adm_|^set_role_|^rec_'))
    application.add_handler(CallbackQueryHandler(check_subscription_callback, pattern='^check_subscription$'))
    application.add_handler(CallbackQueryHandler(button_handler))
    
    # Text message handler (general)
    from handlers import handle_receipt_photo, handle_receipt_document
    application.add_handler(MessageHandler(filters.PHOTO, handle_receipt_photo))
    application.add_handler(MessageHandler(filters.Document.ALL, handle_receipt_document))
    application.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), text_handler))
    
    # Bot ishga tushirish
    logger.info("Bot ishga tushmoqda...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == '__main__':
    main()
