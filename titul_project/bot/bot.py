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
    
    # Callback query handler
    application.add_handler(CallbackQueryHandler(button_handler))
    
    # Text message handler (general)
    application.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), text_handler))
    
    # Bot ishga tushirish
    logger.info("Bot ishga tushmoqda...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == '__main__':
    main()
