import logging
from django.utils import timezone
from .utils import generate_pdf_report
from .notifications import send_telegram_document

logger = logging.getLogger(__name__)

def send_test_completion_report(test):
    """
    Test yakunlanganda hisobot tayyorlash va Telegramga yuborish
    """
    try:
        submissions = test.submissions.all().order_by('-score')
        pdf_buffer = generate_pdf_report(test, submissions)
        filename = f"natijalar_{test.access_code}.pdf"
        
        summary_msg = f"""
🏁 <b>Test yakunlandi!</b>

📝 Test: <b>{test.title}</b>
📚 Fan: <b>{test.subject}</b>
🔢 Kod: <b>{test.access_code}</b>

📊 <b>Umumiy statistika:</b>
👥 Ishtirokchilar: <b>{submissions.count()} ta</b>
📈 O'rtacha ball: <b>{test.average_score} ta to'g'ri</b>
🏆 Eng yuqori ball: <b>{test.max_score} ta to'g'ri</b>

Batafsil natijalar va to'g'ri javoblar (kalit) ilova qilingan PDF faylda keltirilgan.
"""
        # PDF faylni yuborish
        success = send_telegram_document(
            chat_id=test.creator.telegram_id,
            document=pdf_buffer.getvalue(),
            filename=filename,
            caption=summary_msg
        )
        if success:
            logger.info(f"Test {test.access_code} uchun hisobot yuborildi.")
        else:
            logger.error(f"Test {test.access_code} uchun hisobot yuborishda xatolik yuz berdi.")
        return success
    except Exception as e:
        logger.error(f"Error sending final report for test {test.access_code}: {e}")
        return False
